import { NavBar } from "./NavBar";
import { useState, useEffect, useRef } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router";
import { getAvatarColor, getInitials } from "../utils/avatar";

const ROLES = ["Staff", "Admin", "Attorney", "Legal Student"];
const INVITE_ROLES = ["Staff", "Admin"];

// ─── Filter / sort constants ───────────────────────────────────────────────────
const AM_ROLE_OPTIONS = ["Staff", "Admin", "Attorney", "Legal Student"];
const AM_STATUS_OPTIONS = ["Active", "Pending", "Disabled"];
const AM_SORT_OPTIONS = [
    { value: "name",      label: "Alphabetical" },
    { value: "dateJoined", label: "Joined" },
];
const AM_EMPTY_FILTERS = { roles: [], statuses: [] };

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
    // Firebase Auth status per uid: { disabled, lastSignInTime } — powers the Status column
    const [authStatusMap, setAuthStatusMap] = useState({});
    const [authStatusLoaded, setAuthStatusLoaded] = useState(false);
    const [togglingUid, setTogglingUid] = useState(null);
    // Track which user's actions dropdown is currently open
    const [openMenuUid, setOpenMenuUid] = useState(null);
    // Multi-select mode for bulk actions
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedUids, setSelectedUids] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null); // "reset" | "disable" | "remove"
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkFeedback, setBulkFeedback] = useState(null);
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage, setUsersPerPage] = useState(10);
    const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
    // Filter / sort
    const [amFilters, setAmFilters] = useState(AM_EMPTY_FILTERS);
    const [amSortBy, setAmSortBy] = useState("name");
    const [amSortDir, setAmSortDir] = useState("asc");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);

    const db = getDatabase();
    const functions = getFunctions();

    // Cloud function callables
    const createUserAccount = httpsCallable(functions, "createUserAccount");
    const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
    const disableUserAccount = httpsCallable(functions, "disableUserAccount");
    const enableUserAccount = httpsCallable(functions, "enableUserAccount");
    const updateUserRole = httpsCallable(functions, "updateUserRole");
    const getUserAuthStatuses = httpsCallable(functions, "getUserAuthStatuses");
    const requestPasswordReset = httpsCallable(functions, "requestPasswordReset");

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

    // Fetch each user's Firebase Auth status (disabled / last sign-in) for the Status column
    useEffect(() => {
        let cancelled = false;
        getUserAuthStatuses()
            .then((result) => {
                if (cancelled) return;
                setAuthStatusMap(result.data?.statuses || {});
                setAuthStatusLoaded(true);
            })
            .catch((err) => {
                console.error("getUserAuthStatuses error:", err);
                if (!cancelled) setAuthStatusLoaded(true);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset to the first page whenever the search, filters, or page size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, usersPerPage, amFilters, amSortBy, amSortDir]);

    // Close filter panel on outside click or Escape
    useEffect(() => {
        if (!isFilterOpen) return;
        const onPointerDown = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
        };
        const onKeyDown = (e) => { if (e.key === "Escape") setIsFilterOpen(false); };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isFilterOpen]);

    // Close the open actions dropdown when clicking outside of it
    useEffect(() => {
        if (!openMenuUid) return;
        function handleClickOutside(e) {
            if (!e.target.closest(".am-actions-menu")) {
                setOpenMenuUid(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuUid]);

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
        const isDisabled = authStatusMap[user.uid]?.disabled === true;
        setTogglingUid(user.uid);
        try {
            if (isDisabled) {
                await enableUserAccount({ uid: user.uid });
                setAuthStatusMap((prev) => ({
                    ...prev,
                    [user.uid]: { ...prev[user.uid], disabled: false },
                }));
                setResetFeedback({
                    type: "success",
                    message: `${user.email}'s account has been re-enabled.`,
                });
            } else {
                await disableUserAccount({ uid: user.uid });
                setAuthStatusMap((prev) => ({
                    ...prev,
                    [user.uid]: { ...prev[user.uid], disabled: true },
                }));
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
            const result = await requestPasswordReset({ uid: user.uid });
            setUserToReset(null);
            setResetFeedback({
                type: "success",
                message: result.data?.message || `Password reset email sent to ${user.email}.`,
            });
        } catch (err) {
            console.error("Password reset error:", err);
            setUserToReset(null);
            setResetFeedback({
                type: "error",
                message: `Failed to send password reset email to ${user.email}.`,
            });
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

    /** Active / Pending / Disabled, derived from the user's Firebase Auth record */
    function getUserStatus(uid) {
        const info = authStatusMap[uid];
        if (info?.disabled) return "Disabled";
        if (!info?.lastSignInTime) return "Pending";
        return "Active";
    }

    /** Formats the user's joined/created date */
    function formatDateJoined(user) {
        const raw = user.dateJoined || user.dateAdded || authStatusMap[user.uid]?.creationTime;
        if (!raw) return "—";
        const d = new Date(raw);
        return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    /** Toggle multi-select mode on/off, clearing any selection */
    function toggleMultiSelectMode() {
        setMultiSelectMode((prev) => !prev);
        setSelectedUids(new Set());
    }

    /** Toggle a single user's checkbox in multi-select mode */
    function toggleUserSelected(uid) {
        setSelectedUids((prev) => {
            const next = new Set(prev);
            if (next.has(uid)) {
                next.delete(uid);
            } else {
                next.add(uid);
            }
            return next;
        });
    }

    /** Run the confirmed bulk action (reset password / disable / remove) across all selected users */
    async function confirmBulkAction() {
        if (!bulkAction) return;
        const targetUsers = users.filter((u) => selectedUids.has(u.uid));
        if (targetUsers.length === 0) return;

        setBulkLoading(true);
        setBulkFeedback(null);
        const failedEmails = [];

        for (const user of targetUsers) {
            try {
                if (bulkAction === "reset") {
                    await requestPasswordReset({ uid: user.uid });
                } else if (bulkAction === "disable") {
                    await disableUserAccount({ uid: user.uid });
                    setAuthStatusMap((prev) => ({
                        ...prev,
                        [user.uid]: { ...prev[user.uid], disabled: true },
                    }));
                } else if (bulkAction === "remove") {
                    await deleteUserAccount({ uid: user.uid });
                }
            } catch (err) {
                console.error(`Bulk ${bulkAction} error for ${user.email}:`, err);
                failedEmails.push(user.email);
            }
        }

        const actionLabel =
            bulkAction === "reset" ? "sent a password reset email to"
            : bulkAction === "disable" ? "disabled"
            : "removed";
        const succeededCount = targetUsers.length - failedEmails.length;

        let message = "";
        let type = "success";
        if (failedEmails.length === 0) {
            message = `Successfully ${actionLabel} ${succeededCount} user${succeededCount === 1 ? "" : "s"}.`;
        } else if (succeededCount === 0) {
            type = "error";
            message = `Failed to ${bulkAction === "reset" ? "reset password for" : bulkAction} ${failedEmails.length === 1 ? "" : "any users: "}${failedEmails.join(", ")}.`;
        } else {
            type = "error";
            message = `${actionLabel} ${succeededCount} user${succeededCount === 1 ? "" : "s"}, but failed for: ${failedEmails.join(", ")}.`;
        }

        setBulkFeedback({ type, message });
        setBulkAction(null);
        setSelectedUids(new Set());
        setBulkLoading(false);
    }

    // Toggle a filter value in/out of its group
    function toggleAmFilter(group, value) {
        setAmFilters((prev) => {
            const current = prev[group];
            return {
                ...prev,
                [group]: current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value],
            };
        });
    }

    function selectAmSort(value) {
        if (amSortBy === value) {
            setAmSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setAmSortBy(value);
            setAmSortDir("asc");
        }
    }

    // Flattened active filters for the chip row + count badge
    const activeAmFilters = [
        ...amFilters.roles.map((v) => ({ group: "roles", value: v })),
        ...amFilters.statuses.map((v) => ({ group: "statuses", value: v })),
    ];

    const filteredUsers = users
        .filter((user) => {
            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const userEmail = (user.email || "").toLowerCase();
                const userName  = (user.name  || "").toLowerCase();
                const userRole  = (user.role  || "").toLowerCase();
                if (!userEmail.includes(q) && !userName.includes(q) && !userRole.includes(q)) return false;
            }
            // Role filter
            if (amFilters.roles.length > 0 && !amFilters.roles.includes(user.role)) return false;
            // Status filter
            if (amFilters.statuses.length > 0) {
                const status = getUserStatus(user.uid);
                if (!amFilters.statuses.includes(status)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            let cmp = 0;
            if (amSortBy === "name") {
                const nameA = (a.name || a.email || "").toLowerCase();
                const nameB = (b.name || b.email || "").toLowerCase();
                cmp = nameA.localeCompare(nameB);
            } else if (amSortBy === "dateJoined") {
                const tA = authStatusMap[a.uid]?.lastSignInTime ? new Date(authStatusMap[a.uid].lastSignInTime).getTime() : 0;
                const tB = authStatusMap[b.uid]?.lastSignInTime ? new Date(authStatusMap[b.uid].lastSignInTime).getTime() : 0;
                cmp = tA - tB;
            }
            return amSortDir === "asc" ? cmp : -cmp;
        });

    const totalUsers = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalUsers / usersPerPage));
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, totalUsers);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    /** Build a compact page-number list with "..." gaps, e.g. [1, 2, 3, "...", 6] */
    function getPageNumbers(current, total) {
        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        const pages = new Set([1, 2, 3, total, current, current - 1, current + 1]);
        const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
        const result = [];
        let prev = 0;
        for (const p of sorted) {
            if (prev && p - prev > 1) result.push("...");
            result.push(p);
            prev = p;
        }
        return result;
    }

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

                        {/* Filter button + panel — mirrors CaseLibrary's cl-filter-wrapper */}
                        <div className="cl-filter-wrapper" ref={filterRef}>
                            <button
                                type="button"
                                className="cl-filter-btn"
                                onClick={() => setIsFilterOpen((o) => !o)}
                                aria-expanded={isFilterOpen}
                                aria-haspopup="true"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                Filter
                                {activeAmFilters.length > 0 && (
                                    <span className="cl-filter-count">{activeAmFilters.length}</span>
                                )}
                            </button>

                            {isFilterOpen && (
                                <div className="cl-filter-panel">
                                    {/* Sort */}
                                    <div className="cl-filter-sort">
                                        <p className="cl-filter-group-label">Sort by</p>
                                        <div className="cl-filter-sort-row">
                                            {AM_SORT_OPTIONS.map((opt) => (
                                                <label className="cl-filter-option" key={opt.value}>
                                                    <input
                                                        type="radio"
                                                        name="am-sort-by"
                                                        checked={amSortBy === opt.value}
                                                        onChange={() => selectAmSort(opt.value)}
                                                    />
                                                    {opt.label}
                                                </label>
                                            ))}
                                            <button
                                                type="button"
                                                className="cl-sort-direction-btn"
                                                onClick={() => setAmSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                                                title={`Sorted ${amSortDir === "asc" ? "A → Z / Oldest" : "Z → A / Newest"} — click to reverse`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                                                    <path fillRule="evenodd" d="M11.5 15a.5.5 0 0 1-.5-.5V2.707L8.354 5.354a.5.5 0 1 1-.708-.708l3.5-3.5a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.708.708L12 2.707V14.5a.5.5 0 0 1-.5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z" />
                                                </svg>
                                                {amSortDir === "asc" ? "A → Z" : "Z → A"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Role filter */}
                                    <div className="cl-filter-group">
                                        <p className="cl-filter-group-label">Role</p>
                                        <div className="cl-filter-options">
                                            {AM_ROLE_OPTIONS.map((r) => (
                                                <label className="cl-filter-option" key={r}>
                                                    <input
                                                        type="checkbox"
                                                        checked={amFilters.roles.includes(r)}
                                                        onChange={() => toggleAmFilter("roles", r)}
                                                    />
                                                    {r}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status filter */}
                                    <div className="cl-filter-group">
                                        <p className="cl-filter-group-label">Status</p>
                                        <div className="cl-filter-options">
                                            {AM_STATUS_OPTIONS.map((s) => (
                                                <label className="cl-filter-option" key={s}>
                                                    <input
                                                        type="checkbox"
                                                        checked={amFilters.statuses.includes(s)}
                                                        onChange={() => toggleAmFilter("statuses", s)}
                                                    />
                                                    {s}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Multi-select toggle — moved here from toolbar */}
                                    <div className="cl-filter-group">
                                        <p className="cl-filter-group-label">Bulk Actions</p>
                                        <button
                                            type="button"
                                            className={`am-multiselect-btn ${multiSelectMode ? "am-multiselect-btn-active" : ""}`}
                                            onClick={toggleMultiSelectMode}
                                            style={{ width: "100%" }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 11 12 14 22 4" />
                                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                            </svg>
                                            <span>{multiSelectMode ? "Exit Multi Select" : "Multi Select"}</span>
                                        </button>
                                    </div>

                                    <div className="cl-filter-panel-footer">
                                        <span className="text-muted small">
                                            {filteredUsers.length} of {users.length} user{users.length === 1 ? "" : "s"}
                                        </span>
                                        <button
                                            type="button"
                                            className="cl-filter-clear-btn"
                                            onClick={() => setAmFilters(AM_EMPTY_FILTERS)}
                                            disabled={activeAmFilters.length === 0}
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {activeAmFilters.length > 0 && (
                        <div className="cl-filter-chips">
                            {activeAmFilters.map(({ group, value }) => (
                                <span className="cl-filter-chip" key={`${group}-${value}`}>
                                    {value}
                                    <button
                                        type="button"
                                        onClick={() => toggleAmFilter(group, value)}
                                        aria-label={`Remove ${value} filter`}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </span>
                            ))}
                            <button type="button" className="cl-filter-clear-btn" onClick={() => setAmFilters(AM_EMPTY_FILTERS)}>
                                Clear all
                            </button>
                        </div>
                    )}

                    {bulkFeedback && (
                        <div
                            className={`am-feedback am-bulk-feedback ${
                                bulkFeedback.type === "success"
                                    ? "am-feedback-success"
                                    : "am-feedback-error"
                            }`}
                        >
                            {bulkFeedback.type === "success" ? (
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
                            <span>{bulkFeedback.message}</span>
                        </div>
                    )}

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
                        <>
                        <div className="am-table-wrapper">
                            <table className="am-table">
                                <thead>
                                    <tr>
                                        {multiSelectMode && <th className="am-checkbox-col"></th>}
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedUsers.map((user) => {
                                        const isCurrentUser = user.uid === currentUser?.uid;
                                        const isDisabled = authStatusMap[user.uid]?.disabled === true;
                                        const isToggling = togglingUid === user.uid;
                                        const userStatus = getUserStatus(user.uid);

                                        return (
                                        <tr key={user.uid}>
                                            {multiSelectMode && (
                                                <td className="am-checkbox-col">
                                                    <input
                                                        type="checkbox"
                                                        className="am-row-checkbox"
                                                        checked={selectedUids.has(user.uid)}
                                                        onChange={() => toggleUserSelected(user.uid)}
                                                        disabled={isCurrentUser}
                                                        aria-label={`Select ${user.email}`}
                                                    />
                                                </td>
                                            )}
                                            <td>
                                                <div className="am-profile">
                                                    {user.photoURL ? (
                                                        <img
                                                            src={user.photoURL}
                                                            alt=""
                                                            className="am-profile-icon am-profile-photo"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="am-profile-icon"
                                                            style={{ backgroundColor: getAvatarColor(user.uid) }}
                                                            aria-hidden="true"
                                                        >
                                                            {getInitials(user.name || user.email)}
                                                        </span>
                                                    )}
                                                    <div className="am-profile-copy">
                                                        <span className="am-profile-name">
                                                            {getProfileName(user)}
                                                            {isCurrentUser && (
                                                                <span className="am-inline-you-badge">You</span>
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
                                                {authStatusLoaded ? (
                                                    <span className={`am-status-badge am-status-${userStatus.toLowerCase()}`}>
                                                        <span className="am-status-dot"></span>
                                                        {userStatus}
                                                    </span>
                                                ) : (
                                                    <span className="am-status-placeholder">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="am-date-joined-text">
                                                    {formatDateJoined(user)}
                                                </span>
                                            </td>
                                            <td className="am-actions-cell">
                                                {isCurrentUser ? (
                                                    <button
                                                        type="button"
                                                        className="am-action-btn am-manage-profile-btn"
                                                        title="Profile"
                                                        aria-label="Manage your account in Profile"
                                                        onClick={() => navigate("/profile")}
                                                    >
                                                        <span>Profile</span>
                                                    </button>
                                                ) : (
                                                    <div className="am-actions-menu">
                                                        <button
                                                            type="button"
                                                            className="am-action-btn am-kebab-btn"
                                                            onClick={() =>
                                                                setOpenMenuUid((prev) => (prev === user.uid ? null : user.uid))
                                                            }
                                                            title="More actions"
                                                            aria-label={`More actions for ${user.email}`}
                                                            aria-haspopup="true"
                                                            aria-expanded={openMenuUid === user.uid}
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                <circle cx="12" cy="5" r="1.75"></circle>
                                                                <circle cx="12" cy="12" r="1.75"></circle>
                                                                <circle cx="12" cy="19" r="1.75"></circle>
                                                            </svg>
                                                        </button>

                                                        {openMenuUid === user.uid && (
                                                            <div className="am-dropdown-menu" role="menu">
                                                                {isDisabled ? (
                                                                    /* Disabled accounts can only be re-enabled */
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="am-dropdown-item am-dropdown-item-enable"
                                                                        onClick={() => {
                                                                            setOpenMenuUid(null);
                                                                            handleToggleDisable(user);
                                                                        }}
                                                                        disabled={isToggling}
                                                                    >
                                                                        {isToggling && <span className="am-spinner am-spinner-sm" />}
                                                                        <span>{isToggling ? "Updating…" : "Enable Account"}</span>
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        {/* View Record (Attorney / Legal Student only) */}
                                                                        {(user.role === "Attorney" || user.role === "Legal Student") && (
                                                                            <button
                                                                                type="button"
                                                                                role="menuitem"
                                                                                className="am-dropdown-item"
                                                                                onClick={() => {
                                                                                    setOpenMenuUid(null);
                                                                                    navigate(`/personnel-library/${user.uid}`);
                                                                                }}
                                                                            >
                                                                                <span>View Record</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Modify Role */}
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="am-dropdown-item"
                                                                            onClick={() => {
                                                                                setOpenMenuUid(null);
                                                                                setUserToModifyRole(user);
                                                                                setRoleToModify(user.role || "Staff");
                                                                            }}
                                                                        >
                                                                            <span>Modify Role</span>
                                                                        </button>

                                                                        <div className="am-dropdown-divider" role="separator"></div>

                                                                        {/* Reset Password */}
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="am-dropdown-item"
                                                                            onClick={() => {
                                                                                setOpenMenuUid(null);
                                                                                setUserToReset(user);
                                                                            }}
                                                                        >
                                                                            <span>Reset Password</span>
                                                                        </button>

                                                                        {/* Disable Account */}
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="am-dropdown-item am-dropdown-item-warning"
                                                                            onClick={() => {
                                                                                setOpenMenuUid(null);
                                                                                handleToggleDisable(user);
                                                                            }}
                                                                            disabled={isToggling}
                                                                        >
                                                                            {isToggling && <span className="am-spinner am-spinner-sm" />}
                                                                            <span>{isToggling ? "Updating…" : "Disable Account"}</span>
                                                                        </button>

                                                                        {/* Remove User (permanent) */}
                                                                        <button
                                                                            type="button"
                                                                            role="menuitem"
                                                                            className="am-dropdown-item am-dropdown-item-danger"
                                                                            onClick={() => {
                                                                                setOpenMenuUid(null);
                                                                                setUserToDelete(user);
                                                                            }}
                                                                        >
                                                                            <span>Remove User</span>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="am-pagination-row">
                            <span className="am-pagination-summary">
                                Showing {startIndex + 1} to {endIndex} of {totalUsers} users
                            </span>

                            <div className="am-pagination-controls">
                                <button
                                    type="button"
                                    className="am-page-nav-btn"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    aria-label="Previous page"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>

                                {getPageNumbers(page, totalPages).map((p, idx) =>
                                    p === "..." ? (
                                        <span key={`dots-${idx}`} className="am-page-ellipsis">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`am-page-btn ${p === page ? "am-page-btn-active" : ""}`}
                                            onClick={() => setCurrentPage(p)}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    className="am-page-nav-btn"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    aria-label="Next page"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>

                            <select
                                className="am-page-size-select"
                                value={usersPerPage}
                                onChange={(e) => setUsersPerPage(Number(e.target.value))}
                                aria-label="Users per page"
                            >
                                {PAGE_SIZE_OPTIONS.map((n) => (
                                    <option key={n} value={n}>
                                        {n} per page
                                    </option>
                                ))}
                            </select>
                        </div>
                        </>
                    )}
                </div>
            </div>

            {/* Floating bulk-selection bar (Discord-style) */}
            {selectedUids.size > 0 && (
                <div className="am-bulk-bar">
                    <span className="am-bulk-bar-count">
                        {selectedUids.size} user{selectedUids.size === 1 ? "" : "s"} selected
                    </span>
                    <button
                        type="button"
                        className="am-bulk-bar-clear"
                        onClick={() => setSelectedUids(new Set())}
                    >
                        Clear selection
                    </button>
                    <div className="am-bulk-bar-actions">
                        <button
                            type="button"
                            className="am-bulk-btn"
                            onClick={() => setBulkAction("reset")}
                        >
                            Reset Password
                        </button>
                        <button
                            type="button"
                            className="am-bulk-btn am-bulk-btn-warning"
                            onClick={() => setBulkAction("disable")}
                        >
                            Disable Account
                        </button>
                        <button
                            type="button"
                            className="am-bulk-btn am-bulk-btn-danger"
                            onClick={() => setBulkAction("remove")}
                        >
                            Remove User
                        </button>
                    </div>
                </div>
            )}

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

            {/* Bulk Action Confirmation Modal */}
            {bulkAction && (
                <div className="am-modal-overlay">
                    <div className="am-modal">
                        <div className="am-modal-header">
                            <h3 className="am-modal-title">
                                {bulkAction === "reset" ? "Reset Password" : bulkAction === "disable" ? "Disable Accounts" : "Remove Users"}
                            </h3>
                            <button
                                type="button"
                                className="am-modal-close"
                                onClick={() => setBulkAction(null)}
                                disabled={bulkLoading}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="am-modal-body">
                            <p>
                                {bulkAction === "reset" && `Send a password reset email to ${selectedUids.size} selected user${selectedUids.size === 1 ? "" : "s"}?`}
                                {bulkAction === "disable" && `Disable ${selectedUids.size} selected user${selectedUids.size === 1 ? "" : "s"}'s account access?`}
                                {bulkAction === "remove" && `Permanently remove ${selectedUids.size} selected user${selectedUids.size === 1 ? "" : "s"}?`}
                            </p>
                            {bulkAction === "remove" && (
                                <p className="am-modal-warning">This will delete their accounts and all associated data. This action cannot be undone.</p>
                            )}
                        </div>
                        <div className="am-modal-footer">
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-cancel"
                                onClick={() => setBulkAction(null)}
                                disabled={bulkLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="am-modal-btn am-modal-btn-confirm"
                                onClick={confirmBulkAction}
                                disabled={bulkLoading}
                            >
                                {bulkLoading ? "Working..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
