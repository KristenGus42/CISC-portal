const { randomUUID } = require("crypto");
// The single-API package, not the full `googleapis` metapackage: that one
// unpacks every Google API and takes long enough to load that `firebase deploy`
// times out analysing the codebase (and it would drag out every cold start).
const { auth, calendar } = require("@googleapis/calendar");
const { defineSecret } = require("firebase-functions/params");
const { CLINIC_TIME_ZONE, GOOGLE_CALENDAR_ID, GOOGLE_CALENDAR_USER } = require("./config");

/**
 * Google Calendar access, used only to mint Google Meet links.
 *
 * A Meet link cannot be created on its own - it is `conferenceData` hanging off
 * a Calendar event, so every link here is backed by a real event on the clinic
 * calendar. That is also why this needs a Google *account* to act as, not a
 * plain API key: API keys only reach public data, never someone's calendar.
 *
 * Two credential shapes are supported; whichever is configured wins, service
 * account first. See README notes at the bottom of this file.
 */

// ── Credentials (Google Cloud Secret Manager, same as RESEND_API_KEY) ────────
// OAuth route: a desktop/web OAuth client plus a long-lived refresh token.
const googleOAuthClientId = defineSecret("GOOGLE_OAUTH_CLIENT_ID");
const googleOAuthClientSecret = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
const googleOAuthRefreshToken = defineSecret("GOOGLE_OAUTH_REFRESH_TOKEN");

// Bundle for the `secrets:` option of any onCall that mints links.
//
// Only the route actually in use may appear here — and note that merely calling
// defineSecret() registers the param, so an unused one still blocks deploys
// with "no value for the secret ...". That is why there is no
// GOOGLE_SERVICE_ACCOUNT_KEY param below despite buildAuthClient() supporting
// it: to switch to the service-account route, create that secret, add
// `const googleServiceAccountKey = defineSecret("GOOGLE_SERVICE_ACCOUNT_KEY");`
// above, and list it here.
const googleCalendarSecrets = [
    googleOAuthClientId,
    googleOAuthClientSecret,
    googleOAuthRefreshToken,
];

// Only ever touches events it creates - not the full-calendar scope.
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

let calendarClient = null;

function buildAuthClient() {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson) {
        let credentials;
        try {
            credentials = JSON.parse(serviceAccountJson);
        } catch (err) {
            throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON.");
        }
        if (!credentials.client_email || !credentials.private_key) {
            throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email/private_key.");
        }
        // A service account owns no calendar of its own, so on Workspace it has
        // to impersonate a real user via domain-wide delegation. Without a
        // subject the insert below fails with "Service accounts cannot invite
        // attendees without Domain-Wide Delegation".
        return new auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: SCOPES,
            subject: GOOGLE_CALENDAR_USER || undefined,
        });
    }

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
        const oauthClient = new auth.OAuth2(clientId, clientSecret);
        // googleapis swaps this for a fresh access token on each call and
        // caches it in memory, so nothing here expires mid-request.
        oauthClient.setCredentials({ refresh_token: refreshToken });
        return oauthClient;
    }

    throw new Error(
        "No Google Calendar credentials configured. Set either GOOGLE_SERVICE_ACCOUNT_KEY, " +
        "or all of GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN."
    );
}

function getCalendar() {
    if (calendarClient) return calendarClient;
    calendarClient = calendar({ version: "v3", auth: buildAuthClient() });
    return calendarClient;
}

// ── Time helpers ────────────────────────────────────────────────────────────

/**
 * Turns the portal's stored date + slot ("2026-08-10", "5:30pm") into the
 * floating RFC3339 string Calendar wants ("2026-08-10T17:30:00").
 *
 * Deliberately *not* an absolute instant: it's paired with `timeZone` in the
 * event body, which lets Google resolve the wall-clock time in the clinic's
 * zone. That sidesteps DST maths entirely, and stops the Cloud Functions
 * container's own (UTC) clock from shifting the appointment.
 */
