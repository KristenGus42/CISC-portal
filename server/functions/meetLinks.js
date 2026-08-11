const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { assertAdmin } = require("./authHelpers");
const { createMeetEvent, updateMeetEvent, deleteEvent, googleCalendarSecrets } = require("./googleCalendar");
const { MEETING_DURATION_MINUTES } = require("./config");

// Saving a schedule can touch every slot on the board at once, so this takes a
// batch of case ids in one round trip rather than one call per case.
const MAX_CASES_PER_CALL = 60;
// Calendar is rate-limited per user; a handful in flight is plenty and keeps a
// full board well inside the function timeout.
const CONCURRENCY = 5;

const LINK_PLATFORM = "Virtual";

// Roles that are on every clinic meeting regardless of who's assigned to the
// case. Attorneys / legal students are deliberately absent: they come from the
// case's own assignment, so only the ones actually matched to it are invited.
const ALWAYS_INVITED_ROLES = ["staff", "admin"];

/**
 * Emails of every Staff/Admin user. Read once per call rather than per case —
 * a full board is dozens of cases against one unchanging list.
 */
async function fetchAlwaysInvitedEmails(db) {
    const snapshot = await db.ref("users").get();
    const users = snapshot.val() || {};
    return Object.values(users)
        .filter((user) => ALWAYS_INVITED_ROLES.includes((user?.role || "").toLowerCase()))
        .map((user) => user?.email)
        .filter(Boolean);
}

/**
 * The event's guest list: everyone matched to the case, plus all staff/admin.
 *
 * Being on this list is what lets someone into the Meet without knocking, which
 * is the whole point - a meeting owned by a personal Google account admits
 * invited guests directly and makes everyone else wait for a host who isn't
 * there.
 */
function buildAttendees(caseData, alwaysInvitedEmails) {
    const scheduling = caseData?.schedulingInfo || {};
    const candidates = [
        scheduling.attorneyEmail,
        scheduling.interpreterEmail,
        scheduling.legalStudentEmail,
        caseData?.clientInfo?.email,
        ...alwaysInvitedEmails,
    ];

    // Google rejects the whole event for one malformed address, and dedupes
    // nothing itself - a staff member who is also the assigned attorney would
    // otherwise appear twice.
    const seen = new Set();
    const attendees = [];
    for (const raw of candidates) {
        const email = (raw || "").trim().toLowerCase();
        if (!email || !email.includes("@") || seen.has(email)) continue;
        seen.add(email);
        attendees.push({ email });
    }
    return attendees;
}

/** Case summary line for the calendar event, e.g. "CISC Legal Clinic - Jane Doe". */
function buildSummary(caseData) {
    const fname = caseData?.clientInfo?.fname || "";
    const lname = caseData?.clientInfo?.lname || "";
    const name = `${fname} ${lname}`.trim();
    return name ? `CISC Legal Clinic - ${name}` : "CISC Legal Clinic Appointment";
}

// An event has ONE description, shown to every guest - and the client is now a
// guest. So this lists who they're meeting, but deliberately not the case
// category: "Immigration", "Domestic Violence" and the like should not surface
// on a personal (possibly shared) calendar. Staff read the category in the
// portal, where it's access-controlled.
function buildDescription(caseId, caseData) {
    const scheduling = caseData?.schedulingInfo || {};
    const lines = [`Case ID: ${caseId}`];
    if (scheduling.attorneyName) lines.push(`Attorney: ${scheduling.attorneyName}`);
    if (scheduling.interpreterName) lines.push(`Interpreter: ${scheduling.interpreterName}`);
    if (scheduling.legalStudentName) lines.push(`Legal Student: ${scheduling.legalStudentName}`);
    return lines.join("\n");
}

/**
 * Mints a Google Meet link for one case and stores it on the case record.
 * Returns the link, or throws with a message the caller can attribute.
 *
 * Exported at the bottom of this file for tests.
 */
