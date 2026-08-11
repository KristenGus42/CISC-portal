import { NavBar } from "./NavBar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuth } from "../auth/useAuth";

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ordinal(day) {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatDateHeading(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${month} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTranslate() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286H4.545zm1.634-.736L5.5 3.956h-.049l-.679 2.022H6.18z" />
      <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm7.138 9.995c.193.301.402.583.63.846-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14v-.868h-3v-.002c-.018 0-.035.002-.053.003H9.529l-.001-.001H7v.867h1.604c-.316.764-.78 1.63-1.362 2.404z" />
    </svg>
  );
}

function IconMortarboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .017.912l7.5 3a.5.5 0 0 0 .388 0l7.5-3a.5.5 0 0 0 .022-.912l-7.5-3.5Z" />
      <path d="M4 10.176V13.5a.5.5 0 0 0 .276.447l3.5 1.75a.5.5 0 0 0 .448 0l3.5-1.75A.5.5 0 0 0 12 13.5v-3.324l-3.402 1.36a1.5 1.5 0 0 1-1.196 0L4 10.176Z" />
      <path d="M14.5 8.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 1 0Z" />
    </svg>
  );
}

function IconMeeting() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
}

// ─── Meeting Details Popup ─────────────────────────────────────────────────────
// Read-only view of the meeting platform/link — attorneys can see (and open) the
// meeting details here, but only the scheduler can change them. Reuses
// Schedule.jsx's modal styling.
function MeetingModal({ schedulingInfo, clientInfo, onClose }) {
  const platform = schedulingInfo.meetingPlatform || "";
  const link = schedulingInfo.meetingLink || "";
  const phone = clientInfo.phone || "";
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onClose} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onClose}>✕</button>
        <h6 className="schedule-modal-title">Meeting</h6>
        <div className="attorney-view-meeting-field">
          <span className="attorney-view-meeting-label">Platform</span>
          <span className="attorney-view-meeting-value">{platform || "Not set"}</span>
        </div>
        {/* A link is only meaningful for a Virtual meeting. */}
        {platform === "Virtual" && (
          <div className="attorney-view-meeting-field">
            <span className="attorney-view-meeting-label">Link</span>
            {link ? (
              <a
                className="attorney-view-meeting-value attorney-view-meeting-link"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                {link}
              </a>
            ) : (
              <span className="attorney-view-meeting-value">Not set</span>
            )}
          </div>
        )}
        {/* A phone consultation is placed to the client's own number. */}
        {platform === "Phone Call" && (
          <div className="attorney-view-meeting-field">
            <span className="attorney-view-meeting-label">Client Phone Number</span>
            {phone ? (
              <a className="attorney-view-meeting-value attorney-view-meeting-link" href={`tel:${phone}`}>
                {phone}
              </a>
            ) : (
              <span className="attorney-view-meeting-value">Not set</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Consultation Row ──────────────────────────────────────────────────────────

function ConsultationRow({ caseData, onViewDetails }) {
  const [showMeeting, setShowMeeting] = useState(false);
  const { clientInfo = {}, caseInfo = {}, schedulingInfo = {} } = caseData;
  const name = `${clientInfo.fname || ""} ${clientInfo.lname || ""}`.trim() || "Unknown Client";
  const details = [caseInfo.category, clientInfo.primaryLanguage].filter(Boolean).join(" | ") || "No Category | No Language";
  const interpreterName = schedulingInfo.interpreterName || "";
  const legalStudentName = schedulingInfo.legalStudentName || "";

  return (
    <div className="attorney-view-row">
      <div className="attorney-view-row-header">
        <span>{schedulingInfo.timeSlot || "—"}</span>
      </div>
      <div className="attorney-view-row-body">
        <div className="attorney-view-row-info">
          <div className="attorney-view-row-name">{name}</div>
          <div className="attorney-view-row-details">{details}</div>
        </div>
        <span className={`attorney-view-row-pill${!legalStudentName ? " attorney-view-row-pill--empty" : ""}`}>
          <IconMortarboard /> {legalStudentName || "Unassigned"}
        </span>
        <span className={`attorney-view-row-pill${!interpreterName ? " attorney-view-row-pill--empty" : ""}`}>
          <IconTranslate /> {interpreterName || "Unassigned"}
        </span>
        {schedulingInfo.meetingPlatform || schedulingInfo.meetingLink ? (
          <button
            type="button"
            className="attorney-view-row-meeting"
            onClick={() => setShowMeeting(true)}
          >
            <IconMeeting /> Meeting
          </button>
        ) : (
          <span className="attorney-view-row-meeting attorney-view-row-meeting--disabled">
            <IconMeeting /> Meeting
          </span>
        )}
        <button className="attorney-view-row-details-btn" onClick={onViewDetails}>
          View details <IconChevronRight />
        </button>
      </div>
      {showMeeting && (
        <MeetingModal
          schedulingInfo={schedulingInfo}
          clientInfo={clientInfo}
          onClose={() => setShowMeeting(false)}
        />
      )}
    </div>
  );
}

// ─── Attorney View ──────────────────────────────────────────────────────────────

export default function AttorneyView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caseIds, setCaseIds] = useState([]);
  const [casesById, setCasesById] = useState({});
  const db = getDatabase();
  const myUid = user?.uid;

  // Firebase rules only let an Attorney/Legal Student read cases/$caseId they're
  // matched to — not the whole cases collection — so we look up which case IDs
  // are ours via caseAccess/{myUid} (kept in sync by Schedule.jsx on Save),
  // then read each of those cases individually.
  useEffect(() => {
    if (!myUid) return;
    const unsubscribe = onValue(ref(db, `caseAccess/${myUid}`), (snapshot) => {
      setCaseIds(Object.keys(snapshot.val() || {}));
    });
    return () => unsubscribe();
  }, [db, myUid]);

  const caseIdsKey = caseIds.join(",");
  useEffect(() => {
    if (caseIds.length === 0) {
      setCasesById({});
      return;
    }
    setCasesById({});
    const unsubscribes = caseIds.map((caseId) =>
      onValue(ref(db, `cases/${caseId}`), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        setCasesById((prev) => ({ ...prev, [caseId]: { ...data, id: caseId } }));
      })
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, caseIdsKey]);

  const myCases = Object.values(casesById);

  const dateGroups = {};
  const noDateCases = [];
  for (const c of myCases) {
    const dateKey = c.schedulingInfo?.date;
    if (!dateKey) {
      noDateCases.push(c);
      continue;
    }
    if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
    dateGroups[dateKey].push(c);
  }
  const sortedDateKeys = Object.keys(dateGroups).sort((a, b) => (a < b ? 1 : -1));
  const todayYMD = toYMD(new Date());

  return (
    <>
      <NavBar active={"attorney-view"} title="Legal Clinic" />
      <div className="attorney-view-page">
        {myCases.length === 0 ? (
          <p className="attorney-view-empty">
            You currently do not have any<br />scheduled clinic consultations.
          </p>
        ) : (
          <>
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className="attorney-view-date-group">
                <div className="attorney-view-date-header">
                  <span>{formatDateHeading(dateKey)}</span>
                  <span
                    className={`attorney-view-badge ${dateKey < todayYMD ? "attorney-view-badge--archived" : "attorney-view-badge--upcoming"}`}
                  >
                    {dateKey < todayYMD ? "Archived" : "Upcoming"}
                  </span>
                </div>
                {dateGroups[dateKey].map((c) => (
                  <ConsultationRow key={c.id} caseData={c} onViewDetails={() => navigate(`/edit-form/${c.id}`)} />
                ))}
              </div>
            ))}

            {noDateCases.length > 0 && (
              <div className="attorney-view-date-group">
                <div className="attorney-view-date-header">
                  <span>No Date</span>
                </div>
                {noDateCases.map((c) => (
                  <ConsultationRow key={c.id} caseData={c} onViewDetails={() => navigate(`/edit-form/${c.id}`)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
