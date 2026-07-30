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

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toMDY(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAttorneys = [
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
];

const mockTimeSlots = ["5:30pm", "6:30pm", "7:30pm"];

// ─── Schedule ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [waitlistCases, setWaitlistCases] = useState([]);
  const [allCases, setAllCases] = useState({});
  // Local-only assignments, cleared on week change, saved to Firebase on "Save"
  const [assignments, setAssignments] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const db = getDatabase();

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const weekKey = toYMD(currentWeekStart);
  const weekEndDate = addDays(currentWeekStart, 6);
  const clinicLabel = `${toMDY(currentWeekStart)} – ${toMDY(weekEndDate)}`;

  // Pop ups: 
  const [isMeetingLinkOpen, setIsMeetingLinkOpen] = useState(false);
  const [contactCaseId, setContactCaseId] = useState(null);

  // Personnel
  const [allAttorneysArr, setAllAttorneysArr] = useState([]);
  const [allLegalStudentsArr, setAllLegalStudentsArr] = useState([]);

  // Column attorney selections (local, saved on Save)
  const [columnAttorneys, setColumnAttorneys] = useState({});
  // Last-saved slots for the current week, used to detect case removals on Save
  const savedAssignmentsRef = useRef({});

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

  // ── Load saved schedule for the current week ──────────────────────────────
  useEffect(() => {
    const unsubscribe = onValue(ref(db, `schedules/${weekKey}`), (snapshot) => {
      const weekData = snapshot.val();
      if (!weekData) {
        setAssignments({});
        setColumnAttorneys({});
        savedAssignmentsRef.current = {};
        return;
      }
      const slots = weekData.slots ?? {};
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
  }, [db, weekKey]);

  // ── Week navigation ───────────────────────────────────────────────────────
  function goToPrevWeek() { setCurrentWeekStart((prev) => addDays(prev, -7)); }
  function goToNextWeek() { setCurrentWeekStart((prev) => addDays(prev, 7)); }
  function goToWeek(dateStr) {
    if (!dateStr) return;
    setCurrentWeekStart(getWeekStart(new Date(dateStr)));
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
    const time = mockTimeSlots[slotIdx] ?? mockTimeSlots[0];

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

  // ── Interpreter selected in a slot: local only ───────────────────────────
  function handleInterpreterSelect(slotKey, interpreter) {
    if (!isEditMode) return;
    setAssignments((prev) => {
      const slot = prev[slotKey];
      if (!slot) return prev;
      return { ...prev, [slotKey]: { ...slot, interpreter } };
    });
  }

  // ── Save: write everything to Firebase ───────────────────────────────────
  async function handleSave() {
    // Capture the pre-save slots now — the live `onValue` listener on
    // `schedules/${weekKey}` echoes our own write back and will overwrite
    // savedAssignmentsRef.current as soon as the set() below resolves, so
    // reading the ref after the write would always show "new vs new".
    const prevSlots = savedAssignmentsRef.current;

    const payload = {
      slots: assignments,
      weekKey,
      savedAt: new Date().toISOString(),
    };

    console.log("Saving to Firebase path:", `schedules/${weekKey}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      // 1) Save full schedule (including column attorney selections)
      await set(ref(db, `schedules/${weekKey}`), payload);

      // 2) Write matched attorney + interpreter into each assigned case's record.
      // matchInfo holds the personnel UID (a stable reference, not a display value);
      // schedulingInfo carries name + email + phone, which is what EditForm's
      // Attorney / Legal Student sections actually display.
      const caseUpdates = {};
      const currentCaseIds = new Set();
      for (const [slotKey, slot] of Object.entries(assignments)) {
        if (slot?.client?.caseId) {
          currentCaseIds.add(slot.client.caseId);
          // Flip the case out of "waitlisted" so it stops showing up as
          // available in other weeks (and on the Cases waitlist tab) once
          // it's actually been placed on a schedule — prevents double-booking.
          caseUpdates[`cases/${slot.client.caseId}/status`] = "scheduled";
          // Persist the clinic date + time slot onto the case record itself,
          // so views like Attorney View can read a case's schedule directly
          // instead of scanning every week's schedules/ node.
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/date`] = weekKey;
          caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/timeSlot`] = slot.time ?? "";
          if (slot?.attorney) {
            caseUpdates[`cases/${slot.client.caseId}/matchInfo/attorney`] = slot.attorney.attorneyId ?? "";
            caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyName`] = slot.attorney.name ?? "";
            caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyEmail`] = slot.attorney.email ?? "";
            caseUpdates[`cases/${slot.client.caseId}/schedulingInfo/attorneyPhone`] = slot.attorney.phone ?? "";
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
      for (const slot of Object.values(assignments)) {
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

      if (Object.keys(caseUpdates).length > 0) {
        await update(ref(db), caseUpdates);
      }

      savedAssignmentsRef.current = assignments;

      console.log("Save successful!");
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to save schedule:", err);
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
        const time = mockTimeSlots[slot.slotIdx] ?? mockTimeSlots[0];

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

  // ── Cases already placed this week — hide from waitlist ───────────────────
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

  return (
    <>
      <NavBar active={"schedule"} />

      <DndContext sensors={sensors} onDragEnd={isEditMode ? handleDragEnd : () => { }}>
        <div className="schedule-page">
          {/* Left Panel */}
          <div className="schedule-panel">
            <div className="schedule-header">
              {/* Week Navigation */}
              <div className="schedule-date-nav">
                <button className="btn btn-sm schedule-nav-arrow" onClick={goToPrevWeek}>‹</button>
                <span className="schedule-clinic-label">{clinicLabel}</span>
                <button className="btn btn-sm schedule-nav-arrow" onClick={goToNextWeek}>›</button>
                <input
                  type="date"
                  className="schedule-date-jump-input"
                  onChange={(e) => goToWeek(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="schedule-action-buttons">
                {isEditMode && (<button
                  className="btn btn-sm schedule-action-btn schedule-action-btn-primary"
                  onClick={handleAutoMatch}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                  </svg>
                  Auto-match
                </button>)}

                {isEditMode ? (
                  <button
                    className="btn btn-sm schedule-action-btn schedule-action-btn-save"
                    onClick={handleSave}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4.207a2 2 0 0 0-.586-1.414l-2.793-2.793A2 2 0 0 0 11.207 1H2zm6 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm.5-9v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3h5.5z" />
                    </svg>
                    Save
                  </button>
                ) : (
                  <button
                    className="btn btn-sm schedule-action-btn schedule-action-btn-secondary"
                    onClick={() => setIsEditMode(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="schedule-grid">
              {colArray.map((colIdx) => (
                <AttorneyColumn
                  key={colIdx}
                  colIdx={colIdx}
                  savedAttorney={columnAttorneys[`col${colIdx}`] ?? null}
                  timeSlots={mockTimeSlots}
                  timeOptions={mockTimeSlots}
                  assignments={assignments}
                  onRemove={handleRemove}
                  isEditMode={isEditMode}
                  allAttorneysArr={allAttorneysArr}
                  allLegalStudentsArr={allLegalStudentsArr}
                  onAttorneySelect={(attorney) => handleAttorneySelect(colIdx, attorney)}
                  onInterpreterSelect={handleInterpreterSelect}
                  allCases={allCases}
                  onContactClick={setContactCaseId}
                />
              ))}
            </div>
          </div>

          {/* Right Panel: Waitlist */}
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
        </div>
      </DndContext>
    </>
  );
}

// ─── Attorney Column ──────────────────────────────────────────────────────────

function AttorneyColumn({ colIdx, savedAttorney, timeSlots, timeOptions, assignments, onRemove, isEditMode, allAttorneysArr, allLegalStudentsArr, onAttorneySelect, onInterpreterSelect, allCases, onContactClick }) {
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

  return (
    <div className="schedule-attorney-column">
      <div className="schedule-attorney-header">
        {isEditMode ? (
          <DatalistInput
            placeholder="Select attorney…"
            label=""
            onSelect={handleSelect}
            items={datalistItems}
            value={selectedAttorney?.value ?? selectedAttorney?.name ?? ""}
          />
        ) : (
          <div className="schedule-attorney-display">
            <div
              className="schedule-attorney-display-name"
              title={selectedAttorney?.value ?? selectedAttorney?.name ?? "No Attorney Assigned"}
            >
              {selectedAttorney?.value ?? selectedAttorney?.name ?? "No Attorney Assigned"}
            </div>
            <div className="schedule-attorney-display-details">
              {selectedAttorney
                ? `${selectedAttorney.specialty || "No Category"} | ${selectedAttorney.language || "No Language"}`
                : "\u00A0"}
            </div>
          </div>
        )}
      </div>

      {timeSlots.map((time, slotIdx) => {
        const slotKey = `${colIdx}-${slotIdx}`;
        return (
          <TimeSlotCard
            key={slotKey}
            slotKey={slotKey}
            time={time}
            timeOptions={timeOptions}
            assignedSlot={assignments[slotKey] ?? null}
            onRemove={onRemove}
            isEditMode={isEditMode}
            hasAttorney={!!selectedAttorney}
            allAttorneysArr={allAttorneysArr}
            allLegalStudentsArr={allLegalStudentsArr}
            onInterpreterSelect={onInterpreterSelect}
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
function TimeSlotCard({ slotKey, time, timeOptions, assignedSlot, onRemove, isEditMode, hasAttorney, allAttorneysArr, allLegalStudentsArr, onInterpreterSelect, allCases, onContactClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotKey, disabled: !hasAttorney });
  const [selectedTime, setSelectedTime] = useState(time);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [isMeetingLinkOpen, setIsMeetingLinkOpen] = useState(false);

  const assignedClient = assignedSlot?.client ?? null;
  const assignedAttorney = assignedSlot?.attorney ?? null;

  const liveCase = assignedClient?.caseId ? allCases[assignedClient.caseId] : null;
  const fname = liveCase?.clientInfo?.fname ?? assignedClient?.fname ?? "Unknown";
  const lname = liveCase?.clientInfo?.lname ?? assignedClient?.lname ?? "Client";
  const categoryRaw = liveCase?.caseInfo?.category || assignedClient?.category;
  const category = (!categoryRaw || categoryRaw === "—") ? "No Category" : categoryRaw;
  const languageRaw = liveCase?.clientInfo?.primaryLanguage || assignedClient?.language;
  const language = (!languageRaw || languageRaw === "—") ? "No Language" : languageRaw;

  function handleSelectTime(nextTime) {
    setSelectedTime(nextTime);
    setIsTimeMenuOpen(false);
  }

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
          (!hasAttorney && isEditMode && !assignedClient ? " schedule-time-slot-card--locked" : "")
        }
      >
        <div className="schedule-slot-header">
          <span>{selectedTime}</span>
          {isEditMode && (
            <button
              type="button"
              className="schedule-slot-time-toggle"
              aria-label="Change time"
              aria-expanded={isTimeMenuOpen}
              onClick={() => setIsTimeMenuOpen((o) => !o)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
              </svg>
            </button>
          )}
          {isTimeMenuOpen && isEditMode && (
            <div className="schedule-slot-time-menu">
              {timeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`schedule-slot-time-option${option === selectedTime ? " schedule-slot-time-option--active" : ""}`}
                  onClick={() => handleSelectTime(option)}
                >
                  {option}
                </button>
              ))}
            </div>
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
            {!hasAttorney && isEditMode && (
              <span className="schedule-slot-locked-hint">Assign an attorney first</span>
            )}
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