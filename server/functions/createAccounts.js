const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { sendPasswordResetEmail, resendApiKey } = require("./emailService");

/**
 * Creates a new Firebase Auth user and writes their record to RTDB.
 * Uses the Admin SDK - no secondary app instance needed.
 *
 * Expected data: { email, name, role }
 */
exports.createUserAccount = onCall({ secrets: [resendApiKey] }, async (request) => {
    // 1. Ensure caller is authenticated
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const callerUid = request.auth.uid;

    // 2. Verify caller is an admin via Admin SDK (bypasses RTDB rules)
    const db = admin.database();
    const callerSnapshot = await db.ref(`users/${callerUid}/role`).get();

    if ((callerSnapshot.val() || "").toLowerCase() !== "admin") {
        throw new HttpsError("permission-denied", "Admins only.");
    }

    const { email, name, role } = request.data;

    if (!email || !name || !role) {
        throw new HttpsError("invalid-argument", "email, name, and role are required.");
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    let uid;

    try {
        // 3. Create the Firebase Auth user via Admin SDK (no temp password / secondary app)
        const userRecord = await admin.auth().createUser({
            email: trimmedEmail,
            emailVerified: false,
            disabled: false,
        });

        uid = userRecord.uid;

        // 4. Write the user record to RTDB
        await db.ref(`users/${uid}`).set({
            email: trimmedEmail,
            name: trimmedName,
            role: role,
        });

        // 5. Send a password-reset email so the user can set their own password
        await sendPasswordResetEmail(trimmedEmail);

        return {
            success: true,
            uid,
            message: `Account created for ${trimmedEmail}. A password reset email has been sent.`,
        };
    } catch (err) {
        console.error("createUserAccount error:", err);

        if (uid) {
            await db.ref(`users/${uid}`).remove().catch((cleanupErr) => {
                console.error("createUserAccount cleanup RTDB error:", cleanupErr);
            });
            await admin.auth().deleteUser(uid).catch((cleanupErr) => {
                console.error("createUserAccount cleanup Auth error:", cleanupErr);
            });
        }

        if (err.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "This email is already registered.");
        }
        if (err.code === "auth/invalid-email") {
            throw new HttpsError("invalid-argument", "Please provide a valid email address.");
        }

        throw new HttpsError("internal", "Failed to create account. Please try again.");
    }
});