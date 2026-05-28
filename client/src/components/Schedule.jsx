// Datalist input: https://github.com/andrelandgraf/react-datalist-input/tree/main?tab=readme-ov-file
import { NavBar } from "./NavBar";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { DndContext, useDroppable, useDraggable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import CasePreview from "./CasePreview";

import DatalistInput from 'react-datalist-input';
import 'react-datalist-input/dist/styles.css';

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
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Personnel
  const [allAttorneysArr, setAllAttorneysArr] = useState([]);
  const [allLegalStudentsArr, setAllLegalStudentsArr] = useState([]);

  // Column attorney selections (local, saved on Save)
  const [columnAttorneys, setColumnAttorneys] = useState({});

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
      const obj = snapshot.val();
      if (!obj) { setWaitlistCases([]); return; }
      const allCases = Object.keys(obj).map((key) => ({ ...obj[key], id: key }));
      setWaitlistCases(allCases.filter((c) => c.status === "waitlisted"));
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
        return;
      }
      setAssignments(weekData.slots ?? {});
      setColumnAttorneys(weekData.columns ?? {});
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
    const slotIdx = parseInt(slotIdxStr, 10);
    const time = mockTimeSlots[slotIdx] ?? mockTimeSlots[0];

    const slotPayload = {
      time,
      client: {
        caseId:   caseObj.id,
        fname:    caseObj.clientInfo?.fname    ?? "",
        lname:    caseObj.clientInfo?.lname    ?? "",
        category: caseObj.caseInfo?.category   ?? "",
        language: caseObj.clientInfo?.primaryLanguage ?? "",
        phone:    caseObj.clientInfo?.phone    ?? "",
        email:    caseObj.clientInfo?.email    ?? "",
      },
      attorney: columnAttorneys[`col${colIdxStr}`] ?? null,
    };

    setAssignments((prev) => ({ ...prev, [over.id]: slotPayload }));
  }

  // ── Remove a slot: local only ─────────────────────────────────────────────
  function handleRemove(slotKey) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  // ── Attorney selected in a column: local only ─────────────────────────────
  function handleAttorneySelect(colIdx, attorney) {
    const colKey = `col${colIdx}`;
    const attorneyPayload = {
      attorneyId: attorney.id,
      name:       attorney.value ?? attorney.name ?? "",
      specialty:  attorney.specialty ?? "",
      language:   attorney.language ?? attorney.primaryLanguage ?? "",
    };
    setColumnAttorneys((prev) => ({ ...prev, [colKey]: attorneyPayload }));
  }

  // ── Save: write everything to Firebase ───────────────────────────────────
  async function handleSave() {
    const payload = {
      slots:   assignments,
      weekKey,
      savedAt: new Date().toISOString(),
    };

    console.log("Saving to Firebase path:", `schedules/${weekKey}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      await set(ref(db, `schedules/${weekKey}`), payload);
      console.log("Save successful!");
      setIsEditMode(false);
    } catch (err) {
      console.error("Failed to save schedule:", err);
    }
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

      <DndContext sensors={sensors} onDragEnd={isEditMode ? handleDragEnd : () => {}}>
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
                {isEditMode && (
                  <button className="btn btn-sm schedule-action-btn schedule-action-btn-primary">
                    Auto-match
                  </button>
                )}

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
                  onAttorneySelect={(attorney) => handleAttorneySelect(colIdx, attorney)}
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
        </div>
      </DndContext>
    </>
  );
}

// ─── Attorney Column ──────────────────────────────────────────────────────────

function AttorneyColumn({ colIdx, savedAttorney, timeSlots, timeOptions, assignments, onRemove, isEditMode, allAttorneysArr, onAttorneySelect }) {
  const [selectedAttorney, setSelectedAttorney] = useState(null);

  // Populate from Firebase-loaded saved attorney
  useEffect(() => {
    if (savedAttorney?.name) {
      setSelectedAttorney(savedAttorney);
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
        <DatalistInput
          placeholder="Select attorney…"
          label=""
          onSelect={handleSelect}
          items={datalistItems}
          value={selectedAttorney?.value ?? selectedAttorney?.name ?? ""}
          disabled={!isEditMode}
        />
        {selectedAttorney && (
          <div className="schedule-attorney-meta">
            <span className="schedule-attorney-specialty">{selectedAttorney.specialty ?? "—"}</span>
            <span className="schedule-attorney-language">{selectedAttorney.language ?? selectedAttorney.primaryLanguage ?? "—"}</span>
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
          />
        );
      })}
    </div>
  );
}

// ─── Time Slot Card (Droppable) ───────────────────────────────────────────────

// ─── Time Slot Card (Droppable) ───────────────────────────────────────────────
function TimeSlotCard({ slotKey, time, timeOptions, assignedSlot, onRemove, isEditMode }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotKey });
  const [selectedTime, setSelectedTime] = useState(time);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [isMeetingLinkOpen, setIsMeetingLinkOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const assignedClient = assignedSlot?.client ?? null;
  const assignedAttorney = assignedSlot?.attorney ?? null;

  function handleSelectTime(nextTime) {
    setSelectedTime(nextTime);
    setIsTimeMenuOpen(false);
  }

  function handleMeetingLink() {
    setIsMeetingLinkOpen(true);
  }

  function handleContact() {
    setIsContactOpen(true);
  }

  return (
    
    <div className="schedule-slot-card-outer">
      {isMeetingLinkOpen && (
        <MeetingPopUp onClose={() => setIsMeetingLinkOpen(false)} />
      )}
      {isContactOpen && (
        <ContactPopUp
          client={assignedClient}
          onClose={() => setIsContactOpen(false)}
        />
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
          (isOver && !assignedClient && isEditMode ? " schedule-time-slot-card--over" : "")
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
                    {assignedClient.fname || "Unknown"} {assignedClient.lname || "Client"}
                  </div>
                  <div className="schedule-slot-client-details">
                    {assignedClient.category || "—"} | {assignedClient.language || "—"}
                  </div>
                  {assignedAttorney && (
                    <div className="schedule-slot-attorney-details">{assignedAttorney.name}</div>
                  )}
                </div>
              </div>

              <div className="schedule-slot-actions">
                <div className="schedule-slot-assign-wrapper schedule-slot-assign-full">
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
          <div className="schedule-slot-body" />
        )}
      </div>
    </div>
  );
}

// ─── Waitlist Card (Draggable) ────────────────────────────────────────────────

function WaitlistCard({ firebaseKey, id, fname, lname, category, language, date, onPreview, isDraggable }) {
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
          {category} | {language}
        </p>

        <div className="d-flex justify-content-end mt-1">
          <button
            className="btn btn-sm schedule-contact-btn"
            onClick={(e) => {
              e.stopPropagation();
              // Future contact logic here
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
function ContactPopUp({ client, onClose }) {
  const [phone, setPhone] = useState(client?.phone || "");
  const [email, setEmail] = useState(client?.email || "");

  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onClose} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onClose}>✕</button>
        <h6 className="schedule-modal-title">Contact</h6>
        {client ? (
          <div className="schedule-modal-contact-info">
            <p className="mb-2"><strong>{client.fname} {client.lname}</strong></p>
            <div className="mb-2">
              <label className="form-label small mb-1">Phone</label>
              <input
                type="tel"
                className="form-control form-control-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label small mb-1">Email</label>
              <input
                type="email"
                className="form-control form-control-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <p className="text-muted small">No contact info available.</p>
        )}
      </div>
    </>
  );
}