import { NavBar } from "./NavBar";
import { useState } from "react";
import { cases } from "../mock_data/cases";

// Mock attorney columns
const mockAttorneys = [
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
  { name: "Dr. John Lewis", specialty: "Divorce & Family Law", language: "English" },
];

const mockTimeSlots = ["5:30pm", "5:30pm", "5:30pm"];

// Waitlist = cases with "waitlisted" status, padded to look like mockup
const waitlistCases = [
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
  ...cases.filter((c) => c.status === "waitlisted"),
];

export default function Schedule() {
  const [searchQuery, setSearchQuery] = useState("");
  const clinicLabel = "2/7 Legal Clinic";

  const filteredWaitlist = waitlistCases.filter((c) => {
    const fullName = `${c.clientInfo.fname} ${c.clientInfo.lname}`.toLowerCase();
    const caseId = `A00${c.id}`.toLowerCase();
    return (
      searchQuery === "" ||
      fullName.includes(searchQuery.toLowerCase()) ||
      caseId.includes(searchQuery.toLowerCase())
    );
  });

  const attorneyColumns = mockAttorneys.map((attorney, colIdx) => (
    <AttorneyColumn
      key={colIdx}
      name={attorney.name}
      specialty={attorney.specialty}
      language={attorney.language}
      timeSlots={mockTimeSlots}
    />
  ));

  const waitlistCards = filteredWaitlist.map((c, idx) => (
    <WaitlistCard
      key={idx}
      id={c.id}
      fname={c.clientInfo.fname}
      lname={c.clientInfo.lname}
      category={c.caseInfo.category}
      language={c.clientInfo.primaryLanguage}
    />
  ));

  return (
    <>
      <NavBar active={"schedule"} />
      
      <div className="schedule-page">
        {/* Left Panel: Schedule */}
        <div className="schedule-panel">
          {/* Header Row */}
          <div className="schedule-header">
            {/* Date Navigation */}
            <div className="date-nav">
              <button className="btn btn-sm nav-arrow">‹</button>
              <span className="clinic-label">{clinicLabel}</span>
              <button className="btn btn-sm nav-arrow">›</button>
            </div>
            
            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn btn-sm action-btn action-btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
                Auto-match
              </button>
              <button className="btn btn-sm action-btn action-btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                Edit
              </button>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="schedule-grid">
            {attorneyColumns}
          </div>
        </div>

        {/* Right Panel: Waitlist */}
        <div className="waitlist-panel">
          <h5 className="waitlist-title">Waitlist</h5>

          {/* Search Bar */}
          <div className="search-container">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14" 
              height="14"
              fill="var(--dark-gray)"
              viewBox="0 0 16 16"
              className="search-icon"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input
              type="text"
              className="form-control form-control-sm search-input"
              placeholder="Search by Name or Case ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Legend */}
          <div className="legend">
            <span className="legend-item">
              <span className="legend-dot legend-dot-old" />
              Old
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot-medium" />
              Medium
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot-new" />
              New
            </span>
          </div>

          {/* Waitlist Cards */}
          <div className="waitlist-cards">
            {waitlistCards}
          </div>
        </div>
      </div>
    </>
  );
}

function AttorneyColumn({ name, specialty, language, timeSlots }) {
  const slotCards = timeSlots.map((time, slotIdx) => (
    <TimeSlotCard key={slotIdx} time={time} />
  ));

  return (
    <div className="attorney-column">
      {/* Attorney Header */}
      <div className="attorney-header">
        <p className="attorney-name">{name}</p>
        <p className="attorney-details">
          {specialty} | {language}
        </p>
      </div>

      {/* Time Slot Cards */}
      {slotCards}
    </div>
  );
}

function TimeSlotCard({ time }) {
  return (
    <div className="time-slot-card">
      <div className="slot-header">
        <span>{time}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      </div>
      <div className="slot-body" />
    </div>
  );
}

function WaitlistCard({ id, fname, lname, category, language }) {
  return (
    <div className="waitlist-card">
      <div className="waitlist-card-content">
        {/* Name + Badge + Date row */}
        <div className="card-header-row">
          <div className="card-name-section">
            <span className="client-name">
              {fname} {lname}
            </span>
            <span className="case-badge">A00{id}</span>
          </div>
          <span className="card-date">February 1, 2026</span>
        </div>

        {/* Category + Language */}
        <p className="card-details">
          {category} | {language}
        </p>

        {/* Contact Button */}
        <button className="btn btn-sm contact-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
            <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
          </svg>
          Contact
        </button>
      </div>
    </div>
  );
}