async function generateLinkForCase(db, caseId, force, alwaysInvitedEmails = []) {
    const snapshot = await db.ref(`cases/${caseId}`).get();
    const caseData = snapshot.val();
    if (!caseData) {
        throw new Error("Case not found.");
    }

    const scheduling = caseData.schedulingInfo || {};

    // The platform is the source of truth for whether a link belongs here at
    // all - a phone/in-person case must never get one, even if asked.
    const platform = scheduling.meetingPlatform || LINK_PLATFORM;
    if (platform !== LINK_PLATFORM) {
        return { link: "", skipped: "not a virtual meeting" };
    }

    const eventDetails = {
        summary: buildSummary(caseData),
        description: buildDescription(caseId, caseData),
        dateKey: scheduling.date,
        timeSlot: scheduling.timeSlot,
        durationMinutes: MEETING_DURATION_MINUTES,
        attendees: buildAttendees(caseData, alwaysInvitedEmails),
    };

    // A case that already has a link keeps it - a routine save must never
    // invalidate a link that's already been sent out. Instead the existing
    // event is brought back in line with the case, so reassigning personnel or
    // moving the appointment updates the guest list and the time in place.
    // Regenerate is the only path that passes force.
    if (scheduling.meetingLink && !force) {
        if (!scheduling.meetingEventId) {
            // Pre-dates event tracking (or the link was typed in by hand):
            // there's nothing to patch, and guessing which event it refers to
            // would be worse than leaving it alone.
            return { link: scheduling.meetingLink, skipped: "no calendar event to sync" };
        }
        await updateMeetEvent(scheduling.meetingEventId, eventDetails);
        return { link: scheduling.meetingLink, synced: true };
    }

    // Read before the write below, not after — what we want here is the event
    // being replaced, and nothing should depend on whether `scheduling` still
    // reflects the pre-update state by the time we get there.
    const supersededEventId = scheduling.meetingEventId;

    const { link, eventId } = await createMeetEvent(eventDetails);

    await db.ref(`cases/${caseId}/schedulingInfo`).update({
        meetingPlatform: LINK_PLATFORM,
        meetingLink: link,
        meetingEventId: eventId,
    });

    // Only once the replacement is safely stored - a failed delete then costs a
    // stray calendar entry, never the link itself.
    if (force && supersededEventId && supersededEventId !== eventId) {
        await deleteEvent(supersededEventId);
    }

    return { link };
}

/**
 * Creates Google Meet links for scheduled cases, and keeps existing ones in
 * sync with the case they belong to.
 *
 * Called from Schedule.jsx: once per Save Schedule (every scheduled virtual
 * case, force=false — new ones get a link, existing ones get their event's time
 * and guest list refreshed) and from the Meeting pop-up's regenerate button (a
 * single case, force=true, which replaces the link outright).
 *
 * Expected data: { caseIds: string[], force?: boolean }
 * Returns: { links: { [caseId]: string }, errors: { [caseId]: string } }
 *
 * Partial failure is normal and non-fatal - one case with a missing date must
 * not sink the rest of the board - so per-case errors come back in the payload
 * instead of as a thrown HttpsError.
 */
exports.generateMeetLinks = onCall(
    { secrets: googleCalendarSecrets, timeoutSeconds: 300 },
    async (request) => {
        await assertAdmin(request);

        const { caseIds, force = false } = request.data || {};

        if (!Array.isArray(caseIds) || caseIds.length === 0) {
            throw new HttpsError("invalid-argument", "caseIds must be a non-empty array.");
        }
        if (caseIds.length > MAX_CASES_PER_CALL) {
            throw new HttpsError(
                "invalid-argument",
                `Too many cases in one call (max ${MAX_CASES_PER_CALL}).`
            );
        }

        const db = admin.database();
        const links = {};
        const errors = {};
        const queue = [...new Set(caseIds.filter(Boolean))];

        // One read for the whole batch. If it fails, carry on with an empty
        // list: a case's own attorney/client matter more than the standing
        // invitees, and losing those shouldn't cost anyone their link.
        let alwaysInvitedEmails = [];
        try {
            alwaysInvitedEmails = await fetchAlwaysInvitedEmails(db);
        } catch (err) {
            console.error("Could not read staff/admin emails for the guest list:", err);
        }

        async function worker() {
            while (queue.length > 0) {
                const caseId = queue.shift();
                try {
                    const { link } = await generateLinkForCase(db, caseId, force, alwaysInvitedEmails);
                    if (link) links[caseId] = link;
                } catch (err) {
                    console.error(`generateMeetLinks failed for case ${caseId}:`, err);
                    errors[caseId] = err.message || "Could not create meeting link.";
                }
            }
        }

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
        );

        return { links, errors };
    }
);

// Exported for tests only; index.js deliberately does not re-export these.
exports.generateLinkForCase = generateLinkForCase;
exports.buildAttendees = buildAttendees;
exports.fetchAlwaysInvitedEmails = fetchAlwaysInvitedEmails;
