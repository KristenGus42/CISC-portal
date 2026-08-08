// Datalist input: https://github.com/andrelandgraf/react-datalist-input/tree/main?tab=readme-ov-file
import { NavBar } from "./NavBar";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { getDatabase, ref, onValue, set, update } from "firebase/database";
import { DndContext, useDroppable, useDraggable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import CasePreview from "./CasePreview";

import DatalistInput from 'react-datalist-input';
import 'react-datalist-input/dist/styles.css';
import { calculateMatchScore } from "./matcher";

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Remembers which schedule date the admin was last viewing, so leaving the
// page (a different tab/route, or a browser refresh) and coming back lands
// them where they left off instead of always resetting to today.
const LAST_VIEWED_DATE_KEY = "schedule:lastViewedDate";

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parses a "YYYY-MM-DD" key back into a local-midnight Date (avoids the
// UTC-parsing footgun of `new Date("YYYY-MM-DD")`).
function fromYMD(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getOrdinalSuffix(day) {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

// "Tuesday, February 7th"
function formatClinicDate(date) {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();
  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}`;
}

// Cells for a month grid: null for the leading blanks before the 1st, then
// one Date per day of the month.
function getMonthGridCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAttorneys = [
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
];

const mockTimeSlots = ["5:30pm", "6:30pm", "7:30pm"];

// Splits a stored time string like "5:30pm" into its editable pieces.
// Storage format never changes ("<digits><am|pm>", no space, lowercase) —
// this is only for feeding the split textbox + AM/PM dropdown UI.
function parseTimeString(t) {
  const match = /^(\d{1,2}:\d{2})\s*(am|pm)$/i.exec((t ?? "").trim());
  if (match) {
    return { digits: match[1], period: match[2].toLowerCase() };
  }
  const trimmed = (t ?? "").trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith("am") || lower.endsWith("pm")) {
    return { digits: trimmed.slice(0, -2).trim(), period: lower.slice(-2) };
  }
  return { digits: trimmed, period: "pm" };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [waitlistCases, setWaitlistCases] = useState([]);
  const [allCases, setAllCases] = useState({});
  // Local-only assignments, cleared on date change, saved to Firebase on "Save"
  const [assignments, setAssignments] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const db = getDatabase();

  // Date navigation — each schedule is a single clinic date, keyed by YMD.
  // Restore wherever the admin last left off, if we remember it; otherwise
  // fall back to today until the "nearest upcoming schedule" effect below
  // can pick a better default once schedule dates have loaded.
  const hadStoredDateRef = useRef(typeof window !== "undefined" && !!localStorage.getItem(LAST_VIEWED_DATE_KEY));
  const appliedSmartDefaultRef = useRef(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_VIEWED_DATE_KEY) : null;
    if (stored) return fromYMD(stored);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dateKey = toYMD(currentDate);

  // Remember the currently-viewed date for next time the page is opened.
  useEffect(() => {
    localStorage.setItem(LAST_VIEWED_DATE_KEY, dateKey);
  }, [dateKey]);

  // All dates that already have a saved schedule (for arrow graying, "+"
  // calendar disabling, and prev/next stepping between existing schedules).
  const [scheduleDates, setScheduleDates] = useState([]);
  // Distinguishes "we don't know yet" from "confirmed empty" — scheduleDates
  // starts as [] before Firebase responds, same shape as the genuine empty
  // state, so without this the big "No Schedule" calendar takes over for a
  // moment on every load/refresh even when schedules exist.
  const [scheduleDatesLoaded, setScheduleDatesLoaded] = useState(false);
  // Nothing scheduled anywhere yet, and not in the middle of building one —
  // "today" (the default currentDate) isn't a meaningful schedule to show,
  // and there's nothing to render attorney columns for either.
  const hasNoSchedules = scheduleDatesLoaded && scheduleDates.length === 0 && !isEditMode;
  const clinicLabel = hasNoSchedules ? "No Schedule" : formatClinicDate(currentDate);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [isDeleteScheduleOpen, setIsDeleteScheduleOpen] = useState(false);
  const [isJumpCalendarOpen, setIsJumpCalendarOpen] = useState(false);
  const [isChangeDateOpen, setIsChangeDateOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  // Pop ups: 
  const [isMeetingLinkOpen, setIsMeetingLinkOpen] = useState(false);
  const [contactCaseId, setContactCaseId] = useState(null);

  // Personnel
  const [allAttorneysArr, setAllAttorneysArr] = useState([]);
  const [allLegalStudentsArr, setAllLegalStudentsArr] = useState([]);

  // Column attorney selections (local, saved on Save)
  const [columnAttorneys, setColumnAttorneys] = useState({});
  // Last-saved slots for the current date, used to detect case removals on Save
  const savedAssignmentsRef = useRef({});

  // Per-date unsaved edits made during this edit-mode session, so hopping
  // between dates via prev/next/jump doesn't discard in-progress work.
  // Keyed by dateKey → { assignments, columnAttorneys, savedSlots }.
  // Cleared per-date once that date is actually pushed to Firebase.
  const draftsRef = useRef({});

  // Snapshot the currently-displayed date's in-progress state into drafts
  // before navigating away from it. No-op outside edit mode — nothing
  // unsaved to lose when just browsing.
  function stashCurrentDraft() {
    if (!isEditMode) return;
    draftsRef.current[dateKey] = {
      assignments,
      columnAttorneys,
      savedSlots: savedAssignmentsRef.current,
    };
  }

  // Restore a date's draft if we stashed one earlier this session. When there
  // isn't one, this is a no-op and the Firebase loader effect below populates
  // it fresh, same as always.
  function restoreDraftFor(targetDateKey) {
    const draft = draftsRef.current[targetDateKey];
    if (!draft) return;
    setAssignments(draft.assignments);
    setColumnAttorneys(draft.columnAttorneys);
    savedAssignmentsRef.current = draft.savedSlots;
  }

  // ── Close the "more actions" menu when clicking outside of it ────────────
  const actionsMenuRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setIsActionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Load attorneys ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "attorneys"), (snapshot) => {
      const obj = snapshot.val();
      if (!obj) { setAllAttorneysArr([]); return; }
      setAllAttorneysArr(Object.keys(obj).map((key) => ({ ...obj[key], id: key })));
    });
    return () => unsubscribe();
  }, [db]);

  // ── Load legal students ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "legalStudents"), (snapshot) => {
      const obj = snapshot.val();
      if (!obj) { setAllLegalStudentsArr([]); return; }
      setAllLegalStudentsArr(Object.keys(obj).map((key) => ({ ...obj[key], id: key })));
    });
    return () => unsubscribe();
  }, [db]);

  // ── Load waitlisted cases ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "cases"), (snapshot) => {
      const obj = snapshot.val() || {};
      setAllCases(obj);
      const allCasesArr = Object.keys(obj).map((key) => ({ ...obj[key], id: key }));
      setWaitlistCases(allCasesArr.filter((c) => c.status === "waitlisted"));
    });
    return () => unsubscribe();
  }, [db]);

  // ── Load the set of dates that already have a saved schedule ─────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, "schedules"), (snapshot) => {
      const obj = snapshot.val();
      setScheduleDates(obj ? Object.keys(obj).sort() : []);
      setScheduleDatesLoaded(true);
    });
    return () => unsubscribe();
  }, [db]);

  // ── First-ever visit (nothing remembered in localStorage): once schedule
  // dates have loaded, jump to the nearest upcoming one instead of sitting
  // on "today", which may not have anything scheduled on it. Runs at most
  // once per mount — if the admin has already navigated elsewhere by the
  // time this fires, it backs off rather than yanking them back.
  useEffect(() => {
    if (appliedSmartDefaultRef.current) return;
    if (hadStoredDateRef.current) { appliedSmartDefaultRef.current = true; return; }
    if (scheduleDates.length === 0) return; // still loading (or genuinely empty — nothing to jump to either way)

    appliedSmartDefaultRef.current = true;
    const todayKey = toYMD(new Date());
    const upcoming = scheduleDates.filter((d) => d >= todayKey);
    const target = upcoming.length > 0
      ? upcoming[0] // nearest in the future (scheduleDates is sorted ascending)
      : scheduleDates[scheduleDates.length - 1]; // otherwise nearest in the past
    setCurrentDate(fromYMD(target));
  }, [scheduleDates]);

  // ── Load saved schedule for the current date ──────────────────────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, `schedules/${dateKey}`), (snapshot) => {
      // Unsaved local edits already exist for this date (built up earlier in
      // this edit session, restored when navigating back to it) — keep them;
      // don't let Firebase's echo of the last save clobber in-progress work.
      if (draftsRef.current[dateKey]) return;

      const dayData = snapshot.val();
      if (!dayData) {
        setAssignments({});
        setColumnAttorneys({});
        savedAssignmentsRef.current = {};
        return;
      }
      const slots = dayData.slots ?? {};
      setAssignments(slots);
      savedAssignmentsRef.current = slots;

      // Derive column attorneys from slot data (use first slot in each column that has one)
      const cols = {};
      for (const [key, slot] of Object.entries(slots)) {
        const colIdx = key.split("-")[0];
        const colKey = `col${colIdx}`;
        if (!cols[colKey] && slot?.attorney) {
          cols[colKey] = slot.attorney;
        }
      }
      setColumnAttorneys(cols);
    });
    return () => unsubscribe();
  }, [db, dateKey]);

  // ── Prev/next navigation: steps between existing schedules only ──────────
  const priorScheduleDates = scheduleDates.filter((d) => d < dateKey);
  const laterScheduleDates = scheduleDates.filter((d) => d > dateKey);
  const hasPrevSchedule = priorScheduleDates.length > 0;
  const hasNextSchedule = laterScheduleDates.length > 0;

  function goToPrevSchedule() {
    if (priorScheduleDates.length === 0) return;
    const target = priorScheduleDates[priorScheduleDates.length - 1];
    stashCurrentDraft();
    setCurrentDate(fromYMD(target));
    restoreDraftFor(target);
  }
  function goToNextSchedule() {
    if (laterScheduleDates.length === 0) return;
    const target = laterScheduleDates[0];
    stashCurrentDraft();
    setCurrentDate(fromYMD(target));
    restoreDraftFor(target);
  }

  // ── Jump to schedule: pick any existing schedule date from the calendar ──
  function handleJumpToSchedule(dateStr) {
    stashCurrentDraft();
    setCurrentDate(fromYMD(dateStr));
    restoreDraftFor(dateStr);
    setIsJumpCalendarOpen(false);
  }

  // ── Add schedule: create it in Firebase immediately (empty), then open it
  // for editing. Persisting right away — instead of only holding it in local
  // state until Save — means an accidental prev/next/jump click can't quietly
  // discard the new schedule; it's already real and will reload correctly.
  async function handleAddSchedule(dateStr) {
    stashCurrentDraft();
    delete draftsRef.current[dateStr]; // starting fresh even if this date had a stale draft
    setCurrentDate(fromYMD(dateStr));
    setAssignments({});
    setColumnAttorneys({});
    savedAssignmentsRef.current = {};
    setIsEditMode(true);
    setIsAddScheduleOpen(false);

    try {
      await set(ref(db, `schedules/${dateStr}`), {
        slots: {},
        dateKey: dateStr,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to create schedule:", err);
    }
  }

  // ── Delete schedule: remove this date's saved schedule + unwind its cases ─
  async function handleDeleteSchedule() {
    // Unwind based on what's actually SAVED for this date (savedAssignmentsRef),
    // not the in-progress local edits — those never hit Firebase in the first place.
    const savedSlots = savedAssignmentsRef.current;
    const caseUpdates = {};

    for (const slot of Object.values(savedSlots)) {
      const caseId = slot?.client?.caseId;
      if (caseId) {
        caseUpdates[`cases/${caseId}/status`] = "waitlisted";
        caseUpdates[`cases/${caseId}/schedulingInfo/date`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/timeSlot`] = null;
        caseUpdates[`cases/${caseId}/matchInfo/attorney`] = null;
        caseUpdates[`cases/${caseId}/matchInfo/interpreter`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyName`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyEmail`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyPhone`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterName`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterEmail`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterPhone`] = null;
      }
      if (caseId && slot?.attorney?.attorneyId) {
        caseUpdates[`caseAccess/${slot.attorney.attorneyId}/${caseId}`] = null;
      }
      if (caseId && slot?.interpreter?.id) {
        caseUpdates[`caseAccess/${slot.interpreter.id}/${caseId}`] = null;
      }
    }

    // Remove the schedule node itself
    caseUpdates[`schedules/${dateKey}`] = null;

    try {
      await update(ref(db), caseUpdates);
      delete draftsRef.current[dateKey]; // this date's unsaved edits (if any) are moot now

      // Land somewhere real instead of staying parked on the date we just
      // deleted: prefer the nearest earlier schedule, then the nearest
      // later one, else fall back to today. Changing currentDate re-triggers
      // the "load schedule for current date" effect, which is what actually
      // repopulates (or clears) the grid — more reliable than hand-clearing
      // state here and hoping nothing re-hydrates it from a stale render.
      const remainingDates = scheduleDates.filter((d) => d !== dateKey);
      const prior = remainingDates.filter((d) => d < dateKey);
      const later = remainingDates.filter((d) => d > dateKey);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDate =
        prior.length > 0 ? fromYMD(prior[prior.length - 1]) :
        later.length > 0 ? fromYMD(later[0]) :
        today;

      setCurrentDate(nextDate);
      setAssignments({});
      setColumnAttorneys({});
      savedAssignmentsRef.current = {};
      setIsEditMode(false);
      setIsDeleteScheduleOpen(false);
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  }

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Drag end: update local state only ────────────────────────────────────
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (assignments[over.id]?.client) return; // slot occupied
    const caseObj = waitlistCases.find((c) => c.id === active.id);
    if (!caseObj) return;

    const [colIdxStr, slotIdxStr] = over.id.split("-");
    if (!columnAttorneys[`col${colIdxStr}`]) return; // attorney must be assigned first
    const slotIdx = parseInt(slotIdxStr, 10);
    // Preserve a time the user already customized for this (still empty) slot.
    const time = assignments[over.id]?.time ?? mockTimeSlots[slotIdx] ?? mockTimeSlots[0];

    const slotPayload = {
      time,
      client: {
        caseId: caseObj.id,
        fname: caseObj.clientInfo?.fname ?? "",
        lname: caseObj.clientInfo?.lname ?? "",
        category: caseObj.caseInfo?.category ?? "",
        language: caseObj.clientInfo?.primaryLanguage ?? "",
        phone: caseObj.clientInfo?.phone ?? "",
        email: caseObj.clientInfo?.email ?? "",
      },
      attorney: columnAttorneys[`col${colIdxStr}`] ?? null,
    };

    setAssignments((prev) => ({ ...prev, [over.id]: slotPayload }));
  }

  // ── Remove a slot: local only ─────────────────────────────────────────────
  function handleRemove(slotKey) {
    const [colIdxStr] = slotKey.split("-");
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];

      // If that was the column's last slot and an attorney is still selected,
      // keep a placeholder so the attorney selection isn't lost on Save.
      const colHasOtherSlots = Object.keys(next).some((key) => key.startsWith(`${colIdxStr}-`));
      const attorney = columnAttorneys[`col${colIdxStr}`];
      if (!colHasOtherSlots && attorney) {
        next[`${colIdxStr}-0`] = { time: mockTimeSlots[0], client: null, attorney };
      }
      return next;
    });
  }

  // ── Attorney selected in a column: local only ─────────────────────────────
  function handleAttorneySelect(colIdx, attorney) {
    const colKey = `col${colIdx}`;
    const attorneyPayload = {
      attorneyId: attorney.id,
      name: attorney.value ?? attorney.name ?? "",
      specialty: attorney.specialty ?? attorney.mainPracticeAreas ?? "",
      language: attorney.language ?? attorney.languageSkills ?? attorney.primaryLanguage ?? "",
      email: attorney.email ?? "",
      phone: attorney.phoneNumber ?? "",
    };
    setColumnAttorneys((prev) => ({ ...prev, [colKey]: attorneyPayload }));

    // Propagate attorney into all existing slot assignments for this column.
    // If the column has no slots yet (no cases placed), create a placeholder
    // slot entry so the attorney selection survives Save/reload the same way
    // it would if a case had already been placed on the schedule.
    setAssignments((prev) => {
      const next = { ...prev };
      const colSlotKeys = Object.keys(next).filter((key) => key.startsWith(`${colIdx}-`));
      if (colSlotKeys.length === 0) {
        next[`${colIdx}-0`] = { time: mockTimeSlots[0], client: null, attorney: attorneyPayload };
      } else {
        for (const key of colSlotKeys) {
          next[key] = { ...next[key], attorney: attorneyPayload };
        }
      }
      return next;
    });
  }

  // ── Attorney cleared in a column: same as hitting "-" on every slot ───────
  function handleAttorneyClear(colIdx) {
    const colKey = `col${colIdx}`;
    setColumnAttorneys((prev) => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });

    setAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!key.startsWith(`${colIdx}-`)) continue;
        // Drop the assignment entirely — any placed case falls back out of
        // assignedCaseIds and reappears in the waitlist, same as clicking
        // the red "-" remove button on that slot.
        delete next[key];
      }
      return next;
    });
  }

  // ── Time changed for a slot: local only ──────────────────────────────────
  function handleTimeChange(slotKey, newTime) {
    const [colIdxStr] = slotKey.split("-");
    setAssignments((prev) => {
      const existing = prev[slotKey];
      if (existing) {
        return { ...prev, [slotKey]: { ...existing, time: newTime } };
      }
      // No occupant yet — still remember the custom time (and keep any
      // attorney already selected for this column) so it survives Save.
      const attorney = columnAttorneys[`col${colIdxStr}`] ?? null;
      return { ...prev, [slotKey]: { time: newTime, client: null, attorney } };
    });
  }

  // ── Interpreter selected in a slot: local only ───────────────────────────
  function handleInterpreterSelect(slotKey, interpreter) {
    if (!isEditMode) return;
    setAssignments((prev) => {
      const slot = prev[slotKey];
      if (!slot) return prev;
      return { ...prev, [slotKey]: { ...slot, interpreter } };
    });
  }

  // ── Persist one date's schedule + case side-effects to Firebase ──────────
  // `assignmentsToSave`/`prevSlots` are passed explicitly rather than closing
  // over the live `assignments`/`savedAssignmentsRef` state, so this can
  // persist ANY date's draft — not just whichever one is on screen right now.
  // That's what lets Save flush every date touched during an edit session in
  // one pass. `moveFromDateKey` (Change Date only) additionally deletes the
  // old node in the same multi-path update.
  async function persistScheduleDate(targetDateKey, assignmentsToSave, prevSlots, moveFromDateKey = null) {
    const payload = {
      slots: assignmentsToSave,
      dateKey: targetDateKey,
      savedAt: new Date().toISOString(),
    };

    // 1) Save full schedule (including column attorney selections) at the target date
    await set(ref(db, `schedules/${targetDateKey}`), payload);

    // 2) Write matched attorney + interpreter into each assigned case's record.
    // matchInfo holds the personnel UID (a stable reference, not a display value);
    // schedulingInfo carries name + email + phone, which is what EditForm's
    // Attorney / Legal Student sections actually display.
    const caseUpdates = {};
    const currentCaseIds = new Set();
    for (const [slotKey, slot] of Object.entries(assignmentsToSave)) {
      if (slot?.client?.caseId) {
        currentCaseIds.add(slot.client.caseId);
        // Flip the case out of "waitlisted" so it stops showing up as
        // available on other dates (and on the Cases waitlist tab) once
        // it's actually been placed on a schedule — prevents double-booking.
        caseUpdates[`cases/${slot.client.caseId}/status`] = "scheduled";
        // Persist the clinic date + time slot onto the case record itself,
        // so views like Attorney View can read a case's schedule directly
        // instead of scanning every schedules/ node.
        caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/date`] = targetDateKey;
        caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/timeSlot`] = slot.time ?? "";
        if (slot?.attorney) {
          caseUpdates[`cases/${slot.client.caseId}/matchInfo/attorney`] = slot.attorney.attorneyId ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyName`] = slot.attorney.name ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyEmail`] = slot.attorney.email ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyPhone`] = slot.attorney.phone ?? "";
        } else {
          // Attorney was unassigned from this slot's column — the case stays
          // on the schedule, but drop the stale attorney reference instead of
          // leaving it pointed at whoever was cleared.
          caseUpdates[`cases/${slot.client.caseId}/matchInfo/attorney`] = null;
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyName`] = null;
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyEmail`] = null;
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyPhone`] = null;
        }
        if (slot?.interpreter) {
          caseUpdates[`cases/${slot.client.caseId}/matchInfo/interpreter`] = slot.interpreter.id ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/interpreterName`] = slot.interpreter.name ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/interpreterEmail`] = slot.interpreter.email ?? "";
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/interpreterPhone`] = slot.interpreter.phone ?? "";
        }
      }
    }

    // 3) Clear matchInfo + schedulingInfo contact fields for cases removed from the board since last save,
    // and put them back in the waitlist pool
    for (const slot of Object.values(prevSlots)) {
      const caseId = slot?.client?.caseId;
      if (caseId && !currentCaseIds.has(caseId)) {
        caseUpdates[`cases/${caseId}/status`] = "waitlisted";
        caseUpdates[`cases/${caseId}/schedulingInfo/date`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/timeSlot`] = null;
        caseUpdates[`cases/${caseId}/matchInfo/attorney`] = null;
        caseUpdates[`cases/${caseId}/matchInfo/interpreter`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyName`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyEmail`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/attorneyPhone`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterName`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterEmail`] = null;
        caseUpdates[`cases/${caseId}/schedulingInfo/interpreterPhone`] = null;
      }
    }

    // 4) Reconcile the caseAccess/{uid} index. Firebase rules only let an
    // Attorney/Legal Student read cases/$caseId they're matched to, not the
    // whole cases collection — this index is what Attorney View reads to
    // find which case IDs to fetch. Covers assign, reassign, and unassign.
    const prevMatchByCase = {};
    for (const slot of Object.values(prevSlots)) {
      const caseId = slot?.client?.caseId;
      if (caseId) {
        prevMatchByCase[caseId] = {
          attorneyId: slot.attorney?.attorneyId ?? null,
          interpreterId: slot.interpreter?.id ?? null,
        };
      }
    }
    const currentMatchByCase = {};
    for (const slot of Object.values(assignmentsToSave)) {
      const caseId = slot?.client?.caseId;
      if (caseId) {
        currentMatchByCase[caseId] = {
          attorneyId: slot.attorney?.attorneyId ?? null,
          interpreterId: slot.interpreter?.id ?? null,
        };
      }
    }
    const touchedCaseIds = new Set([...Object.keys(prevMatchByCase), ...Object.keys(currentMatchByCase)]);
    for (const caseId of touchedCaseIds) {
      const prevMatch = prevMatchByCase[caseId] ?? {};
      const currMatch = currentMatchByCase[caseId] ?? {};
      if (prevMatch.attorneyId && prevMatch.attorneyId !== currMatch.attorneyId) {
        caseUpdates[`caseAccess/${prevMatch.attorneyId}/${caseId}`] = null;
      }
      if (currMatch.attorneyId) {
        caseUpdates[`caseAccess/${currMatch.attorneyId}/${caseId}`] = true;
      }
      if (prevMatch.interpreterId && prevMatch.interpreterId !== currMatch.interpreterId) {
        caseUpdates[`caseAccess/${prevMatch.interpreterId}/${caseId}`] = null;
      }
      if (currMatch.interpreterId) {
        caseUpdates[`caseAccess/${currMatch.interpreterId}/${caseId}`] = true;
      }
    }

    // 5) Moving to a different date (Change Date only) — drop the old schedule node
    if (moveFromDateKey && moveFromDateKey !== targetDateKey) {
      caseUpdates[`schedules/${moveFromDateKey}`] = null;
    }

    if (Object.keys(caseUpdates).length > 0) {
      await update(ref(db), caseUpdates);
    }
  }

  // ── Save: flush every date touched during this edit session ──────────────
  // Not just the one on screen — any others stashed while hopping around via
  // prev/next/jump get saved too, in the same click.
  async function handleSave() {
    try {
      const draftsToSave = {
        ...draftsRef.current,
        [dateKey]: { assignments, columnAttorneys, savedSlots: savedAssignmentsRef.current },
      };

      for (const [targetDateKey, draft] of Object.entries(draftsToSave)) {
        await persistScheduleDate(targetDateKey, draft.assignments, draft.savedSlots);
      }

      draftsRef.current = {};
      savedAssignmentsRef.current = assignments;
      setIsEditMode(false);
      console.log(`Save successful — saved ${Object.keys(draftsToSave).length} schedule(s).`);
    } catch (err) {
      console.error("Failed to save schedule:", err);
    }
  }

  // ── Change date: move this schedule (and its cases) to a different date ──
  async function handleChangeDate(newDateStr) {
    try {
      await persistScheduleDate(newDateStr, assignments, savedAssignmentsRef.current, dateKey);
      delete draftsRef.current[dateKey];
      savedAssignmentsRef.current = assignments;
      setCurrentDate(fromYMD(newDateStr));
      setIsChangeDateOpen(false);
      setIsEditMode(false);
      console.log("Schedule moved to", newDateStr);
    } catch (err) {
      console.error("Failed to change schedule date:", err);
    }
  }

  // ── Auto-match: fill empty slots for active attorneys ──────────────────────
  function handleAutoMatch() {

    // Collect all empty slots for columns that have an attorney assigned
    const emptySlots = [];
    for (let colIdx = 0; colIdx < colArray.length; colIdx++) {
      const attorney = columnAttorneys[`col${colIdx}`];
      if (!attorney) continue; // No attorney selected for this column

      for (let slotIdx = 0; slotIdx < mockTimeSlots.length; slotIdx++) {
        const slotKey = `${colIdx}-${slotIdx}`;
        if (!assignments[slotKey]?.client) {
          emptySlots.push({ colIdx, slotIdx, slotKey, attorney });
        }
      }
    }

    if (emptySlots.length === 0) return;

    // Available cases are the waitlisted ones not already assigned on the board
    const assignedCaseIds = new Set(
      Object.values(assignments)
        .map((s) => s?.client?.caseId)
        .filter(Boolean)
    );
    let availableCases = waitlistCases.filter((c) => !assignedCaseIds.has(c.id));
    let slotsToFill = [...emptySlots];
    const newAssignments = { ...assignments };

    while (slotsToFill.length > 0 && availableCases.length > 0) {
      let bestMatch = null;

      // Evaluate all combinations of remaining slots and remaining cases
      for (const slot of slotsToFill) {
        for (const caseObj of availableCases) {
          const scoreResult = calculateMatchScore(caseObj, slot.attorney);
          const score = scoreResult.totalScore;

          if (!bestMatch || score > bestMatch.score) {
            bestMatch = {
              slot,
              caseObj,
              score
            };
          }
        }
      }

      if (bestMatch) {
        const { slot, caseObj } = bestMatch;
        // Preserve a time the user already customized for this (still empty) slot.
        const time = assignments[slot.slotKey]?.time ?? mockTimeSlots[slot.slotIdx] ?? mockTimeSlots[0];

        newAssignments[slot.slotKey] = {
          time,
          client: {
            caseId: caseObj.id,
            fname: caseObj.clientInfo?.fname ?? "",
            lname: caseObj.clientInfo?.lname ?? "",
            category: caseObj.caseInfo?.category ?? "",
            language: caseObj.clientInfo?.primaryLanguage ?? "",
            phone: caseObj.clientInfo?.phone ?? "",
            email: caseObj.clientInfo?.email ?? "",
          },
          attorney: slot.attorney,
        };

        // Remove from available pools
        availableCases = availableCases.filter((c) => c.id !== caseObj.id);
        slotsToFill = slotsToFill.filter((s) => s.slotKey !== slot.slotKey);
      } else {
        break;
      }
    }

    setAssignments(newAssignments);
  }

  // ── Cases already placed on this date — hide from waitlist ────────────────
  const assignedCaseIds = new Set(
    Object.values(assignments)
      .map((s) => s?.client?.caseId)
      .filter(Boolean)
  );

  const filteredWaitlist = waitlistCases
    .filter((c) => !assignedCaseIds.has(c.id))
    .filter((c) => {
      const fullName = `${c.clientInfo?.fname ?? ""} ${c.clientInfo?.lname ?? ""}`.toLowerCase();
      const caseId = c.id.toLowerCase();
      return (
        searchQuery === "" ||
        fullName.includes(searchQuery.toLowerCase()) ||
        caseId.includes(searchQuery.toLowerCase())
      );
    });

  const colArray = mockAttorneys.map((_, i) => i);
  const hasAnyAttorneyAssigned = Object.keys(columnAttorneys).length > 0;

  return (
    <>
      <NavBar active={"schedule"} />

      <DndContext sensors={sensors} onDragEnd={isEditMode ? handleDragEnd : () => { }}>
        <div className="schedule-page">
          {/* Left Panel */}
          <div className="schedule-panel">
            <div className="schedule-header">
              {/* Date Navigation — nothing to navigate between until a schedule exists */}
              <div className="schedule-date-nav">
                {!hasNoSchedules && (
                  <>
                    <button
                      className="btn btn-sm schedule-nav-arrow"
                      onClick={goToPrevSchedule}
                      disabled={!hasPrevSchedule}
                      aria-label="Previous schedule"
                    >
                      ‹
                    </button>
                    <div className="schedule-add-wrapper schedule-date-label-wrapper">
                      <button
                        type="button"
                        className="btn btn-sm schedule-clinic-label"
                        onClick={() => {
                          setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                          setIsJumpCalendarOpen((o) => !o);
                        }}
                        aria-label="Jump to another schedule"
                        aria-expanded={isJumpCalendarOpen}
                      >
                        <span className="schedule-clinic-label-corner schedule-clinic-label-corner--tl" aria-hidden="true" />
                        <span className="schedule-clinic-label-corner schedule-clinic-label-corner--tr" aria-hidden="true" />
                        <span className="schedule-clinic-label-corner schedule-clinic-label-corner--bl" aria-hidden="true" />
                        <span className="schedule-clinic-label-corner schedule-clinic-label-corner--br" aria-hidden="true" />
                        {clinicLabel}
                      </button>
                      {isJumpCalendarOpen && (
                        <ScheduleDateCalendar
                          mode="jump"
                          hint="Pick a date to go to another existing schedule."
                          month={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          scheduleDates={scheduleDates}
                          onSelect={handleJumpToSchedule}
                          onClose={() => setIsJumpCalendarOpen(false)}
                        />
                      )}
                    </div>
                    <button
                      className="btn btn-sm schedule-nav-arrow"
                      onClick={goToNextSchedule}
                      disabled={!hasNextSchedule}
                      aria-label="Next schedule"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons — nothing to act on until a schedule exists */}
              <div className="schedule-action-buttons">
                {!hasNoSchedules && (isEditMode ? (
                  <div className="schedule-actions-menu" ref={actionsMenuRef}>
                    <button
                      type="button"
                      className="btn btn-sm schedule-kebab-btn"
                      onClick={() => setIsActionsMenuOpen((o) => !o)}
                      title="More actions"
                      aria-label="More actions for this schedule"
                      aria-haspopup="true"
                      aria-expanded={isActionsMenuOpen}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.75"></circle>
                        <circle cx="12" cy="12" r="1.75"></circle>
                        <circle cx="12" cy="19" r="1.75"></circle>
                      </svg>
                    </button>

                    {isActionsMenuOpen && (
                      <div className="schedule-dropdown-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className="schedule-dropdown-item schedule-dropdown-item-primary"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            handleAutoMatch();
                          }}
                          disabled={!hasAnyAttorneyAssigned}
                          title={!hasAnyAttorneyAssigned ? "Assign at least one attorney to a column first" : undefined}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                          </svg>
                          <span>Auto-match</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className="schedule-dropdown-item"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                            setIsChangeDateOpen(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                          </svg>
                          <span>Move Date</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          className="schedule-dropdown-item schedule-dropdown-item-success"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            handleSave();
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4.207a2 2 0 0 0-.586-1.414l-2.793-2.793A2 2 0 0 0 11.207 1H2zm6 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm.5-9v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3h5.5z" />
                          </svg>
                          <span>Save</span>
                        </button>

                        <div className="schedule-dropdown-divider" role="separator"></div>

                        <button
                          type="button"
                          role="menuitem"
                          className="schedule-dropdown-item schedule-dropdown-item-danger"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            setIsDeleteScheduleOpen(true);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L13.882 4H4.118zM2.5 3V2h11v1h-11z" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="schedule-add-wrapper">
                      <button
                        type="button"
                        className="btn btn-sm schedule-action-btn schedule-action-btn-primary"
                        onClick={() => {
                          setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
                          setIsAddScheduleOpen((o) => !o);
                        }}
                        title="Add new schedule"
                        aria-label="Add new schedule"
                        aria-expanded={isAddScheduleOpen}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 7a.5.5 0 0 1 .5.5V9H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V10H6a.5.5 0 0 1 0-1h1.5V7.5A.5.5 0 0 1 8 7z" />
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                        </svg>
                        Add
                      </button>
                      {isAddScheduleOpen && (
                        <ScheduleDateCalendar
                          mode="add"
                          hint="Pick a date to create a new schedule."
                          month={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          scheduleDates={scheduleDates}
                          onSelect={handleAddSchedule}
                          onClose={() => setIsAddScheduleOpen(false)}
                        />
                      )}
                    </div>

                    <button
                      className="btn btn-sm schedule-action-btn schedule-action-btn-secondary"
                      onClick={() => setIsEditMode(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                      </svg>
                      Edit
                    </button>
                  </>
                ))}
              </div>
            </div>

            {/* Schedule Grid */}
            <div className={`schedule-grid${hasNoSchedules ? " schedule-grid--empty" : ""}`}>
              {hasNoSchedules ? (
                <div className="schedule-grid-empty-cta">
                  <p className="schedule-grid-empty-title">Create your first schedule</p>
                  <p className="schedule-grid-empty-subtitle">Pick a date below to get started.</p>
                  <ScheduleDateCalendar
                    mode="add"
                    embedded
                    large
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    scheduleDates={scheduleDates}
                    onSelect={handleAddSchedule}
                    onClose={() => { }}
                  />
                </div>
              ) : colArray.map((colIdx) => (
                <AttorneyColumn
                  key={colIdx}
                  colIdx={colIdx}
                  savedAttorney={columnAttorneys[`col${colIdx}`] ?? null}
                  timeSlots={mockTimeSlots}
                  assignments={assignments}
                  onRemove={handleRemove}
                  isEditMode={isEditMode}
                  allAttorneysArr={allAttorneysArr}
                  allLegalStudentsArr={allLegalStudentsArr}
                  onAttorneySelect={(attorney) => handleAttorneySelect(colIdx, attorney)}
                  onAttorneyClear={() => handleAttorneyClear(colIdx)}
                  onInterpreterSelect={handleInterpreterSelect}
                  onTimeChange={handleTimeChange}
                  allCases={allCases}
                  onContactClick={setContactCaseId}
                />
              ))}
            </div>
          </div>

          {/* Right Panel: Waitlist — nothing to place on a schedule until one exists */}
          {!hasNoSchedules && (
            <div className="schedule-waitlist-panel">
              <h5 className="schedule-waitlist-title">Waitlist</h5>

              <div className="schedule-search-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" className="schedule-search-icon">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z" />
                </svg>
                <input
                  type="text"
                  className="form-control form-control-sm schedule-search-input"
                  placeholder="Search by Name or Case ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="schedule-legend">
                <span className="schedule-legend-item">
                  <span className="schedule-legend-dot schedule-legend-dot-old" />Old
                </span>
                <span className="schedule-legend-item">
                  <span className="schedule-legend-dot schedule-legend-dot-medium" />Medium
                </span>
                <span className="schedule-legend-item">
                  <span className="schedule-legend-dot schedule-legend-dot-new" />New
                </span>
              </div>

              <div className="schedule-waitlist-cards">
                {filteredWaitlist.length > 0
                  ? filteredWaitlist.map((c) => (
                    <WaitlistCard
                      key={c.id}
                      firebaseKey={c.id}
                      id={c.id.slice(c.id.length - 5)}
                      fname={c.clientInfo?.fname}
                      lname={c.clientInfo?.lname}
                      category={c.caseInfo?.category}
                      language={c.clientInfo?.primaryLanguage}
                      date={c.schedulingInfo?.date}
                      onPreview={() => setSelectedCase(c)}
                      onContact={() => setContactCaseId(c.id)}
                      isDraggable={isEditMode}
                    />
                  ))
                  : <p className="text-muted small text-center mt-2">No waitlisted cases.</p>
                }
              </div>
            </div>
          )}

          {selectedCase && (
            <CasePreview
              caseData={selectedCase}
              onClose={() => setSelectedCase(null)}
              onExpand={() => navigate(`/edit-form/${selectedCase.id}`)}
            />
          )}
          {contactCaseId && (
            <ContactPopUp
              caseId={contactCaseId}
              onClose={() => setContactCaseId(null)}
            />
          )}
          {isDeleteScheduleOpen && (
            <DeleteScheduleConfirm
              clinicLabel={clinicLabel}
              onCancel={() => setIsDeleteScheduleOpen(false)}
              onConfirm={handleDeleteSchedule}
            />
          )}
          {isChangeDateOpen && (
            <ChangeScheduleDateModal
              clinicLabel={clinicLabel}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              scheduleDates={scheduleDates}
              onSelect={handleChangeDate}
              onCancel={() => setIsChangeDateOpen(false)}
            />
          )}
        </div>
      </DndContext>
    </>
  );
}

// ─── Attorney Column ──────────────────────────────────────────────────────────

function AttorneyColumn({ colIdx, savedAttorney, timeSlots, assignments, onRemove, isEditMode, allAttorneysArr, allLegalStudentsArr, onAttorneySelect, onAttorneyClear, onInterpreterSelect, onTimeChange, allCases, onContactClick }) {
  const [selectedAttorney, setSelectedAttorney] = useState(null);

  // Populate from Firebase-loaded saved attorney
  useEffect(() => {
    if (savedAttorney?.name) {
      setSelectedAttorney(savedAttorney);
    } else {
      setSelectedAttorney(null);
    }
  }, [savedAttorney?.attorneyId]);

  const datalistItems = allAttorneysArr.map((a) => ({
    ...a,
    id: a.id,
    value: a.name ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim(),
  }));

  function handleSelect(item) {
    setSelectedAttorney(item);
    onAttorneySelect(item);
  }

  function handleClear() {
    setSelectedAttorney(null);
    onAttorneyClear();
  }

  return (
    <div className="schedule-attorney-column">
      <div className="schedule-attorney-header">
        {isEditMode ? (
          <div className="schedule-attorney-select-wrapper">
            <DatalistInput
              placeholder="Select attorney…"
              label=""
              onSelect={handleSelect}
              items={datalistItems}
              value={selectedAttorney?.value ?? selectedAttorney?.name ?? ""}
            />
            {selectedAttorney && (
              <button
                type="button"
                className="schedule-attorney-clear-btn"
                onClick={handleClear}
                title="Unassign attorney"
                aria-label="Unassign attorney"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="schedule-attorney-display">
            <div
              className="schedule-attorney-display-name"
              title={selectedAttorney?.value ?? selectedAttorney?.name ?? "Karia Wong"}
            >
              {selectedAttorney?.value ?? selectedAttorney?.name ?? "Karia Wong"}
            </div>
            <div className="schedule-attorney-display-details">
              {selectedAttorney
                ? `${selectedAttorney.specialty || "No Category"} | ${selectedAttorney.language || "No Language"}`
                : "Select Attorney in Edit Mode..."}
            </div>
          </div>
        )}
      </div>

      {timeSlots.map((defaultTime, slotIdx) => {
        const slotKey = `${colIdx}-${slotIdx}`;
        const time = assignments[slotKey]?.time ?? defaultTime;
        return (
          <TimeSlotCard
            key={slotKey}
            slotKey={slotKey}
            time={time}
            assignedSlot={assignments[slotKey] ?? null}
            onRemove={onRemove}
            isEditMode={isEditMode}
            hasAttorney={!!selectedAttorney}
            allAttorneysArr={allAttorneysArr}
            allLegalStudentsArr={allLegalStudentsArr}
            onInterpreterSelect={onInterpreterSelect}
            onTimeChange={onTimeChange}
            allCases={allCases}
            onContactClick={onContactClick}
          />
        );
      })}
    </div>
  );
}

// ─── Time Slot Card (Droppable) ───────────────────────────────────────────────

// ─── Time Slot Card (Droppable) ───────────────────────────────────────────────
function TimeSlotCard({ slotKey, time, assignedSlot, onRemove, isEditMode, hasAttorney, allAttorneysArr, allLegalStudentsArr, onInterpreterSelect, onTimeChange, allCases, onContactClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotKey, disabled: !hasAttorney });
  const [isMeetingLinkOpen, setIsMeetingLinkOpen] = useState(false);
  const { digits: timeDigits, period: timePeriod } = parseTimeString(time);

  function handleTimeDigitsChange(e) {
    onTimeChange(slotKey, `${e.target.value}${timePeriod}`);
  }

  function handleTimePeriodChange(e) {
    onTimeChange(slotKey, `${timeDigits}${e.target.value}`);
  }

  const assignedClient = assignedSlot?.client ?? null;
  const assignedAttorney = assignedSlot?.attorney ?? null;

  const liveCase = assignedClient?.caseId ? allCases[assignedClient.caseId] : null;
  const fname = liveCase?.clientInfo?.fname ?? assignedClient?.fname ?? "Unknown";
  const lname = liveCase?.clientInfo?.lname ?? assignedClient?.lname ?? "Client";
  const categoryRaw = liveCase?.caseInfo?.category || assignedClient?.category;
  const category = (!categoryRaw || categoryRaw === "—") ? "No Category" : categoryRaw;
  const languageRaw = liveCase?.clientInfo?.primaryLanguage || assignedClient?.language;
  const language = (!languageRaw || languageRaw === "—") ? "No Language" : languageRaw;

  function handleMeetingLink() {
    setIsMeetingLinkOpen(true);
  }

  function handleContact() {
    if (assignedClient?.caseId) {
      onContactClick(assignedClient.caseId);
    }
  }

  return (

    <div className="schedule-slot-card-outer">
      {isMeetingLinkOpen && (
        <MeetingPopUp onClose={() => setIsMeetingLinkOpen(false)} />
      )}
      {isEditMode && assignedClient && (
        <div className="schedule-slot-remove-zone">
          <button
            className="schedule-slot-remove-btn"
            onClick={() => onRemove(slotKey)}
            title="Remove from slot"
          >
            −
          </button>
        </div>
      )}

      <div
        ref={setNodeRef}
        className={
          "schedule-time-slot-card" +
          (isOver && !assignedClient && isEditMode ? " schedule-time-slot-card--over" : "") +
          (!hasAttorney && isEditMode && !assignedClient ? " schedule-time-slot-card--locked" : "") +
          (!isEditMode ? " schedule-time-slot-card--view" : "")
        }
      >
        <div className="schedule-slot-header">
          {isEditMode ? (
            <div className="schedule-slot-time-edit">
              <input
                type="text"
                className="schedule-slot-time-input"
                value={timeDigits}
                onChange={handleTimeDigitsChange}
                placeholder="5:30"
                aria-label="Time"
                inputMode="numeric"
              />
              <select
                className="schedule-slot-time-period-select"
                value={timePeriod}
                onChange={handleTimePeriodChange}
                aria-label="AM or PM"
              >
                <option value="am">AM</option>
                <option value="pm">PM</option>
              </select>
            </div>
          ) : (
            <span>{time}</span>
          )}
        </div>

        {assignedClient ? (
          <div className="schedule-slot-body--filled">
            <div className="schedule-slot-content">
              <div className="schedule-slot-client-row">
                <span className="schedule-slot-dot" />
                <div>
                  <div className="schedule-slot-client-name">
                    {fname} {lname}
                  </div>
                  <div className="schedule-slot-client-details">
                    {category} | {language}
                  </div>

                </div>
              </div>

              <div className="schedule-slot-actions">
                {/*<div className="schedule-slot-assign-wrapper schedule-slot-assign-full">
                  <button className="schedule-slot-btn schedule-slot-btn-assign">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/>
                      <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14v-.868h-3v-.002c-.018 0-.035.002-.053.003H9.529l-.001-.001H7v.867h1.604c-.316.764-.78 1.63-1.362 2.404z"/>
                    </svg>
                    Assign
                  </button>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" className="schedule-slot-assign-chevron">
                    <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                  </svg>
                </div>*/}
                {/* DEMO CODE: Probably heavily refactor/remove */}
                <div className="schedule-slot-assign-wrapper schedule-slot-assign-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="schedule-slot-translate-icon">
                    <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z" />
                    <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14v-.868h-3v-.002c-.018 0-.035.002-.053.003H9.529l-.001-.001H7v.867h1.604c-.316.764-.78 1.63-1.362 2.404z" />
                  </svg>
                  <select
                    className={`schedule-slot-btn schedule-slot-btn-assign ${!isEditMode ? "schedule-slot-btn-assign--no-arrow" : ""}`}
                    defaultValue={assignedSlot?.interpreter?.id ?? ""}
                    disabled={!isEditMode}
                    onChange={(e) => {
                      if (!isEditMode) return;
                      const id = e.target.value;
                      const fromAttorneys = allAttorneysArr.find((a) => a.id === id);
                      const fromStudents = allLegalStudentsArr.find((s) => s.id === id);
                      const person = fromAttorneys ?? fromStudents;
                      if (!person) return;
                      onInterpreterSelect(slotKey, {
                        id: person.id,
                        name: person.name ?? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(),
                        type: fromAttorneys ? "attorney" : "legalStudent",
                        email: person.email ?? "",
                        phone: person.phoneNumber ?? "",
                      });
                    }}
                  >
                    <option value="" disabled>{isEditMode ? "Assign Interpreter" : "No Interpreter Assigned"}</option>
                    <optgroup label="Attorneys">
                      {allAttorneysArr.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Legal Students">
                      {allLegalStudentsArr.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="schedule-slot-bottom-row">
                  <button className="schedule-slot-btn schedule-slot-btn-meeting" onClick={handleMeetingLink}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z" />
                    </svg>
                    Meeting link
                  </button>

                  <button className="schedule-slot-btn schedule-slot-btn-contact" onClick={handleContact}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                      <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z" />
                    </svg>
                    Contact
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="schedule-slot-body">
            <span className="schedule-slot-locked-hint">
              {isEditMode
                ? (hasAttorney ? "Drag and drop cases from waitlist" : "Assign an attorney first")
                : "Select Case in Edit Mode"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Waitlist Card (Draggable) ────────────────────────────────────────────────
function WaitlistCard({ firebaseKey, id, fname, lname, category, language, date, onPreview, onContact, isDraggable }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: firebaseKey,
    disabled: !isDraggable,
  });
  const cardRef = useRef(null);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : "";
  }, [transform]);

  function handleCardRef(node) {
    cardRef.current = node;
    setNodeRef(node);
  }

  return (
    <div
      ref={handleCardRef}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={`schedule-waitlist-card${isDragging ? " schedule-waitlist-card--dragging" : ""}${!isDraggable ? " schedule-waitlist-card--locked" : ""}`}
      onClick={onPreview}
    >
      <div className="schedule-waitlist-card-content">
        <div className="schedule-card-header-row">
          <div className="schedule-card-name-section">
            <span className="schedule-client-name">
              {fname || "Unknown"} {lname || "Client"}
            </span>
            <span className="schedule-case-badge">{id}</span>
          </div>
          <span className="schedule-card-date">{date || "No Date"}</span>
        </div>

        <p className="schedule-card-details">
          {(!category || category === "—") ? "No Category" : category} | {(!language || language === "—") ? "No Language" : language}
        </p>

        <div className="d-flex justify-content-end mt-1">
          <button
            className="btn btn-sm schedule-contact-btn"
            onClick={(e) => {
              e.stopPropagation();
              onContact();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z" />
            </svg>
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Date Calendar Dropdown ──────────────────────────────────────────
// Two modes, sharing the same month-grid UI:
//  - "add":  picking a date to create a new schedule — dates that already
//            have one are disabled (can't create a duplicate).
//  - "jump": picking a date to view an existing schedule — dates that don't
//            have one are disabled (nothing to jump to).
// `embedded`: renders inline (no absolute positioning/shadow, no outside-click
// self-close) for use inside a modal that already owns its own close behavior,
// instead of as a dropdown anchored to a trigger button.
function ScheduleDateCalendar({ month, onMonthChange, scheduleDates, mode, onSelect, onClose, embedded = false, large = false, hint }) {
  const panelRef = useRef(null);

  // Close on outside click — only relevant when acting as a standalone dropdown
  useEffect(() => {
    if (embedded) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [embedded, onClose]);

  const scheduleDateSet = new Set(scheduleDates);
  const cells = getMonthGridCells(month);
  const monthLabel = `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`;

  function isDisabled(ymd) {
    return mode === "jump" ? !scheduleDateSet.has(ymd) : scheduleDateSet.has(ymd);
  }
  function disabledTitle() {
    return mode === "jump" ? "No schedule exists for this date" : "A schedule already exists for this date";
  }

  function goPrevMonth() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }
  function goNextMonth() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  return (
    <div
      className={`schedule-add-calendar${embedded ? " schedule-add-calendar--embedded" : ""}${large ? " schedule-add-calendar--large" : ""}`}
      ref={panelRef}
    >
      {hint && <p className="schedule-add-calendar-hint">{hint}</p>}
      <div className="schedule-add-calendar-header">
        <button type="button" className="schedule-add-calendar-nav" onClick={goPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <span className="schedule-add-calendar-month">{monthLabel}</span>
        <button type="button" className="schedule-add-calendar-nav" onClick={goNextMonth} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="schedule-add-calendar-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="schedule-add-calendar-grid">
        {cells.map((cellDate, i) => {
          if (!cellDate) {
            return <span key={i} className="schedule-add-calendar-cell schedule-add-calendar-cell--empty" />;
          }
          const ymd = toYMD(cellDate);
          const disabled = isDisabled(ymd);
          return (
            <button
              key={i}
              type="button"
              className={`schedule-add-calendar-cell${disabled ? " schedule-add-calendar-cell--disabled" : ""}`}
              disabled={disabled}
              title={disabled ? disabledTitle() : undefined}
              onClick={() => onSelect(ymd)}
            >
              {cellDate.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Delete Schedule Confirmation ─────────────────────────────────────────────
function DeleteScheduleConfirm({ clinicLabel, onCancel, onConfirm }) {
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onCancel} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onCancel}>✕</button>
        <h6 className="schedule-modal-title">Delete Schedule</h6>
        <p className="mb-3">
          This will remove the schedule for <strong>{clinicLabel}</strong>, along with
          any attorneys and cases assigned to it. This can't be undone.
        </p>
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-cancel p-0 text-decoration-underline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="schedule-delete-confirm-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Change Schedule Date Modal ────────────────────────────────────────────────
function ChangeScheduleDateModal({ clinicLabel, month, onMonthChange, scheduleDates, onSelect, onCancel }) {
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onCancel} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onCancel}>✕</button>
        <h6 className="schedule-modal-title">Move Schedule Date</h6>
        <p className="mb-3">
          Currently <strong>{clinicLabel}</strong>. Pick a new date to move this schedule
          (and its assigned attorneys and cases) to.
        </p>
        <ScheduleDateCalendar
          mode="add"
          embedded
          month={month}
          onMonthChange={onMonthChange}
          scheduleDates={scheduleDates}
          onSelect={onSelect}
          onClose={onCancel}
        />
      </div>
    </>
  );
}

function MeetingPopUp({ onClose }) {
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onClose} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onClose}>✕</button>
        <h6 className="schedule-modal-title">Meeting Link</h6>
        <input
          type="text"
          className="form-control"
          placeholder="Paste meeting link here…"
        />
      </div>
    </>
  );
}

// ─── Contact Pop Up ───────────────────────────────────────────────────────────
function ContactPopUp({ caseId, onClose }) {
  const db = getDatabase();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;
    const caseRef = ref(db, `cases/${caseId}`);
    const unsubscribe = onValue(caseRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.clientInfo) {
        setFname(data.clientInfo.fname || "");
        setLname(data.clientInfo.lname || "");
        setPhone(data.clientInfo.phone || "");
        setEmail(data.clientInfo.email || "");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [caseId, db]);

  const handleSave = () => {
    const clientInfoRef = ref(db, `cases/${caseId}/clientInfo`);
    update(clientInfoRef, {
      phone,
      email,
    })
      .then(() => {
        onClose();
      })
      .catch((err) => {
        console.error("Error saving contact card:", err);
      });
  };

  if (loading) {
    return (
      <>
        <div className="schedule-modal-backdrop" onClick={onClose} />
        <div className="schedule-modal-popup">
          <button className="schedule-modal-close-btn" onClick={onClose}>✕</button>
          <div className="text-center py-3 text-muted">Loading contact info...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onClose} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onClose}>✕</button>
        <h6 className="schedule-modal-title">Contact</h6>
        <div className="schedule-modal-contact-info">
          <p className="mb-2"><strong>{fname} {lname}</strong></p>
          <div className="mb-2">
            <label className="form-label small mb-1">Phone</label>
            <input
              type="tel"
              className="form-control form-control-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="form-label small mb-1">Email</label>
            <input
              type="email"
              className="form-control form-control-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-cancel p-0 text-decoration-underline" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-submit py-1 px-3" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </>
  );
}