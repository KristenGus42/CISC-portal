const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { validatePasswordResetToken, deletePasswordResetToken } = require("./passwordResetTokens");
const { FIREBASE_WEB_API_KEY } = require("./config");

const MIN_PASSWORD_LENGTH = 8;

/**
 * Firebase doesn't expose password hashes for direct comparison, so the way
 * to check "is this the same as their current password" is to attempt a
 * sign-in with it: a successful sign-in means it matches the current one.
 *
 * Fails open (returns false / "not a match") on unexpected errors - this is a
 * UX guardrail, not a security gate, so a transient outage here shouldn't
 * block someone's legitimate reset.
 */
async function matchesCurrentPassword(email, password) {
    try {
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, returnSecureToken: false }),
            },
        );
        // A successful sign-in means the proposed password matches the current one.
        return response.ok;
    } catch (err) {
        console.error("matchesCurrentPassword check failed:", err);
        return false;
    }
}

/**
 * Public (unauthenticated) callable - completes a password reset for whoever
 * holds a valid token from the emailed reset link. No admin/auth check here
 * by design: this is the equivalent of Firebase's own hosted reset-password
 * action, just backed by our own 48h token instead of Firebase's OOB code.
 *
 * Expected data: { token, newPassword }
 */
exports.completePasswordReset = onCall(async (request) => {
    const { token, newPassword } = request.data || {};

    if (!token || typeof token !== "string") {
        throw new HttpsError("invalid-argument", "A reset token is required.");
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new HttpsError(
            "invalid-argument",
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        );
    }

    // Validate only (doesn't delete yet) - so a rejection below doesn't burn
    // the user's only reset link over something they can just retry.
    let uid, tokenHash;
    try {
        ({ uid, tokenHash } = await validatePasswordResetToken(token));
    } catch (err) {
        throw new HttpsError(
            "invalid-argument",
            "This reset link is invalid or has expired. Please request a new one.",
        );
    }

    let userRecord;
    try {
        userRecord = await admin.auth().getUser(uid);
    } catch (err) {
        console.error("completePasswordReset getUser error:", err);
        throw new HttpsError("internal", "Failed to reset password. Please try again.");
    }

    if (userRecord.email && (await matchesCurrentPassword(userRecord.email, newPassword))) {
        throw new HttpsError("invalid-argument", "New password must be different from your current password.");
    }

    try {
        await admin.auth().updateUser(uid, { password: newPassword });
    } catch (err) {
        console.error("completePasswordReset error:", err);
        throw new HttpsError("internal", "Failed to reset password. Please try again.");
    }

    // Only burn the token once the password has actually been changed.
    await deletePasswordResetToken(tokenHash);

    return {
        success: true,
        message: "Your password has been reset. You can now sign in.",
    };
});
