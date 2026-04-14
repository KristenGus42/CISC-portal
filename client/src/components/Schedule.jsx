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

  return (
    <>
      <NavBar active={"schedule"} />

      {/* Page Body: two-panel layout */}
      <div className="d-flex" style={{ height: "calc(100vh - 62px)", overflow: "hidden" }}>

        {/* ── Left Panel: Schedule ── */}
        <div className="d-flex flex-column flex-grow-1 p-3" style={{ overflow: "auto" }}>

          {/* Header Row: date nav + action buttons */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            {/* Date Navigation */}
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm"
                style={{ color: "var(--dark-gray)", fontSize: "1.1rem", lineHeight: 1 }}
              >
                ‹
              </button>
              <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--primary-text)" }}>
                {clinicLabel}
              </span>
              <button
                className="btn btn-sm"
                style={{ color: "var(--dark-gray)", fontSize: "1.1rem", lineHeight: 1 }}
              >
                ›
              </button>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  backgroundColor: "var(--call-to-action)",
                  color: "var(--background)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  padding: "0.4rem 0.85rem",
                }}
              >
                {/* Calendar icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
                Auto-match
              </button>
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  backgroundColor: "var(--primary-text)",
                  color: "var(--background)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  padding: "0.4rem 0.85rem",
                }}
              >
                {/* Pencil icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                Edit
              </button>
            </div>
          </div>

          {/* Schedule Grid Container */}
          <div
            id="schedule-container"
            className="d-flex gap-3 p-3 rounded"
            style={{ flex: 1 }}
          >
            {mockAttorneys.map((attorney, colIdx) => (
              <div
                key={colIdx}
                className="position-slot d-flex flex-column gap-3"
                style={{ flex: 1 }}
              >
                {/* Attorney Header */}
                <div id={`attorney-section`} className="mb-1">
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--primary-text)", marginBottom: "2px" }}>
                    {attorney.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--dark-gray)" }}>
                    {attorney.specialty} | {attorney.language}
                  </p>
                </div>

                {/* Time Slot Cards */}
                {mockTimeSlots.map((time, slotIdx) => (
                  <div
                    key={slotIdx}
                    style={{
                      border: "1.5px dashed var(--neutral-gray)",
                      borderRadius: "8px",
                      overflow: "hidden",
                      backgroundColor: "var(--background)",
                    }}
                  >
                    {/* Slot Header */}
                    <div
                      className="d-flex align-items-center justify-content-between px-2 py-1"
                      style={{
                        backgroundColor: "var(--call-to-action)",
                        color: "var(--background)",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      <span>{time}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                      </svg>
                    </div>
                    {/* Empty slot body */}
                    <div style={{ height: "80px" }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel: Waitlist ── */}
        <div
          className="d-flex flex-column p-3"
          style={{
            width: "300px",
            minWidth: "280px",
            height: "100%",
            overflow: "hidden",
            backgroundColor: "var(--background)",
          }}
        >
          <h5 style={{ fontWeight: 700, color: "var(--primary-text)", marginBottom: "0.75rem", flexShrink: 0 }}>
            Waitlist
          </h5>

          {/* Search Bar */}
          <div className="position-relative mb-3" style={{ flexShrink: 0 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14" height="14"
              fill="var(--dark-gray)"
              viewBox="0 0 16 16"
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by Name or Case ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: "28px",
                borderRadius: "20px",
                border: "1px solid var(--neutral-gray)",
                fontSize: "0.8rem",
              }}
            />
          </div>

          {/* Legend */}
          <div className="d-flex align-items-center gap-3 mb-3" style={{ fontSize: "0.8rem", flexShrink: 0 }}>
            <span className="d-flex align-items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--error)", display: "inline-block" }} />
              Old
            </span>
            <span className="d-flex align-items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--pending)", display: "inline-block" }} />
              Medium
            </span>
            <span className="d-flex align-items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--success)", display: "inline-block" }} />
              New
            </span>
          </div>

          {/* Waitlist Cards (scrollable) */}
          <div className="d-flex flex-column gap-2" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            {filteredWaitlist.map((c, idx) => (
              <div
                key={idx}
                className="d-flex"
                style={{
                  flexShrink: 0,
                  borderLeft: "4px solid var(--error)",
                  borderRadius: "4px",
                  backgroundColor: "var(--background)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <div className="p-2 flex-grow-1">
                  {/* Name + Badge + Date row */}
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        {c.clientInfo.fname} {c.clientInfo.lname}
                      </span>
                      <span
                        style={{
                          backgroundColor: "var(--primary-text)",
                          color: "var(--background)",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          padding: "1px 5px",
                          fontWeight: 600,
                        }}
                      >
                        A00{c.id}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--dark-gray)" }}>
                      February 1, 2026
                    </span>
                  </div>
                  {/* Category + Language */}
                  <p style={{ fontSize: "0.78rem", color: "var(--dark-gray)", margin: "0 0 6px 0" }}>
                    {c.caseInfo.category} | {c.clientInfo.primaryLanguage}
                  </p>
                  {/* Contact Button */}
                  <button
                    className="btn btn-sm d-flex align-items-center gap-1"
                    style={{
                      border: "1px solid var(--neutral-gray)",
                      backgroundColor: "var(--background)",
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      padding: "2px 10px",
                      color: "var(--primary-text)",
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                      <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                    </svg>
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