function toFloatingDateTime(dateKey, timeSlot, addMinutes = 0) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateKey || "").trim());
    if (!dateMatch) {
        throw new Error(`Unusable schedule date: "${dateKey}"`);
    }
    const timeMatch = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec((timeSlot || "").trim());
    if (!timeMatch) {
        throw new Error(`Unusable time slot: "${timeSlot}"`);
    }

    const [, year, month, day] = dateMatch;
    const [, rawHour, minute, period] = timeMatch;

    let hour = Number(rawHour) % 12;
    if (period.toLowerCase() === "pm") hour += 12;

    // UTC arithmetic purely so the +duration rollover past midnight is correct;
    // the result is read back as wall-clock, never as an instant.
    const stamp = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(minute)));
    stamp.setUTCMinutes(stamp.getUTCMinutes() + addMinutes);
    return stamp.toISOString().slice(0, 19);
}

/** Digs the Meet URL out of an inserted event, whichever field carries it. */
function extractMeetLink(event) {
    if (event?.hangoutLink) return event.hangoutLink;
    const entryPoints = event?.conferenceData?.entryPoints || [];
    const video = entryPoints.find((point) => point.entryPointType === "video");
    return video?.uri || null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a calendar event carrying a freshly minted Google Meet link.
 *
 * Everyone on `attendees` is on the event's guest list, which is what lets them
 * join the Meet without knocking. `sendUpdates: "none"` below means Google
 * emails none of them — the event simply appears on their Google Calendar, and
 * the portal stays the thing that actually tells people about appointments.
 *
 * @returns {Promise<{ link: string, eventId: string }>}
 */
async function createMeetEvent({ summary, description, dateKey, timeSlot, durationMinutes, attendees = [] }) {
    const calendar = getCalendar();

    const requestBody = {
        summary,
        description,
        attendees,
        start: {
            dateTime: toFloatingDateTime(dateKey, timeSlot),
            timeZone: CLINIC_TIME_ZONE,
        },
        end: {
            dateTime: toFloatingDateTime(dateKey, timeSlot, durationMinutes),
            timeZone: CLINIC_TIME_ZONE,
        },
        conferenceData: {
            createRequest: {
                // Google dedupes retries by this id, so it must be fresh per call.
                requestId: randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
            },
        },
    };

    const response = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        // Anything other than 1 makes Calendar silently ignore conferenceData
        // and hand back an event with no Meet link at all.
        conferenceDataVersion: 1,
        sendUpdates: "none",
        requestBody,
    });

    let event = response.data;
    let link = extractMeetLink(event);

    // Conference creation is usually resolved inline, but Google is allowed to
    // return it "pending". One re-read covers that without a polling loop.
    if (!link && event.id) {
        const reread = await calendar.events.get({ calendarId: GOOGLE_CALENDAR_ID, eventId: event.id });
        event = reread.data;
        link = extractMeetLink(event);
    }

    if (!link) {
        throw new Error("Calendar created the event but returned no Meet link.");
    }

    return { link, eventId: event.id };
}

/**
 * Brings an existing event back in line with the case: its time, its guest
 * list, and its title. Used on every Save Schedule so that reassigning a case
 * or moving it to another slot doesn't leave a stale event behind.
 *
 * A patch, not an insert — the Meet link lives on the event, so replacing the
 * event would invalidate a link that may already be with the client.
 */
async function updateMeetEvent(eventId, { summary, description, dateKey, timeSlot, durationMinutes, attendees = [] }) {
    await getCalendar().events.patch({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId,
        // Kept at 1 so the existing conferenceData survives the patch untouched.
        conferenceDataVersion: 1,
        sendUpdates: "none",
        requestBody: {
            summary,
            description,
            attendees,
            start: {
                dateTime: toFloatingDateTime(dateKey, timeSlot),
                timeZone: CLINIC_TIME_ZONE,
            },
            end: {
                dateTime: toFloatingDateTime(dateKey, timeSlot, durationMinutes),
                timeZone: CLINIC_TIME_ZONE,
            },
        },
    });
}

/**
 * Removes a superseded event. Best-effort: a link being regenerated must not
 * fail because the old event was already deleted off the calendar by hand.
 */
async function deleteEvent(eventId) {
    if (!eventId) return;
    try {
        await getCalendar().events.delete({
            calendarId: GOOGLE_CALENDAR_ID,
            eventId,
            sendUpdates: "none",
        });
    } catch (err) {
        const status = err?.response?.status;
        if (status === 404 || status === 410) return; // already gone
        console.warn(`Could not delete superseded calendar event ${eventId}:`, err.message);
    }
}

module.exports = {
    createMeetEvent,
    updateMeetEvent,
    deleteEvent,
    toFloatingDateTime, // exported for tests

    googleCalendarSecrets,
};
