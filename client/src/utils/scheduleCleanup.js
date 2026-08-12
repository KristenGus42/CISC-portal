// Keeping the schedules in step with a deleted case.
//
// A case that's been placed on a clinic's board lives in two places:
// cases/{caseId}, and schedules/{dateKey}/slots/{slotKey}/client. Deleting
// only the first leaves a slot pointing at a client who no longer exists, so
// the delete has to take those slots with it.

// Multi-path update entries (relative to the database root) that strip a
// deleted case out of every schedule it appears on.
//
// A slot with an attorney keeps its time and attorney and just loses its
// client — the same shape Schedule.jsx leaves behind when a case is dragged
// off the board, so the column's attorney selection survives. A slot with no
// attorney has nothing left worth keeping, so the whole slot goes.
export function scheduleSlotUpdatesForDeletedCase(schedules, caseId) {
    const updates = {};
    if (!caseId) return updates;

    for (const [dateKey, schedule] of Object.entries(schedules || {})) {
        for (const [slotKey, slot] of Object.entries(schedule?.slots || {})) {
            if (slot?.client?.caseId !== caseId) continue;
            if (slot.attorney) {
                updates[`schedules/${dateKey}/slots/${slotKey}/client`] = null;
            } else {
                updates[`schedules/${dateKey}/slots/${slotKey}`] = null;
            }
        }
    }
    return updates;
}
