const { HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Verify the caller is authenticated and holds the Admin role in RTDB.
 * Throws HttpsError otherwise.
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

module.exports = { assertAdmin };
