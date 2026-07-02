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
 * Permanently deletes a user's Firebase Auth account and their RTDB record.
 *
 * Expected data: { uid }
 */
exports.deleteUserAccount = onCall(async (request) => {
    await assertAdmin(request);

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    try {
        // Delete the Firebase Auth account
        await admin.auth().deleteUser(uid);

        // Remove the RTDB record entirely
        await admin.database().ref(`users/${uid}`).remove();

        return { success: true, message: "User account permanently deleted." };
    } catch (err) {
        console.error("deleteUserAccount error:", err);
        if (err.code === "auth/user-not-found") {
            // Auth account already gone — still clean up RTDB
            await admin.database().ref(`users/${uid}`).remove();
            return { success: true, message: "User record removed (auth account was not found)." };
        }
        throw new HttpsError("internal", "Failed to delete user. Please try again.");
    }
});

/**
 * Disables a user's Firebase Auth account (cannot sign in).
 * Does NOT touch RTDB — auth disabled flag is the source of truth.
 *
 * Expected data: { uid }
 */
exports.disableUserAccount = onCall(async (request) => {
    await assertAdmin(request);

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    try {
        await admin.auth().updateUser(uid, { disabled: true });
        return { success: true, message: "User account disabled." };
    } catch (err) {
        console.error("disableUserAccount error:", err);
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found in Firebase Auth.");
        }
        throw new HttpsError("internal", "Failed to disable user. Please try again.");
    }
});

/**
 * Re-enables a user's Firebase Auth account.
 * Does NOT touch RTDB — auth disabled flag is the source of truth.
 *
 * Expected data: { uid }
 */
exports.enableUserAccount = onCall(async (request) => {
    await assertAdmin(request);

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    try {
        await admin.auth().updateUser(uid, { disabled: false });
        return { success: true, message: "User account enabled." };
    } catch (err) {
        console.error("enableUserAccount error:", err);
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found in Firebase Auth.");
        }
        throw new HttpsError("internal", "Failed to enable user. Please try again.");
    }
});
