const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const FIREBASE_WEB_API_KEY = "AIzaSyADNdwf_eraJtHEz6sI5FAWq_DPW4UbfF8";

async function sendPasswordResetEmail(email) {
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestType: "PASSWORD_RESET",
                email,
            }),
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send password reset email: ${errorText}`);
    }
}

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

        const userData = userSnapshot.val();
        const oldRole = userData.role || "";

        // If the role actually changed, perform the branch migration
        if (oldRole !== role) {
            const updates = {};
            
            // Check if there is an existing record in either branch
            const attorneySnap = await db.ref(`attorneys/${uid}`).get();
            const studentSnap = await db.ref(`legalStudents/${uid}`).get();
            
            let personnelData = null;
            if (attorneySnap.exists()) {
                personnelData = attorneySnap.val();
            } else if (studentSnap.exists()) {
                personnelData = studentSnap.val();
            }
            
            // If they had a personnel record, migrate or delete it
            if (personnelData) {
                if (role === "Attorney") {
                    updates[`/attorneys/${uid}`] = personnelData;
                    if (studentSnap.exists()) {
                        updates[`/legalStudents/${uid}`] = null;
                    }
                } else if (role === "Legal Student") {
                    updates[`/legalStudents/${uid}`] = personnelData;
                    if (attorneySnap.exists()) {
                        updates[`/attorneys/${uid}`] = null;
                    }
                } else {
                    // Changing to Admin or Staff - delete personnel record from both branches
                    updates[`/attorneys/${uid}`] = null;
                    updates[`/legalStudents/${uid}`] = null;
                }
            } else {
                // If they did not have a personnel record, but are now Attorney or Legal Student, create a basic record
                const baseRecord = {
                    name: userData.name || "",
                    email: userData.email || "",
                    dateAdded: new Date().toLocaleString()
                };
                if (role === "Attorney") {
                    updates[`/attorneys/${uid}`] = baseRecord;
                } else if (role === "Legal Student") {
                    updates[`/legalStudents/${uid}`] = baseRecord;
                }
            }
            
            // Apply updates to RTDB
            if (Object.keys(updates).length > 0) {
                await db.ref().update(updates);
            }
        }

        await db.ref(`users/${uid}/role`).set(role);

        const userEmail = userData.email || uid;
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

/**
 * Updates a user's email address in Firebase Auth and RTDB.
 *
 * Expected data: { uid, newEmail }
 */
exports.updateUserEmail = onCall(async (request) => {
    await assertAdmin(request);

    const { uid, newEmail } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }
    if (!newEmail || typeof newEmail !== "string" || !newEmail.trim()) {
        throw new HttpsError("invalid-argument", "A valid newEmail is required.");
    }

    const trimmedEmail = newEmail.trim().toLowerCase();

    try {
        // Update email in Firebase Auth
        await admin.auth().updateUser(uid, { email: trimmedEmail });

        // Sync email in RTDB users node
        const db = admin.database();
        await db.ref(`users/${uid}/email`).set(trimmedEmail);

        // If the user is an Attorney or Legal Student, also update their personnel record
        const roleSnapshot = await db.ref(`users/${uid}/role`).get();
        const role = roleSnapshot.val() || "";

        if (role === "Attorney") {
            const attSnapshot = await db.ref(`attorneys/${uid}`).get();
            if (attSnapshot.exists()) {
                await db.ref(`attorneys/${uid}/email`).set(trimmedEmail);
            }
        } else if (role === "Legal Student") {
            const lsSnapshot = await db.ref(`legalStudents/${uid}`).get();
            if (lsSnapshot.exists()) {
                await db.ref(`legalStudents/${uid}/email`).set(trimmedEmail);
            }
        }

        // Send a password reset email to the new address
        await sendPasswordResetEmail(trimmedEmail);

        return {
            success: true,
            message: `Email has been updated to ${trimmedEmail}. A password reset email has been sent.`,
        };
    } catch (err) {
        if (err instanceof HttpsError) throw err;
        console.error("updateUserEmail error:", err);

        // Surface common Auth errors as user-friendly messages
        if (err.code === "auth/invalid-email") {
            throw new HttpsError("invalid-argument", "The email address is not valid.");
        }
        if (err.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "This email address is already in use by another account.");
        }
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found in Firebase Auth.");
        }
        throw new HttpsError("internal", "Failed to update email. Please try again.");
    }
});
