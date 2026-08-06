const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { assertAdmin } = require("./authHelpers");
const { sendPasswordResetEmail, sendgridApiKey } = require("./emailService");

/**
 * Admin-triggered password reset (replaces the client-side firebase/auth
 * sendPasswordResetEmail call). Used by the "Reset Password" button and the
 * bulk reset action in AccessManagement.jsx.
 *
 * Expected data: { uid }
 */
exports.requestPasswordReset = onCall({ secrets: [sendgridApiKey] }, async (request) => {
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
