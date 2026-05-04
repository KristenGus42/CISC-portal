
/**
 * CasePreview — a narrow slide-in panel that shows a summary of one case.
 *
 * Props:
 *   caseData  {object}  – full case object from Firebase (or mock_data/cases.js shape)
 *   onClose   {fn}      – called when the user clicks the ✕ button
 *   onExpand  {fn}      – optional, called when the user clicks the expand ↗ icon
 */

import { useState } from "react";

// ─── Helper: status colour ─────────────────────────────────────────────────────

function statusColor(status) {
  if (status === "scheduled") return "var(--success)";
  if (status === "completed") return "var(--dark-gray)";
  return "var(--pending)"; // waitlisted / default
}

// ─── Icons (inline SVG) ────────────────────────────────────────────────────────

function IconEmail() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511Z"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
  );
}

function IconExpand() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707z"/>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
      <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
    </svg>
  );
}

// ─── Small floating-label read-only field ──────────────────────────────────────

function ReadField({ label, value, style = {} }) {
  return (
    <div className="cp-read-field" style={style}>
      <span className="cp-read-field-label">{label}</span>
      <span className="cp-read-field-value">{value || "—"}</span>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ clientInfo = {}, caseInfo = {} }) {
  return (
    <div className="cp-tab-body">
      {/* Small fields row */}
      <div className="cp-fields-row">
        <ReadField label="Sex *" value={clientInfo.sex} />
        <ReadField label="Household Size *" value={clientInfo.householdSize} />
        <ReadField label="Age *" value={clientInfo.age} />
      </div>

      {/* Brief description */}
      <div className="cp-textarea-field">
        <span className="cp-textarea-label">Brief description of issues</span>
        <p className="cp-textarea-text">{caseInfo.briefDescription || "No description provided."}</p>
      </div>

      {/* Remarks */}
      <div className="cp-textarea-field">
        <span className="cp-textarea-label">Remarks</span>
        <p className="cp-textarea-text">{caseInfo.remarks || ""}</p>
      </div>
    </div>
  );
}

// ─── Document Tab (placeholder) ────────────────────────────────────────────────

function DocumentTab() {
  return (
    <div className="cp-tab-body">
      <p className="text-muted small text-center mt-4">No documents attached.</p>
    </div>
  );
}

// ─── Main CasePreview component ────────────────────────────────────────────────

export default function CasePreview({ caseData, onClose, onExpand }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!caseData) return null;

  const { clientInfo = {}, caseInfo = {}, matchInfo = {}, status } = caseData;
  const fullName = `${clientInfo.fname || ""} ${clientInfo.lname || ""}`.trim() || "Unknown Client";
  const subtitle = [caseInfo.category, clientInfo.primaryLanguage].filter(Boolean).join(" | ");

  // Derive assignment display values
  const attorneyLabel  = matchInfo.attorney    || "Unassigned";
  const studentLabel   = matchInfo.legalStudent || "Unassigned";
  const interpreterLabel = matchInfo.interpreter || "CISC Staff";

  const attorneyAssigned  = !!matchInfo.attorney;
  const studentAssigned   = !!matchInfo.legalStudent && matchInfo.legalStudent !== "None";

  return (
    <div className="cp-panel">
      {/* ── Top icon row ── */}
      <div className="cp-icon-row">
        <button className="cp-icon-btn" onClick={onClose} title="Close" id="cp-close-btn">
          <IconClose />
        </button>
        {onExpand && (
          <button className="cp-icon-btn" onClick={onExpand} title="Expand" id="cp-expand-btn">
            <IconExpand />
          </button>
        )}
      </div>

      {/* ── Client name & subtitle ── */}
      <div className="cp-identity">
        <div className="cp-name-row">
          <span
            className="cp-status-dot"
            style={{ backgroundColor: statusColor(status) }}
            title={status}
          />
          <h2 className="cp-name">{fullName}</h2>
        </div>
        {subtitle && <p className="cp-subtitle">{subtitle}</p>}
      </div>

      {/* ── Contact chips ── */}
      <div className="cp-contact-row">
        {clientInfo.email && (
          <span className="cp-contact-chip">
            <IconEmail />
            {clientInfo.email}
          </span>
        )}
        {clientInfo.phone && (
          <span className="cp-contact-chip">
            <IconPhone />
            {clientInfo.phone}
          </span>
        )}
      </div>

      {/* ── Assignment pills ── */}
      <div className="cp-assignments">
        <div className="cp-assignment-slot">
          <span className="cp-assignment-role">Attorney</span>
          <button
            className={`cp-assignment-pill${attorneyAssigned ? " cp-assignment-pill--filled" : ""}`}
            id="cp-attorney-pill"
          >
            {attorneyLabel}
          </button>
        </div>

        <div className="cp-assignment-slot">
          <span className="cp-assignment-role">Legal Student</span>
          <button
            className={`cp-assignment-pill${studentAssigned ? " cp-assignment-pill--filled" : ""}`}
            id="cp-student-pill"
          >
            {studentLabel}
          </button>
        </div>

        <div className="cp-assignment-slot">
          <span className="cp-assignment-role">Interpreter</span>
          <button className="cp-assignment-pill cp-assignment-pill--dropdown" id="cp-interpreter-pill">
            {/* small translate icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
              <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z"/>
              <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14v-.868h-3v-.002c-.018 0-.035.002-.053.003H9.529l-.001-.001H7v.867h1.604c-.316.764-.78 1.63-1.362 2.404z"/>
            </svg>
            {interpreterLabel}
            <IconChevronDown />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="cp-tabs">
        <button
          className={`cp-tab-btn${activeTab === "overview" ? " cp-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("overview")}
          id="cp-tab-overview"
        >
          Overview
        </button>
        <button
          className={`cp-tab-btn${activeTab === "document" ? " cp-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("document")}
          id="cp-tab-document"
        >
          Document
        </button>
      </div>

      {/* ── Tab body ── */}
      {activeTab === "overview"
        ? <OverviewTab clientInfo={clientInfo} caseInfo={caseInfo} />
        : <DocumentTab />
      }
    </div>
  );
}
