const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin");
const { defineSecret } = require("firebase-functions/params");
const { SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME, APP_LOGO_URL, APP_BASE_URL } = require("./config");
const { createPasswordResetToken } = require("./passwordResetTokens");

// Backed by Google Cloud Secret Manager (set via `firebase functions:secrets:set SENDGRID_API_KEY`),
// keeping the credential encrypted/access-controlled instead of sitting in plain
// config. Any onCall function that (transitively) sends email must list this in
// its `secrets` option so the runtime injects it into process.env.
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

const FROM_EMAIL = SENDGRID_FROM_EMAIL;
const FROM_NAME = SENDGRID_FROM_NAME;
const LOGO_URL = APP_LOGO_URL;

let sendgridInitialized = false;

function ensureSendgridInitialized() {
    if (sendgridInitialized) return;
    if (!process.env.SENDGRID_API_KEY) {
        throw new Error("SENDGRID_API_KEY is not set.");
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridInitialized = true;
}

/**
 * Generates our own time-limited password-reset link (see
 * passwordResetTokens.js - 48h validity, unlike Firebase's fixed ~1h OOB
 * codes) and sends it via SendGrid using a simple branded template.
 *
 * NOTE: subject/body copy below is placeholder text - update wording as desired.
 */
async function sendPasswordResetEmail(email) {
    ensureSendgridInitialized();

    // Look up the uid so the token can be tied to this specific account.
    // Throws auth/user-not-found if there's no matching Firebase Auth user -
    // callers already handle that error code.
    const userRecord = await admin.auth().getUserByEmail(email);
    const token = await createPasswordResetToken(userRecord.uid);
    const resetLink = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;

    const subject = "Reset your CISC Legal Clinic Portal password";
    const text =
        `Hello,\n\n` +
        `We received a request to reset the password for your CISC Legal Clinic Portal account (${email}).\n\n` +
        `Reset your password using the link below:\n${resetLink}\n\n` +
        `If you didn't request this, you can safely ignore this email - your password will not be changed.\n\n` +
        `- CISC Legal Clinic`;

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
            <div style="text-align: center; padding: 24px 0 8px;">
                <img src="${LOGO_URL}" alt="CISC Legal Clinic" style="max-width: 160px; height: auto;" />
            </div>
            <h2 style="text-align: center; font-size: 20px; margin: 16px 0;">Reset your password</h2>
            <p style="font-size: 14px; line-height: 1.6;">
                We received a request to reset the password for your CISC Legal Clinic Portal account
                (<strong>${email}</strong>).
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}"
                   style="background-color: #0b5394; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 13px; line-height: 1.6; color: #555555;">
                If the button above doesn't work, copy and paste this link into your browser:<br />
                <a href="${resetLink}" style="color: #0b5394; word-break: break-all;">${resetLink}</a>
            </p>
            <p style="font-size: 13px; line-height: 1.6; color: #555555;">
                If you didn't request this, you can safely ignore this email - your password will not be changed.
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #999999; text-align: center;">CISC Legal Clinic</p>
        </div>
    `;

    await sgMail.send({
        to: email,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        text,
        html,
    });
}

module.exports = { sendPasswordResetEmail, sendgridApiKey };
