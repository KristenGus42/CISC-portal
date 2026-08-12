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
 * Helper: wipe a user's RTDB records from every branch they can appear in.
 */
async function removeUserRecords(uid) {
    const db = admin.database();
    await Promise.all([
        db.ref(`users/${uid}`).remove(),
        db.ref(`attorneys/${uid}`).remove(),
        db.ref(`legalStudents/${uid}`).remove()
    ]);
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

        // Remove the RTDB records entirely from all branches
        await removeUserRecords(uid);

        return { success: true, message: "User account permanently deleted." };
    } catch (err) {
        console.error("deleteUserAccount error:", err);
        if (err.code === "auth/user-not-found") {
            // Auth account already gone — still clean up all RTDB records
            await removeUserRecords(uid);
            return { success: true, message: "User record removed (auth account was not found)." };
        }
        throw new HttpsError("internal", "Failed to delete user. Please try again.");
    }
});

/**
 * Self-service account deletion from the Profile page. The target is always the
 * caller, so no uid is accepted from the client.
 *
 * Guarded so the last remaining Admin cannot delete themselves and lock
 * everyone out of Access Management.
 */
exports.deleteOwnAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const db = admin.database();

    const userSnapshot = await db.ref(`users/${uid}`).get();
    if (!userSnapshot.exists()) {
        throw new HttpsError("not-found", "Your account record could not be found.");
    }

    if ((userSnapshot.val().role || "").toLowerCase() === "admin") {
        const allUsersSnapshot = await db.ref("users").get();
        const adminCount = Object.values(allUsersSnapshot.val() || {})
            .filter((u) => (u?.role || "").toLowerCase() === "admin").length;
        if (adminCount <= 1) {
            throw new HttpsError(
                "failed-precondition",
                "You are the only administrator. Promote another user to Admin before deleting your account."
            );
        }
    }

    try {
        await admin.auth().deleteUser(uid);
        await removeUserRecords(uid);
        return { success: true, message: "Your account has been permanently deleted." };
    } catch (err) {
        console.error("deleteOwnAccount error:", err);
        if (err.code === "auth/user-not-found") {
            await removeUserRecords(uid);
            return { success: true, message: "Your account record has been removed." };
        }
        throw new HttpsError("internal", "Failed to delete your account. Please try again.");
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
