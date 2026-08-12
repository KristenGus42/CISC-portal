const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Helper: verify caller is authenticated and is an admin.
 */
async function assertAdmin(request) {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }
    const db = admin.database();
    const snapshot = await db.ref(`users/${request.auth.uid}/role`).get();
    if ((snapshot.val() || "").toLowerCase() !== "admin") {
        throw new HttpsError("permission-denied", "Admins only.");
    }
}

/**
 * Returns each Firebase Auth user's disabled flag and last sign-in time,
 * keyed by uid, so the portal can display Active / Pending / Disabled status.
 */
exports.getUserAuthStatuses = onCall(async (request) => {
    await assertAdmin(request);

    const statuses = {};
    let nextPageToken;

    do {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        result.users.forEach((userRecord) => {
            statuses[userRecord.uid] = {
                disabled: userRecord.disabled,
                lastSignInTime: userRecord.metadata.lastSignInTime || null,
                creationTime: userRecord.metadata.creationTime || null,
            };
        });
        nextPageToken = result.pageToken;
    } while (nextPageToken);

    return { statuses };
});
