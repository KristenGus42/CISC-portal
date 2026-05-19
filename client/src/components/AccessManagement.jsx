import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
} from "firebase/auth";
import { getDatabase, ref, set, onValue, remove } from "firebase/database";

// Firebase config (same as main.jsx — needed for the secondary app instance)
const firebaseConfig = {
    apiKey: "AIzaSyADNdwf_eraJtHEz6sI5FAWq_DPW4UbfF8",
    authDomain: "cisc-portal.firebaseapp.com",
    databaseURL: "https://cisc-portal-default-rtdb.firebaseio.com",
    projectId: "cisc-portal",
    storageBucket: "cisc-portal.firebasestorage.app",
    messagingSenderId: "789232261204",
    appId: "1:789232261204:web:3f8203a777e3218e3a35c1",
    measurementId: "G-N9VMCVB51E",
};

const ROLES = ["Staff", "Admin", "Attorney"];

export default function AccessManagement() {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Staff");
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message }
    const [deleteFeedback, setDeleteFeedback] = useState(null); // { type: "success" | "error", message }
    const [resetFeedback, setResetFeedback] = useState(null); // { type: "success" | "error", message }
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [resettingUserId, setResettingUserId] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToReset, setUserToReset] = useState(null);

    const db = getDatabase();

    // Listen for the users/ node in RTDB
    useEffect(() => {
        const usersRef = ref(db, "users");
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const usersObj = snapshot.val();
            if (!usersObj) {
                setUsers([]);
                return;
            }
            const formatted = Object.keys(usersObj).map((uid) => ({
                uid,
                ...usersObj[uid],
            }));
            // Sort by invitedAt descending (newest first)
            formatted.sort((a, b) => (b.invitedAt || 0) - (a.invitedAt || 0));
            setUsers(formatted);
        });
        return () => unsubscribe();
    }, [db]);

    /** Generate a cryptographically random password */
    function generatePassword(length = 16) {
        const charset =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
        const values = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(values, (v) => charset[v % charset.length]).join("");
    }

    /** Invite a new user */
    async function handleInvite(e) {
        e.preventDefault();
        setFeedback(null);
        setDeleteFeedback(null);
        setResetFeedback(null);

        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setFeedback({ type: "error", message: "Please enter an email address." });
            return;
        }

        setLoading(true);

        try {
            // 1. Create a secondary Firebase App so we don't clobber the admin session
            const secondaryApp = initializeApp(firebaseConfig, "secondary");
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create the user with a random password
            const tempPassword = generatePassword();
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                trimmedEmail,
                tempPassword
            );
            const uid = userCredential.user.uid;

            // 3. Sign out of secondary auth immediately
            await signOut(secondaryAuth);

            // 4. Delete the secondary app instance
            await deleteApp(secondaryApp);

            // 5. Send a password-reset email via the primary auth so the user can set their own password
            const primaryAuth = getAuth();
            await sendPasswordResetEmail(primaryAuth, trimmedEmail);

            // 6. Store the user record in RTDB under users/{uid}
            const userRef = ref(db, `users/${uid}`);
            await set(userRef, {
                email: trimmedEmail,
                role: role,
                invitedAt: Date.now(),
            });

            setFeedback({
                type: "success",
                message: `Invite sent to ${trimmedEmail}. A password reset email has been delivered.`,
            });
            setEmail("");
            setRole("Staff");
        } catch (err) {
            console.error("Invite error:", err);

            // Clean up secondary app if it still exists
            const secondary = getApps().find((a) => a.name === "secondary");
            if (secondary) {
                try { await deleteApp(secondary); } catch (_) { /* ignore */ }
            }

            let message = "Something went wrong. Please try again.";
            if (err.code === "auth/email-already-in-use") {
                message = "This email is already registered.";
            } else if (err.code === "auth/invalid-email") {
                message = "Please enter a valid email address.";
            }
            setFeedback({ type: "error", message });
        } finally {
            setLoading(false);
        }
    }

    /** Delete a user */
    async function confirmDelete() {
        if (!userToDelete) return;
        const deletedEmail = userToDelete.email;
        setDeleteFeedback(null);
        setResetFeedback(null);
        setLoading(true);
        try {
            const userRef = ref(db, `users/${userToDelete.uid}`);
            await remove(userRef);
            setUserToDelete(null);
            setDeleteFeedback({
                type: "success",
                message: `${deletedEmail} has been deleted.`,
            });
        } catch (err) {
            console.error("Delete error:", err);
            setDeleteFeedback({
                type: "error",
                message: `Failed to delete ${deletedEmail}. Please try again.`,
            });
        } finally {
            setLoading(false);
        }
    }

    /** Send a password reset email to an existing user */
    async function confirmPasswordReset() {
        if (!userToReset?.email) return;
        const user = userToReset;
        setFeedback(null);
        setDeleteFeedback(null);
        setResetFeedback(null);
        setLoading(true);

        try {
            const primaryAuth = getAuth();
            await sendPasswordResetEmail(primaryAuth, user.email);
            setUserToReset(null);
            setResetFeedback({
                type: "success",
                message: `Password reset email sent to ${user.email}.`,
            });
        } catch (err) {
            console.error("Password reset error:", err);
            let message = `Failed to send password reset email to ${user.email}.`;
            if (err.code === "auth/invalid-email") {
                message = "Please enter a valid email address.";
            } else if (err.code === "auth/user-not-found") {
                message = `${user.email} was not found in Firebase Auth.`;
            }
            setUserToReset(null);
            setResetFeedback({ type: "error", message });
        } finally {
            setLoading(false);
        }
    }

    /** Format a timestamp to a readable date string */
    function formatDate(timestamp) {
        if (!timestamp) return "—";
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    const filteredUsers = users.filter((user) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const userEmail = (user.email || "").toLowerCase();
        const userRole = (user.role || "").toLowerCase();
        return userEmail.includes(q) || userRole.includes(q);
    });

    return (
        <>
            <NavBar active={"access-management"} />

            <div className="container py-5 am-responsive-container">
                {/* Page Header */}
                <div>
                    <p className="am-page-title mb-0 fw-bold">Access Management</p>
                    <p className="am-page-subtitle text-muted small">
                        Invite new users and manage portal access
                    </p>
                </div>

                {/* Invite User Card */}
                <div className="am-invite-card">
                    <div className="am-invite-card-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="17" y1="11" x2="23" y2="11" />
                        </svg>
                        <span>Invite New User</span>
                    </div>

                    <form onSubmit={handleInvite} className="am-invite-form">
                        <div className="am-form-row">
                            <div className="am-field am-field-email">
                                <label htmlFor="am-email" className="am-label">
                                    Email Address
                                </label>
                                <input
                                    id="am-email"
                                    type="email"
                                    className="am-input"
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="am-field am-field-role">
                                <label htmlFor="am-role" className="am-label">
                                    Role
                                </label>
                                <select
                                    id="am-role"
                                    className="am-select"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={loading}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="am-invite-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="am-spinner" />
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                                {loading ? "Sending…" : "Send Invite"}
                            </button>
                        </div>
                    </form>

                    {/* Feedback message */}
                    {feedback && (
                        <div
                            className={`am-feedback ${
                                feedback.type === "success"
                                    ? "am-feedback-success"
                                    : "am-feedback-error"
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
                </div>

                {/* Invited Users Table */}
                <div className="am-users-section">
                    <p className="am-section-title fw-bold">Users</p>

                    <div className="am-users-toolbar">
                        <div className="am-search-container">
                            <svg className="am-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                type="text"
                                className="am-search-input form-control"
                                placeholder="Search by Email or Role"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {deleteFeedback && (
                        <div
                            className={`am-feedback am-delete-feedback ${
                                deleteFeedback.type === "success"
                                    ? "am-feedback-success"
                                    : "am-feedback-error"
                            }`}
                        >
                            {deleteFeedback.type === "success" ? (
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
                            <span>{deleteFeedback.message}</span>
                        </div>
                    )}

                    {resetFeedback && (
                        <div
                            className={`am-feedback am-reset-feedback ${
                                resetFeedback.type === "success"
                                    ? "am-feedback-success"
                                    : "am-feedback-error"
                            }`}
                        >
                            {resetFeedback.type === "success" ? (
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
                            <span>{resetFeedback.message}</span>
                        </div>
                    )}

                    {users.length === 0 ? (
                        <p className="text-muted small text-center" style={{ marginTop: "2rem" }}>
                            No users have been invited yet.
                        </p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-muted small text-center" style={{ marginTop: "2rem" }}>
                            No users found.
                        </p>
                    ) : (
                        <div className="am-table-wrapper">
                            <table className="am-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Invited</th>
                                        <th>Password</th>
                                        <th>Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.uid}>
                                            <td className="am-table-email">{user.email}</td>
                                            <td>
                                                <span className={`am-role-badge am-role-${user.role?.toLowerCase()}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="am-table-date">
                                                {formatDate(user.invitedAt)}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="am-reset-btn"
                                                    onClick={() => setUserToReset(user)}
                                                >
                                                    Reset
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="am-delete-btn"
                                                    onClick={() => setUserToDelete(user)}
                                                    title="Delete user"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">Delete User</h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={() => setUserToDelete(null)}
                                disabled={loading}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>Are you sure you want to delete <strong>{userToDelete.email}</strong>?</p>
                            <p className="am-modal-warning">This action cannot be undone.</p>
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={() => setUserToDelete(null)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmDelete}
                                disabled={loading}
                            >
                                {loading ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {userToReset && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">Reset Password</h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={() => setUserToReset(null)}
                                disabled={loading}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>Are you sure you want to send a password reset email to <strong>{userToReset.email}</strong>?</p>
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={() => setUserToReset(null)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmPasswordReset}
                                disabled={loading}
                            >
                                {loading ? "Sending..." : "Send Email"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
