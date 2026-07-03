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

const VALID_ROLES = ["Staff", "Admin", "Attorney", "Legal Student"];

/**
 * Updates a user's role in RTDB.
 *
 * Expected data: { uid, role }
 */
exports.updateUserRole = onCall(async (request) => {
    await assertAdmin(request);

    const { uid, role } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }
    if (!role || !VALID_ROLES.includes(role)) {
        throw new HttpsError(
            "invalid-argument",
            `role must be one of: ${VALID_ROLES.join(", ")}.`,
        );
    }

    // Prevent admins from demoting themselves
    if (uid === request.auth.uid) {
        throw new HttpsError(
            "failed-precondition",
            "You cannot change your own role.",
        );
    }

    try {
        const db = admin.database();

        // Verify the target user exists
        const userSnapshot = await db.ref(`users/${uid}`).get();
        if (!userSnapshot.exists()) {
            throw new HttpsError("not-found", "User not found.");
        }

        await db.ref(`users/${uid}/role`).set(role);

        const userEmail = userSnapshot.val().email || uid;
        return {
            success: true,
            message: `${userEmail}'s role has been updated to ${role}.`,
        };
    } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.error("updateUserRole error:", err);
        throw new HttpsError("internal", "Failed to update role. Please try again.");
    }
});
