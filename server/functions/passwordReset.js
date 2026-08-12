const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { assertAdmin } = require("./authHelpers");
const { sendPasswordResetEmail, resendApiKey } = require("./emailService");

/**
 * Admin-triggered password reset (replaces the client-side firebase/auth
 * sendPasswordResetEmail call). Used by the "Reset Password" button and the
 * bulk reset action in AccessManagement.jsx.
 *
 * Expected data: { uid }
 */
exports.requestPasswordReset = onCall({ secrets: [resendApiKey] }, async (request) => {
    await assertAdmin(request);

    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError("invalid-argument", "uid is required.");
    }

    const db = admin.database();
    const userSnapshot = await db.ref(`users/${uid}/email`).get();
    const email = userSnapshot.val();

    if (!email) {
        throw new HttpsError("not-found", "User not found.");
    }

    try {
        await sendPasswordResetEmail(email);
        return {
            success: true,
            message: `Password reset email sent to ${email}.`,
        };
    } catch (err) {
        console.error("requestPasswordReset error:", err);
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", `${email} was not found in Firebase Auth.`);
        }
        if (err.code === "auth/invalid-email") {
            throw new HttpsError("invalid-argument", "Please provide a valid email address.");
        }
        throw new HttpsError("internal", `Failed to send password reset email to ${email}.`);
    }
});

/**
 * Self-service password reset, triggered by the signed-in user from their own
 * Profile page. Same email as the admin flow above, but the target is always
 * the caller — no uid is accepted from the client.
 */
exports.requestOwnPasswordReset = onCall({ secrets: [resendApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    const uid = request.auth.uid;
    const db = admin.database();
    const userSnapshot = await db.ref(`users/${uid}/email`).get();
    const email = userSnapshot.val();

    if (!email) {
        throw new HttpsError("not-found", "Your account record could not be found.");
    }

    try {
        await sendPasswordResetEmail(email);
        return {
            success: true,
            message: `Password reset email sent to ${email}.`,
        };
    } catch (err) {
        console.error("requestOwnPasswordReset error:", err);
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", `${email} was not found in Firebase Auth.`);
        }
        throw new HttpsError("internal", `Failed to send password reset email to ${email}.`);
    }
});
