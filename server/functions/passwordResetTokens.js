const crypto = require("crypto");
const admin = require("firebase-admin");
const { PASSWORD_RESET_TOKEN_TTL_MS } = require("./config");

/**
 * Custom password-reset token store, backed by RTDB.
 *
 * Firebase's own generatePasswordResetLink()/OOB codes have a fixed ~1 hour
 * expiration that isn't configurable via the Admin SDK or Console, so this
 * implements our own single-use, time-limited token instead (default: 48h).
 *
 * Only the SHA-256 hash of the token is stored - never the raw token - so a
 * database read alone can't be used to reset someone's password.
 */

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a new reset token for the given uid, stores its hash, and
 * returns the raw token to embed in the emailed link.
 */
async function createPasswordResetToken(uid) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    await admin.database().ref(`passwordResetTokens/${tokenHash}`).set({
        uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
    });

    return token;
}

/**
 * Validates a reset token WITHOUT consuming it, so a rejected attempt (e.g.
 * reusing the current password, a transient error) doesn't burn the user's
 * only link. Returns { uid, tokenHash } on success; throws if the token is
 * missing, malformed, or expired. Call deletePasswordResetToken() once the
 * password change actually succeeds.
 */
async function validatePasswordResetToken(token) {
    if (!token || typeof token !== "string") {
        throw new Error("Invalid reset token.");
    }

    const tokenHash = hashToken(token);
    const snapshot = await admin.database().ref(`passwordResetTokens/${tokenHash}`).get();

    if (!snapshot.exists()) {
        throw new Error("This reset link is invalid or has already been used.");
    }

    const { uid, expiresAt } = snapshot.val();

    if (!uid || Date.now() > expiresAt) {
        // Opportunistic cleanup - an expired token is dead weight either way.
        await admin.database().ref(`passwordResetTokens/${tokenHash}`).remove();
        throw new Error("This reset link has expired.");
    }

    return { uid, tokenHash };
}

/** Single-use enforcement: call only after the password change has succeeded. */
async function deletePasswordResetToken(tokenHash) {
    await admin.database().ref(`passwordResetTokens/${tokenHash}`).remove();
}

module.exports = { createPasswordResetToken, validatePasswordResetToken, deletePasswordResetToken };
