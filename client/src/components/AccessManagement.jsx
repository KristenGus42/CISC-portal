import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router";

const ROLES = ["Staff", "Admin", "Attorney", "Legal Student"];
const INVITE_ROLES = ["Staff", "Admin"];

export default function AccessManagement() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("Staff");
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message }
    const [deleteFeedback, setDeleteFeedback] = useState(null);
    const [resetFeedback, setResetFeedback] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToReset, setUserToReset] = useState(null);
    const [userToModifyRole, setUserToModifyRole] = useState(null);
    const [roleToModify, setRoleToModify] = useState("Staff");
    // Track locally which uids are disabled (toggled via cloud function)
    const [disabledUids, setDisabledUids] = useState(new Set());
    const [togglingUid, setTogglingUid] = useState(null);

    const db = getDatabase();
    const functions = getFunctions();

    // Cloud function callables
    const createUserAccount = httpsCallable(functions, "createUserAccount");
    const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
    const disableUserAccount = httpsCallable(functions, "disableUserAccount");
    const enableUserAccount = httpsCallable(functions, "enableUserAccount");
    const updateUserRole = httpsCallable(functions, "updateUserRole");

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
            // Sort alphabetically by name, then email as fallback
            formatted.sort((a, b) => {
                const nameA = (a.name || a.email || "").toLowerCase();
                const nameB = (b.name || b.email || "").toLowerCase();
                const cmp = nameA.localeCompare(nameB);
                if (cmp !== 0) return cmp;
                return (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
            });
            setUsers(formatted);
        });
        return () => unsubscribe();
    }, [db]);

    /** Invite a new user via Cloud Function */
    async function handleInvite(e) {
        e.preventDefault();
        setFeedback(null);
        setDeleteFeedback(null);
        setResetFeedback(null);

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (!trimmedEmail) {
            setFeedback({ type: "error", message: "Please enter an email address." });
            return;
        }
        if (!trimmedName) {
            setFeedback({ type: "error", message: "Please enter a name." });
            return;
        }

        setLoading(true);
        try {
            const result = await createUserAccount({ email: trimmedEmail, name: trimmedName, role });
            setFeedback({
                type: "success",
                message: result.data.message,
            });
            setEmail("");
            setName("");
            setRole("Staff");
        } catch (err) {
            console.error("Invite error:", err);
            let message = "Something went wrong. Please try again.";
            if (err.code === "functions/already-exists") {
                message = "This email is already registered.";
            } else if (err.code === "functions/invalid-argument") {
                message = err.message || "Please provide valid information.";
            } else if (err.code === "functions/permission-denied") {
                message = "You do not have permission to invite users.";
            }
            setFeedback({ type: "error", message });
        } finally {
            setLoading(false);
        }
    }

    /** Permanently delete a user's Auth account + RTDB record */
    async function confirmDelete() {
        if (!userToDelete) return;
        const deletedEmail = userToDelete.email;
        setDeleteFeedback(null);
        setResetFeedback(null);
        setLoading(true);
        try {
            await deleteUserAccount({ uid: userToDelete.uid });
            setUserToDelete(null);
            setDeleteFeedback({
                type: "success",
                message: `${deletedEmail} has been permanently removed.`,
            });
        } catch (err) {
            console.error("Delete error:", err);
            setDeleteFeedback({
                type: "error",
                message: `Failed to remove ${deletedEmail}. Please try again.`,
            });
        } finally {
            setLoading(false);
        }
    }

    /** Toggle Firebase Auth disabled flag for a user (no RTDB write) */
    async function handleToggleDisable(user) {
        const isDisabled = disabledUids.has(user.uid);
        setTogglingUid(user.uid);
        try {
            if (isDisabled) {
                await enableUserAccount({ uid: user.uid });
                setDisabledUids((prev) => {
                    const next = new Set(prev);
                    next.delete(user.uid);
                    return next;
                });
                setResetFeedback({
                    type: "success",
                    message: `${user.email}'s account has been re-enabled.`,
                });
            } else {
                await disableUserAccount({ uid: user.uid });
                setDisabledUids((prev) => new Set([...prev, user.uid]));
                setResetFeedback({
                    type: "success",
                    message: `${user.email}'s account has been disabled.`,
                });
            }
        } catch (err) {
            console.error("Toggle disable error:", err);
            setResetFeedback({
                type: "error",
                message: `Failed to update ${user.email}'s account status. Please try again.`,
            });
        } finally {
            setTogglingUid(null);
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

    /** Update an existing user's role */
    async function confirmRoleUpdate() {
        if (!userToModifyRole) return;
        const user = userToModifyRole;
        setFeedback(null);
        setDeleteFeedback(null);
        setResetFeedback(null);
        setLoading(true);

        try {
            const result = await updateUserRole({ uid: user.uid, role: roleToModify });
            setUserToModifyRole(null);
            setResetFeedback({
                type: "success",
                message: result.data?.message || `${user.email}'s role has been updated to ${roleToModify}.`,
            });
        } catch (err) {
            console.error("Role update error:", err);
            setResetFeedback({
                type: "error",
                message: `Failed to update ${user.email}'s role. Please try again.`,
            });
        } finally {
            setLoading(false);
        }
    }

    function getProfileName(user) {
        return user.name || user.email || "Unnamed User";
    }

    const filteredUsers = users.filter((user) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const userEmail = (user.email || "").toLowerCase();
        const userName = (user.name || "").toLowerCase();
        const userRole = (user.role || "").toLowerCase();
        return userEmail.includes(q) || userName.includes(q) || userRole.includes(q);
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

                            <div className="am-field am-field-name">
                                <label htmlFor="am-name" className="am-label">
                                    Name
                                </label>
                                <input
                                    id="am-name"
                                    type="text"
                                    className="am-input"
                                    placeholder="Michael Itti"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
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
                                    {INVITE_ROLES.map((r) => (
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

                {/* Users Table */}
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
                                placeholder="Search by Profile or Role"
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
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => {
                                        const isCurrentUser = user.uid === currentUser?.uid;
                                        const isDisabled = disabledUids.has(user.uid);
                                        const isToggling = togglingUid === user.uid;

                                        return (
                                        <tr key={user.uid} className={isDisabled ? "am-row-disabled" : ""}>
                                            <td>
                                                <div className="am-profile">
                                                    <span className="am-profile-icon" aria-hidden="true">
                                                        <span className="am-profile-icon-head"></span>
                                                        <span className="am-profile-icon-body"></span>
                                                    </span>
                                                    <div className="am-profile-copy">
                                                        <span className="am-profile-name">
                                                            {getProfileName(user)}
                                                            {isCurrentUser && (
                                                                <span className="am-inline-you-badge">You</span>
                                                            )}
                                                            {isDisabled && (
                                                                <span className="am-inline-disabled-badge">Disabled</span>
                                                            )}
                                                        </span>
                                                        <span className="am-profile-email">
                                                            {user.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`am-role-badge am-role-${user.role?.toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                {isCurrentUser ? (
                                                    <button
                                                        type="button"
                                                        className="am-action-btn am-manage-profile-btn"
                                                        title="Manage in Profile"
                                                        aria-label="Manage your account in Profile"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 20h9"></path>
                                                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                                                        </svg>
                                                        <span>Manage in Profile</span>
                                                    </button>
                                                ) : (
                                                    <div className="am-actions">
                                                        {/* View Profile (Attorney / Legal Student only) */}
                                                        {(user.role === "Attorney" || user.role === "Legal Student") && (
                                                            <button
                                                                type="button"
                                                                className="am-action-btn"
                                                                onClick={() => navigate(`/personnel-library/${user.uid}`)}
                                                                title="View Personnel Profile"
                                                                aria-label={`View personnel profile for ${user.email}`}
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                                    <circle cx="12" cy="7" r="4" />
                                                                </svg>
                                                                <span>View Profile</span>
                                                            </button>
                                                        )}

                                                        {/* Modify Role */}
                                                        <button
                                                            type="button"
                                                            className="am-action-btn"
                                                            onClick={() => {
                                                                setUserToModifyRole(user);
                                                                setRoleToModify(user.role || "Staff");
                                                            }}
                                                            title="Modify roles"
                                                            aria-label={`Modify roles for ${user.email}`}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="9" cy="7" r="4"></circle>
                                                                <path d="m16 11 2 2 4-4"></path>
                                                            </svg>
                                                            <span>Modify Role</span>
                                                        </button>

                                                        {/* Reset Password */}
                                                        <button
                                                            type="button"
                                                            className="am-action-btn"
                                                            onClick={() => setUserToReset(user)}
                                                            title="Reset password"
                                                            aria-label={`Reset password for ${user.email}`}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="5" y="11" width="10" height="8" rx="2"></rect>
                                                                <path d="M7 11V8a3 3 0 0 1 6 0v3"></path>
                                                                <path d="M18.5 8.5A5 5 0 0 0 10 5"></path>
                                                                <path d="M18.5 8.5V5"></path>
                                                                <path d="M18.5 8.5H15"></path>
                                                                <path d="M10 15h.01"></path>
                                                            </svg>
                                                            <span>Reset Password</span>
                                                        </button>

                                                        {/* Disable / Enable Account toggle */}
                                                        <button
                                                            type="button"
                                                            className={`am-action-btn ${isDisabled ? "am-action-btn-enable" : "am-action-btn-warning"}`}
                                                            onClick={() => handleToggleDisable(user)}
                                                            disabled={isToggling}
                                                            title={isDisabled ? "Enable account" : "Disable account"}
                                                            aria-label={`${isDisabled ? "Enable" : "Disable"} account for ${user.email}`}
                                                        >
                                                            {isToggling ? (
                                                                <span className="am-spinner am-spinner-sm" />
                                                            ) : isDisabled ? (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"></path>
                                                                    <path d="m9 12 2 2 4-4"></path>
                                                                </svg>
                                                            ) : (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                                                </svg>
                                                            )}
                                                            <span>{isToggling ? "Updating…" : isDisabled ? "Enable Account" : "Disable Account"}</span>
                                                        </button>

                                                        {/* Remove User (permanent) */}
                                                        <button
                                                            type="button"
                                                            className="am-action-btn am-action-btn-danger"
                                                            onClick={() => setUserToDelete(user)}
                                                            title="Remove user permanently"
                                                            aria-label={`Remove user ${user.email}`}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="9" cy="7" r="4"></circle>
                                                                <line x1="17" y1="8" x2="22" y2="13"></line>
                                                                <line x1="22" y1="8" x2="17" y2="13"></line>
                                                            </svg>
                                                            <span>Remove User</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
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
                            <h3 className="am-modal-title">Remove User</h3>
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
                            <p>Are you sure you want to permanently remove <strong>{userToDelete.name || userToDelete.email || "this user"}</strong>?</p>
                            <p className="am-modal-warning">This will delete their account and all associated data. This action cannot be undone.</p>
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
                                {loading ? "Removing..." : "Remove Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modify Role Modal */}
            {userToModifyRole && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">Modify Roles</h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={() => setUserToModifyRole(null)}
                                disabled={loading}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>Choose a new role for <strong>{userToModifyRole.email}</strong>.</p>
                            <select
                                className="am-select am-modal-select"
                                value={roleToModify}
                                onChange={(e) => setRoleToModify(e.target.value)}
                                disabled={loading}
                            >
                                {(userToModifyRole?.role === "Admin" || userToModifyRole?.role === "Staff"
                                    ? ["Staff", "Admin"]
                                    : ["Attorney", "Legal Student"]
                                ).map((roleOption) => (
                                    <option key={roleOption} value={roleOption}>
                                        {roleOption}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={() => setUserToModifyRole(null)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmRoleUpdate}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : "Save Role"}
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
