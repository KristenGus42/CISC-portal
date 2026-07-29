
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

function formatPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
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

// ─── Small floating-label read-only field ──────────────────────────────────────

function ReadField({ label, value, style = {} }) {
  const isRequired = label.includes("*");
  const labelText = label.replace("*", "").trim();

  return (
    <div className="cp-read-field" style={style}>
      <span className="cp-read-field-label">
        {labelText}
        {isRequired && <span className="cp-required-mark"> *</span>}
      </span>
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
        <ReadField label="Sex" value={clientInfo.sex} />
        <ReadField label="Age" value={clientInfo.age} />
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

  const { clientInfo = {}, caseInfo = {}, status } = caseData;
  const fullName = `${clientInfo.fname || ""} ${clientInfo.lname || ""}`.trim() || "Unknown Client";
  const subtitle = [caseInfo.category, clientInfo.primaryLanguage].filter(Boolean).join(" | ");

  return (
    <div className="cp-panel">
      {/* ── Top icon row ── */}
      <div className="cp-icon-row">
        <button className="cp-icon-btn" onClick={onClose} title="Close" id="cp-close-btn">
          <IconClose />
        </button>
        <button
          className="cp-icon-btn"
          onClick={onExpand}
          title="Expand"
          id="cp-expand-btn"
          type="button"
        >
          <IconExpand />
        </button>
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
            {formatPhone(clientInfo.phone)}
          </span>
        )}
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
