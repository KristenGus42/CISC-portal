/**
 * Shared, non-sensitive configuration for Cloud Functions.
 *
 * These are plain constants (not secrets) - safe to commit and share across
 * functions. The Resend API key itself is NOT here; it's a credential and
 * lives in Firebase/Google Secret Manager instead (see emailService.js).
 */
module.exports = {
    EMAIL_FROM_ADDRESS: "noreply@cisclegalclinic.org",
    EMAIL_FROM_NAME: "CISC Legal Clinic",
    APP_LOGO_URL: "https://cisclegalclinic.org/img/cisc-logo.png",
    // Base URL of the deployed client app - used to build the custom
    // password-reset link (see passwordResetTokens.js).
    APP_BASE_URL: "https://cisclegalclinic.org",
    // How long a password-reset token stays valid before it's rejected.
    PASSWORD_RESET_TOKEN_TTL_MS: 48 * 60 * 60 * 1000, // 48 hours
    // ── Google Calendar / Meet ──────────────────────────────────────────────
    // The clinic's wall-clock zone. Slot times are stored bare ("5:30pm"), so
    // this is what tells Calendar which 5:30pm an appointment means.
    CLINIC_TIME_ZONE: "America/Los_Angeles",
    // Calendar that holds the generated meeting events. "primary" = the
    // calendar of whichever account the credentials below authenticate as;
    // swap in a calendar ID to keep clinic meetings off someone's own calendar.
    GOOGLE_CALENDAR_ID: "primary",
    // Service-account route ONLY (leave "" when using OAuth): the Workspace
    // user the service account impersonates via domain-wide delegation.
    GOOGLE_CALENDAR_USER: "",
    // How long a clinic appointment runs - the saved slots are an hour apart.
    MEETING_DURATION_MINUTES: 60,
    // Firebase Web API key - NOT a secret (same value already public in
    // client/src/main.jsx to initialize the client SDK; Firebase web API keys
    // are designed to be public, access is enforced by rules/App Check, not
    // key secrecy). Used server-side to verify sign-in via REST (see
    // completePasswordReset.js's same-password check).
    FIREBASE_WEB_API_KEY: "AIzaSyADNdwf_eraJtHEz6sI5FAWq_DPW4UbfF8",
};
