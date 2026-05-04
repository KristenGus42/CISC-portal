import { NavBar } from "./NavBar";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { getDatabase, ref, onValue } from "firebase/database";
import { DndContext, useDroppable, useDraggable, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import CasePreview from "./CasePreview";

// Mock attorney columns
const mockAttorneys = [
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
];

const mockTimeSlots = ["5:30pm", "6:30pm", "7:30pm"];

export default function Schedule() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [waitlistCases, setWaitlistCases] = useState([]);
  // assignments: { [slotKey]: caseObj }  — local state only, resets on refresh
  const [assignments, setAssignments] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null); // CasePreview state
  const clinicLabel = "2/7 Legal Clinic";
  const db = getDatabase();

  // Require 8px of pointer movement before a drag starts.
  // This lets plain clicks fire onClick without being swallowed by dnd-kit.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Listen for real-time changes in the 'cases' table, filter to waitlisted
  useEffect(() => {
    const casesRef = ref(db, "cases");

    const unsubscribe = onValue(casesRef, (snapshot) => {
      const casesObj = snapshot.val();

      if (casesObj === null) {
        setWaitlistCases([]);
        return;
      }

      // Convert the Firebase object into an array, include the Firebase push key as id
      const allCases = Object.keys(casesObj).map((key) => ({
        ...casesObj[key],
        id: key,
      }));

      // Filter to only waitlisted cases
      setWaitlistCases(allCases.filter((c) => c.status === "waitlisted"));
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [db]);

  // Set of Firebase keys currently assigned to a slot — hidden from waitlist
  const assignedIds = new Set(Object.values(assignments).map((c) => c.id));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;                      // dropped on nothing
    if (assignments[over.id]) return;       // slot is already occupied
    const caseObj = waitlistCases.find((c) => c.id === active.id);
    if (!caseObj) return;
    setAssignments((prev) => ({ ...prev, [over.id]: caseObj }));
    setIsEditMode(true);                    // enter edit mode after dropping
  }

  function handleRemove(slotKey) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  const filteredWaitlist = waitlistCases
    .filter((c) => !assignedIds.has(c.id))
    .filter((c) => {
      const fullName = `${c.clientInfo?.fname ?? ""} ${c.clientInfo?.lname ?? ""}`.toLowerCase();
      const caseId = c.id.toLowerCase();
      return (
        searchQuery === "" ||
        fullName.includes(searchQuery.toLowerCase()) ||
        caseId.includes(searchQuery.toLowerCase())
      );
  });

  const attorneyColumns = mockAttorneys.map((attorney, colIdx) => (
    <AttorneyColumn
      key={colIdx}
      colIdx={colIdx}
      name={attorney.name}
      specialty={attorney.specialty}
      language={attorney.language}
      timeSlots={mockTimeSlots}
      assignments={assignments}
      onRemove={handleRemove}
      isEditMode={isEditMode}
    />
  ));

  const waitlistCards = filteredWaitlist.map((c) => (
    <WaitlistCard
      key={c.id}
      firebaseKey={c.id}
      // Last 5 characters of unique firebase-generated id for display
      id={c.id.slice(c.id.length - 5)}
      fname={c.clientInfo?.fname}
      lname={c.clientInfo?.lname}
      category={c.caseInfo?.category}
      language={c.clientInfo?.primaryLanguage}
      date={c.schedulingInfo?.date}
      onPreview={() => setSelectedCase(c)}
    />
  ));

  return (
    <>
      <NavBar active={"schedule"} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="schedule-page">
          {/* Left Panel: Schedule */}
          <div className="schedule-panel">
            {/* Header Row */}
            <div className="schedule-header">
              {/* Date Navigation */}
              <div className="schedule-date-nav">
                <button className="btn btn-sm schedule-nav-arrow">‹</button>
                <span className="schedule-clinic-label">{clinicLabel}</span>
                <button className="btn btn-sm schedule-nav-arrow">›</button>
              </div>

              {/* Action Buttons */}
              <div className="schedule-action-buttons">
                <button className="btn btn-sm schedule-action-btn schedule-action-btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                  </svg>
                  Auto-match
                </button>
                {isEditMode ? (
                  <button 
                    className="btn btn-sm schedule-action-btn schedule-action-btn-save"
                    onClick={() => setIsEditMode(false)}
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
              {attorneyColumns}
            </div>
          </div>

          {/* Right Panel: Waitlist — always visible */}
          <div className="schedule-waitlist-panel">
            <h5 className="schedule-waitlist-title">Waitlist</h5>

            {/* Search Bar */}
            <div className="schedule-search-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                className="schedule-search-icon"
              >
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

            {/* Legend */}
            <div className="schedule-legend">
              <span className="schedule-legend-item">
                <span className="schedule-legend-dot schedule-legend-dot-old" />
                Old
              </span>
              <span className="schedule-legend-item">
                <span className="schedule-legend-dot schedule-legend-dot-medium" />
                Medium
              </span>
              <span className="schedule-legend-item">
                <span className="schedule-legend-dot schedule-legend-dot-new" />
                New
              </span>
            </div>

            {/* Waitlist Cards */}
            <div className="schedule-waitlist-cards">
              {filteredWaitlist.length > 0
                ? waitlistCards
                : <p className="text-muted small text-center mt-2">No waitlisted cases.</p>
              }
            </div>
          </div>

          {/* Case Preview — absolute overlay, does not affect layout */}
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

// ─── Attorney Column ────────────────────────────────────────────────────────

function AttorneyColumn({ colIdx, name, specialty, language, timeSlots, assignments, onRemove, isEditMode }) {
  const slotCards = timeSlots.map((time, slotIdx) => {
    const slotKey = `${colIdx}-${slotIdx}`;
    return (
      <TimeSlotCard
        key={slotKey}
        slotKey={slotKey}
        time={time}
        assignedCase={assignments[slotKey] || null}
        onRemove={onRemove}
        isEditMode={isEditMode}
      />
    );
  });

  return (
    <div className="schedule-attorney-column">
      {/* Attorney Header */}
      <div className="schedule-attorney-header">
        <p className="schedule-attorney-name">{name}</p>
        <p className="schedule-attorney-details">
          {specialty} | {language}
        </p>
      </div>

      {/* Time Slot Cards */}
      {slotCards}
    </div>
  );
}

// ─── Time Slot Card (Droppable) ──────────────────────────────────────────────

function TimeSlotCard({ slotKey, time, assignedCase, onRemove, isEditMode }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotKey });

  return (
    <div className="schedule-slot-card-outer">
      {/* If in edit mode, rendering this gutter pushes the card slightly to the right */}
      {isEditMode && assignedCase && (
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
          (isOver && !assignedCase ? " schedule-time-slot-card--over" : "")
        }
      >
        {/* Always-visible time header */}
        <div className="schedule-slot-header">
          <span>{time}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
        </svg>
      </div>

      {/* Filled view */}
      {assignedCase ? (
        <div className="schedule-slot-body--filled">
          <div className="schedule-slot-content">
            {/* Status dot + name + details */}
            <div className="schedule-slot-client-row">
              <span className="schedule-slot-dot" />
              <div>
                <div className="schedule-slot-client-name">
                  {assignedCase.clientInfo?.fname || "Unknown"}{" "}
                  {assignedCase.clientInfo?.lname || "Client"}
                </div>
                <div className="schedule-slot-client-details">
                  {assignedCase.caseInfo?.category || "—"} |{" "}
                  {assignedCase.clientInfo?.primaryLanguage || "—"}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="schedule-slot-actions">
              {/* Assign — full-width split button with translate icon */}
              <div className="schedule-slot-assign-wrapper schedule-slot-assign-full">
                <button className="schedule-slot-btn schedule-slot-btn-assign">
                  {/* Translate / language icon */}
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

              {/* Meeting link + Contact side by side */}
              <div className="schedule-slot-bottom-row">
                <button className="schedule-slot-btn schedule-slot-btn-meeting">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z" />
                  </svg>
                  Meeting link
                </button>
                <button className="schedule-slot-btn schedule-slot-btn-contact">
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
        /* Empty drop zone */
        <div className="schedule-slot-body" />
      )}
      </div>
    </div>
  );
}

// ─── Waitlist Card (Draggable) ───────────────────────────────────────────────

function WaitlistCard({ firebaseKey, id, fname, lname, category, language, date, onPreview }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: firebaseKey,
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
      {...listeners}
      {...attributes}
      className={`schedule-waitlist-card${isDragging ? " schedule-waitlist-card--dragging" : ""}`}
      onClick={onPreview}
    >
      <div className="schedule-waitlist-card-content">
        {/* Name + Badge + Date row */}
        <div className="schedule-card-header-row">
          <div className="schedule-card-name-section">
            <span className="schedule-client-name">
              {fname || "Unknown"} {lname || "Client"}
            </span>
            <span className="schedule-case-badge">{id}</span>
          </div>
          <span className="schedule-card-date">{date || "No Date"}</span>
        </div>

        {/* Category + Language */}
        <p className="schedule-card-details">
          {category} | {language}
        </p>

        {/* Contact Button */}
        <div className="d-flex justify-content-end mt-1">
          <button 
            className="btn btn-sm schedule-contact-btn" 
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening preview when clicking contact
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
