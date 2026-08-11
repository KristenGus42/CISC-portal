import { getFunctions, httpsCallable } from "firebase/functions";

// Google Meet links are minted by the `generateMeetLinks` Cloud Function, not
// here. A Meet link only exists as conferenceData on a Google Calendar event,
// so creating one takes a Google account's calendar credentials — which belong
// on the server, never in the browser bundle.
//
// The function writes meetingLink (and meetingEventId) onto the case itself, so
// anything already subscribed to cases/{id}/schedulingInfo sees the new link
// without needing the return value.

/**
 * Mints Meet links for several cases in one round trip.
 *
 * Cases that are not virtual, or that already have a link, are left untouched
 * unless `force` is set. Per-case failures come back in `errors` rather than
 * throwing — one unschedulable case must not sink a whole board's worth.
 *
 * @returns {Promise<{ links: Record<string,string>, errors: Record<string,string> }>}
 */
export async function generateMeetLinks(caseIds, { force = false } = {}) {
    const ids = [...new Set((caseIds || []).filter(Boolean))];
    if (ids.length === 0) return { links: {}, errors: {} };

    const callable = httpsCallable(getFunctions(), "generateMeetLinks");
    const { data } = await callable({ caseIds: ids, force });
    return { links: data?.links ?? {}, errors: data?.errors ?? {} };
}

/**
 * Single-case convenience wrapper. Unlike the batch form this *does* throw on
 * failure, since a lone regenerate click has nothing else to partially succeed.
 *
 * @returns {Promise<string>} the new Meet link
 */
export async function generateMeetLink(caseId, { force = false } = {}) {
    const { links, errors } = await generateMeetLinks([caseId], { force });
    if (errors[caseId]) throw new Error(errors[caseId]);
    return links[caseId] ?? "";
}
