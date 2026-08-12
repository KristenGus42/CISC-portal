import { NavBar } from "./NavBar";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { getDatabase, ref, update as firebaseUpdate } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../auth/useAuth";
import { getAvatarColor, getInitials } from "../utils/avatar";
import { uploadAvatar, deleteStorageFile } from "../utils/storage";

// Typed exactly (case-sensitive) before the delete button unlocks
const DELETE_CONFIRM_PHRASE = "DELETE";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export default function Profile() {
    const navigate = useNavigate();
    const { user, userProfile, role, refreshUserProfile } = useAuth();
    const db = getDatabase();
    const functions = getFunctions();
    const fileInputRef = useRef(null);

    const [name, setName] = useState("");
    // Pending avatar change, applied on Save: a File to upload, or "remove"
    const [pendingPhoto, setPendingPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message }

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    // Seed the form once the profile record has loaded
    useEffect(() => {
        setName(userProfile?.name || "");
    }, [userProfile?.name]);

    // Release the object URL created for the local photo preview
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const email = userProfile?.email || user?.email || "";
    const savedPhotoUrl = userProfile?.photoURL || null;
    // What the avatar should show right now: local preview > saved photo > initials
    const displayedPhotoUrl =
        pendingPhoto === "remove" ? null : previewUrl || savedPhotoUrl;
    const displayName = name.trim() || email || "User";

    const nameChanged = name.trim() !== (userProfile?.name || "").trim();
    const nameIsEmpty = name.trim().length === 0;
    // Discard stays available whenever anything is dirty (including an emptied
    // name field); Save additionally requires a name to actually be present.
    const hasChanges = nameChanged || pendingPhoto !== null;
    const canSave = hasChanges && !nameIsEmpty;

    function handlePhotoSelected(e) {
        const file = e.target.files?.[0];
        // Allow re-selecting the same file after a cancel
        e.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setFeedback({ type: "error", message: "Please choose an image file." });
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            setFeedback({ type: "error", message: "Images must be 5 MB or smaller." });
            return;
        }

        setFeedback(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        setPendingPhoto(file);
    }

    function handleRemovePhoto() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPendingPhoto(savedPhotoUrl ? "remove" : null);
        setFeedback(null);
    }

    function handleDiscard() {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPendingPhoto(null);
        setName(userProfile?.name || "");
        setFeedback(null);
    }

    async function handleSave() {
        if (!user?.uid || !canSave) return;
        setSaving(true);
        setFeedback(null);

        const trimmedName = name.trim();
        const previousPhotoPath = userProfile?.photoPath || null;

        try {
            const profileUpdates = {};
            let newPhotoUrl = savedPhotoUrl;

            if (pendingPhoto === "remove") {
                profileUpdates.photoURL = null;
                profileUpdates.photoPath = null;
                newPhotoUrl = null;
            } else if (pendingPhoto) {
                const { url, path } = await uploadAvatar(user.uid, pendingPhoto);
                profileUpdates.photoURL = url;
                profileUpdates.photoPath = path;
                newPhotoUrl = url;
            }

            if (nameChanged) profileUpdates.name = trimmedName;

            // Target the user's RTDB node directly (/users/$uid) so security rules pass for non-admin users.
            // Only Admin/Staff can reach this page, so there is no attorneys/ or
            // legalStudents/ personnel record to keep in sync.
            await firebaseUpdate(ref(db, `users/${user.uid}`), profileUpdates);

            // Mirror onto the Firebase Auth record. Best-effort: users/ is the
            // source of truth everywhere in the portal, so a failure here must
            // not report the (already committed) save as failed.
            const currentUser = getAuth().currentUser;
            if (currentUser) {
                try {
                    await updateProfile(currentUser, {
                        displayName: trimmedName || currentUser.displayName || "",
                        photoURL: newPhotoUrl || "",
                    });
                } catch (err) {
                    console.error("Failed to sync Firebase Auth profile:", err);
                }
            }

            // Old image is only removed once the new one is safely recorded
            const photoReplacedOrRemoved =
                pendingPhoto !== null && previousPhotoPath && previousPhotoPath !== profileUpdates.photoPath;
            if (photoReplacedOrRemoved) {
                try {
                    await deleteStorageFile(previousPhotoPath);
                } catch (err) {
                    console.error("Failed to delete previous avatar:", err);
                }
            }

            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPendingPhoto(null);
            await refreshUserProfile();
            setFeedback({ type: "success", message: "Your profile has been updated." });
        } catch (err) {
            console.error("Profile save error:", err);
            setFeedback({
                type: "error",
                message: err.message || "Failed to save your profile. Please try again.",
            });
        } finally {
            setSaving(false);
        }
    }

    async function confirmPasswordReset() {
        setResetting(true);
        setFeedback(null);
        try {
            const requestOwnPasswordReset = httpsCallable(functions, "requestOwnPasswordReset");
            const result = await requestOwnPasswordReset();
            setShowResetModal(false);
            setFeedback({
                type: "success",
                message: result.data?.message || `Password reset email sent to ${email}.`,
            });
        } catch (err) {
            console.error("Password reset error:", err);
            setShowResetModal(false);
            setFeedback({
                type: "error",
                message: `Failed to send a password reset email to ${email}. Please try again.`,
            });
        } finally {
            setResetting(false);
        }
    }

    async function confirmDeleteAccount() {
        if (deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
        setDeleting(true);
        setFeedback(null);
        try {
            const deleteOwnAccount = httpsCallable(functions, "deleteOwnAccount");
            await deleteOwnAccount();
        } catch (err) {
            console.error("Delete account error:", err);
            setShowDeleteModal(false);
            setDeleteConfirmText("");
            setFeedback({
                type: "error",
                message:
                    err.code === "functions/failed-precondition"
                        ? err.message
                        : "Failed to delete your account. Please try again.",
            });
            setDeleting(false);
            return;
        }

        // The account is gone at this point — a failing sign-out must not be
        // reported as a failed deletion.
        try {
            await signOut(getAuth());
        } catch (err) {
            console.error("Sign-out after account deletion failed:", err);
        }
        navigate("/", { replace: true });
    }

    function closeDeleteModal() {
        setShowDeleteModal(false);
        setDeleteConfirmText("");
    }

    return (
        <>
            <NavBar title="Profile" />

            <div className="container py-5 pf-container">
                <div>
                    <p className="am-page-title mb-0 fw-bold">Profile</p>
                    <p className="am-page-subtitle text-muted small">
                        Manage your photo, name, and account settings
                    </p>
                </div>

                {feedback && (
                    <div
                        className={`am-feedback pf-feedback ${
                            feedback.type === "success" ? "am-feedback-success" : "am-feedback-error"
                        }`}
                    >
                        {feedback.type === "success" ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        )}
                        <span>{feedback.message}</span>
                    </div>
                )}

                {/* ── Personal details ── */}
                <div className="pf-card">
                    <div className="pf-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Personal Details</span>
                    </div>

                    <div className="pf-avatar-row">
                        {displayedPhotoUrl ? (
                            <img src={displayedPhotoUrl} alt="" className="pf-avatar pf-avatar-img" />
                        ) : (
                            <span
                                className="pf-avatar"
                                style={{ backgroundColor: getAvatarColor(user?.uid) }}
                                aria-hidden="true"
                            >
                                {getInitials(displayName)}
                            </span>
                        )}

                        <div className="pf-avatar-actions">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="pf-file-input"
                                onChange={handlePhotoSelected}
                            />
                            <div className="pf-avatar-buttons">
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={saving}
                                >
                                    {displayedPhotoUrl ? "Change Photo" : "Upload Photo"}
                                </button>
                                {displayedPhotoUrl && (
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-ghost"
                                        onClick={handleRemovePhoto}
                                        disabled={saving}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="pf-hint">JPG, PNG, or GIF up to 5 MB.</p>
                        </div>
                    </div>

                    <div className="pf-field-grid">
                        <div className="am-field">
                            <label htmlFor="pf-name" className="am-label">Name</label>
                            <input
                                id="pf-name"
                                type="text"
                                className="am-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={saving}
                                placeholder="Your full name"
                            />
                            {nameIsEmpty && (
                                <p className="pf-hint pf-hint-error">Name cannot be empty.</p>
                            )}
                        </div>

                        <div className="am-field">
                            <label htmlFor="pf-email" className="am-label">Email</label>
                            <input
                                id="pf-email"
                                type="email"
                                className="am-input"
                                value={email}
                                readOnly
                                disabled
                            />
                            <p className="pf-hint">Contact an administrator to change your email.</p>
                        </div>

                        <div className="am-field">
                            <span className="am-label">Role</span>
                            <span className={`am-role-badge pf-role-badge am-role-${(role || "").toLowerCase().replace(/\s+/g, "-")}`}>
                                {role}
                            </span>
                        </div>
                    </div>

                    <div className="pf-card-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-ghost"
                            onClick={handleDiscard}
                            disabled={!hasChanges || saving}
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            className="am-invite-btn"
                            onClick={handleSave}
                            disabled={!canSave || saving}
                        >
                            {saving && <span className="am-spinner" />}
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* ── Password ── */}
                <div className="pf-card">
                    <div className="pf-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Password</span>
                    </div>

                    <div className="pf-row">
                        <div>
                            <p className="pf-row-title">Reset your password</p>
                            <p className="pf-hint mb-0">
                                We&apos;ll email a secure reset link to {email || "your address"}.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setShowResetModal(true)}
                            disabled={resetting}
                        >
                            Reset Password
                        </button>
                    </div>
                </div>

                {/* ── Danger zone ── */}
                <div className="pf-card pf-card-danger">
                    <div className="pf-card-header pf-card-header-danger">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Danger Zone</span>
                    </div>

                    <div className="pf-row">
                        <div>
                            <p className="pf-row-title">Delete your account</p>
                            <p className="pf-hint mb-0">
                                Permanently removes your account and portal access. This cannot be undone.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-btn pf-btn-danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Reset Password Confirmation Modal */}
            {showResetModal && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">Reset Password</h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={() => setShowResetModal(false)}
                                disabled={resetting}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>Send a password reset link to <strong>{email}</strong>?</p>
                            <p className="pf-hint mb-0">Your current password stays active until you use the link.</p>
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={() => setShowResetModal(false)}
                                disabled={resetting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmPasswordReset}
                                disabled={resetting}
                            >
                                {resetting ? "Sending..." : "Send Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Confirmation Modal — requires typing the phrase */}
            {showDeleteModal && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">Delete Account</h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>
                                This permanently deletes <strong>{email}</strong> and all associated
                                account data. You will be signed out immediately.
                            </p>
                            <p className="am-modal-warning">This action cannot be undone.</p>
                            <label htmlFor="pf-delete-confirm" className="am-label pf-delete-label">
                                Type <strong>{DELETE_CONFIRM_PHRASE}</strong> to confirm
                            </label>
                            <input
                                id="pf-delete-confirm"
                                type="text"
                                className="am-input pf-delete-input"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={DELETE_CONFIRM_PHRASE}
                                autoComplete="off"
                                disabled={deleting}
                            />
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmDeleteAccount}
                                disabled={deleting || deleteConfirmText !== DELETE_CONFIRM_PHRASE}
                            >
                                {deleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
