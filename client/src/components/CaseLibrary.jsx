import { NavBar } from "./NavBar";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from "../auth/useAuth";
import { downloadCaseAnalytics } from "../utils/caseAnalytics";
import {
    displayStatus,
    FILTER_GROUPS,
    EMPTY_FILTERS,
    filterValueLabel,
    matchesFilters,
    matchesSearch,
    sortCases,
    sortDirectionLabel,
    defaultDirectionFor,
    SORT_OPTIONS,
    DEFAULT_SORT,
    DEFAULT_SORT_DIRECTION,
} from "../utils/caseFilters";

function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// dateAdded is written as new Date().toLocaleString(); the card only has room
// for the day, and anything unparseable is shown as stored rather than dropped.
function formatDateAdded(value) {
    if (!value) return "Unknown";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function IconMail() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="2 6 12 13 22 6"/>
        </svg>
    );
}

function IconPhone() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.26-1.26a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    );
}

function IconAssignee() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    );
}

export default function CaseLibrary() {
    const [allCasesArr, setAllCasesArr] = useState([]);
    const [usersByUid, setUsersByUid] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    // Checked filter values per group, e.g. { category: ["Housing"], ... }
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [sortBy, setSortBy] = useState(DEFAULT_SORT);
    const [sortDirection, setSortDirection] = useState(DEFAULT_SORT_DIRECTION);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const db = getDatabase();
    const { role, user } = useAuth();

    // Close the filter panel on an outside click or Escape, the way the
    // Schedule page's action menu behaves.
    useEffect(() => {
        if (!isFilterOpen) return;

        const onPointerDown = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsFilterOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isFilterOpen]);

    // Listen for changes in the 'cases' table
    useEffect(() => {
        // Wait until role and user are loaded
        if (!role || !user) return;

        let casesQuery = ref(db, "cases");
        
        // Staff can only read cases they created; query by createdBy to pass Firebase Rules
        if (role === "Staff") {
            casesQuery = query(casesQuery, orderByChild("createdBy"), equalTo(user.uid));
        }

        // onValue provides a real-time connection to the database
        const unsubscribe = onValue(casesQuery, (snapshot) => {
            const casesObj = snapshot.val();
            
            if (casesObj === null) {
                setAllCasesArr([]);
                return;
            }

            // Convert the Firebase object into an array and include the ID
            const keys = Object.keys(casesObj);
            const formattedCases = keys.map((key) => {
                return {
                    ...casesObj[key],
                    id: key // This is the unique Firebase push key
                };
            });

            setAllCasesArr(formattedCases);
        }, (error) => {
            console.error("Error fetching cases:", error);
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [db, role, user]);

    // uid → account, so a case's createdBy (the Staff member it's assigned to,
    // set by the edit form's Assign menu) can be shown as a name. If the read
    // is refused the map just stays empty and the cards fall back to the
    // generic label rather than breaking the list.
    useEffect(() => {
        const unsubscribe = onValue(ref(db, "users"), (snapshot) => {
            setUsersByUid(snapshot.val() || {});
        }, (error) => {
            console.error("Error fetching users for case assignment:", error);
            setUsersByUid({});
        });
        return () => unsubscribe();
    }, [db]);

    const todayYMD = toYMD(new Date());

    const toggleFilter = (groupKey, value) => {
        setFilters((prev) => {
            const current = prev[groupKey];
            return {
                ...prev,
                [groupKey]: current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value],
            };
        });
    };

    // Each order starts in the direction it reads most naturally in; the
    // toggle beside them flips whichever one is selected.
    const selectSort = (value) => {
        setSortBy(value);
        setSortDirection(defaultDirectionFor(value));
    };

    // Flattened for the chip row under the toolbar, and for the count badge.
    const activeFilters = FILTER_GROUPS.flatMap((group) =>
        filters[group.key].map((value) => ({ group, value }))
    );

    // Visible cases: the Filter panel's groups, then the search query, in
    // whichever order the Sort control is set to.
    const filteredCases = sortCases(
        allCasesArr.filter(
            (client) => matchesFilters(client, filters, todayYMD) && matchesSearch(client, searchQuery)
        ),
        sortBy,
        sortDirection
    );

    // Exports whatever the search currently shows, so the spreadsheet always
    // matches the list on screen (and the role-scoped cases the user can read).
    const handleExportAnalytics = async () => {
        if (isExporting || filteredCases.length === 0) return;
        setIsExporting(true);
        try {
            await downloadCaseAnalytics(filteredCases);
        } catch (error) {
            console.error("Error exporting case analytics:", error);
            alert("Could not generate the analytics spreadsheet. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // An account that no longer exists (or that this role can't read) still
    // gets a case shown — just without a name to put on it.
    const assignedName = (uid) => {
        if (!uid) return "";
        const account = usersByUid[uid];
        return account?.name || account?.email || "Unknown user";
    };

    const caseCards = filteredCases.map((client) => (
        <CaseCard
            key={client.id}
            id={client.id}
            status={displayStatus(client, todayYMD)}
            fname={client.clientInfo?.fname}
            lname={client.clientInfo?.lname}
            category={client.caseInfo?.category}
            language={client.clientInfo?.primaryLanguage}
            date={client.schedulingInfo?.date} // Mapping from schedulingInfo based on your form structure
            briefDescription={client.caseInfo?.briefDescription}
            email={client.clientInfo?.email}
            number={client.clientInfo?.phone}
            dateAdded={client.dateAdded}
            assignedTo={assignedName(client.createdBy)}
        />
    ));

    return (
        <>
            <NavBar active={"cases"}/>
            
            {/*Header Section*/}
            <div className="container py-5 cl-responsive-container">
                <div>
                    <p className="cl-page-title mb-0 fw-bold">Cases</p>
                    <p className="cl-page-subtitle text-muted small">All active cases</p>
                </div>

                {/* Search, Filter, Analyze & Add toolbar */}
                <div className="cl-toolbar">
                    <div className="cl-toolbar-left">
                        <div className="cl-search-container">
                            {/* Search icon */}
                            <svg className="cl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                                type="text"
                                className="cl-search-input form-control"
                                placeholder="Search by Name or Case ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="cl-filter-wrapper" ref={filterRef}>
                            <button
                                type="button"
                                className="cl-filter-btn"
                                onClick={() => setIsFilterOpen((open) => !open)}
                                aria-expanded={isFilterOpen}
                                aria-haspopup="true"
                            >
                                {/* Filter icon */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                                Filter
                                {activeFilters.length > 0 && (
                                    <span className="cl-filter-count">{activeFilters.length}</span>
                                )}
                            </button>

                            {isFilterOpen && (
                                <div className="cl-filter-panel">
                                    <div className="cl-filter-sort">
                                        <p className="cl-filter-group-label">Sort by</p>
                                        <div className="cl-filter-sort-row">
                                            {SORT_OPTIONS.map((option) => (
                                                <label className="cl-filter-option" key={option.value}>
                                                    <input
                                                        type="radio"
                                                        name="cl-sort-by"
                                                        checked={sortBy === option.value}
                                                        onChange={() => selectSort(option.value)}
                                                    />
                                                    {option.label}
                                                </label>
                                            ))}

                                            <button
                                                type="button"
                                                className="cl-sort-direction-btn"
                                                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                                                title={`Sorted ${sortDirectionLabel(sortBy, sortDirection)} — click to reverse`}
                                                aria-label={`Sorted ${sortDirectionLabel(sortBy, sortDirection)} — click to reverse`}
                                            >
                                                {/* Up/down arrows, same control the Schedule waitlist uses */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                                                    <path fillRule="evenodd" d="M11.5 15a.5.5 0 0 1-.5-.5V2.707L8.354 5.354a.5.5 0 1 1-.708-.708l3.5-3.5a.5.5 0 0 1 .708 0l3.5 3.5a.5.5 0 0 1-.708.708L12 2.707V14.5a.5.5 0 0 1-.5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z" />
                                                </svg>
                                                {sortDirectionLabel(sortBy, sortDirection)}
                                            </button>
                                        </div>
                                    </div>

                                    {FILTER_GROUPS.map((group) => (
                                        <div className="cl-filter-group" key={group.key}>
                                            <p className="cl-filter-group-label">{group.label}</p>
                                            <div className="cl-filter-options">
                                                {group.values.map((value) => (
                                                    <label className="cl-filter-option" key={value}>
                                                        <input
                                                            type="checkbox"
                                                            checked={filters[group.key].includes(value)}
                                                            onChange={() => toggleFilter(group.key, value)}
                                                        />
                                                        {filterValueLabel(group, value)}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="cl-filter-panel-footer">
                                        <span className="text-muted small">
                                            {filteredCases.length} of {allCasesArr.length} case{allCasesArr.length === 1 ? "" : "s"}
                                        </span>
                                        <button
                                            type="button"
                                            className="cl-filter-clear-btn"
                                            onClick={() => setFilters(EMPTY_FILTERS)}
                                            disabled={activeFilters.length === 0}
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cl-toolbar-right">
                        <Link to="/new-form" className="text-decoration-none">
                            <button type="button" className="cl-add-case-btn">
                                {/* Plus-circle icon */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                                Add
                            </button>
                        </Link>

                        <button
                            type="button"
                            className="cl-analytics-btn"
                            onClick={handleExportAnalytics}
                            disabled={isExporting || filteredCases.length === 0}
                            title={filteredCases.length === 0
                                ? "No cases to export"
                                : `Download stats for ${filteredCases.length} case${filteredCases.length === 1 ? "" : "s"} as an Excel spreadsheet`}
                        >
                            {/* Analytics (bar chart) icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="6" y1="20" x2="6" y2="14"/>
                                <line x1="12" y1="20" x2="12" y2="4"/>
                                <line x1="18" y1="20" x2="18" y2="10"/>
                            </svg>
                            {isExporting ? "Generating…" : "Analyze"}
                        </button>
                    </div>
                </div>

                {/* Active filters, so what's narrowing the list stays visible
                    once the panel is closed */}
                {activeFilters.length > 0 && (
                    <div className="cl-filter-chips">
                        {activeFilters.map(({ group, value }) => (
                            <span className="cl-filter-chip" key={`${group.key}-${value}`}>
                                {filterValueLabel(group, value)}
                                <button
                                    type="button"
                                    onClick={() => toggleFilter(group.key, value)}
                                    aria-label={`Remove ${filterValueLabel(group, value)} filter`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </span>
                        ))}
                        <button type="button" className="cl-filter-clear-btn" onClick={() => setFilters(EMPTY_FILTERS)}>
                            Clear all
                        </button>
                    </div>
                )}

                {/* Color-coded case age legend */}
                <div className="cl-legend">

                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--medium"></span>
                        Waitlisted
                    </div>
                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--new"></span>
                        Scheduled
                    </div>
                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--archived"></span>
                        Archived
                    </div>
                </div>
            </div>

            {/*Case Cards*/}
            <div className="container overflow-hidden pb-5 cl-responsive-container">
                <div className="cl-case-list">
                    {filteredCases.length > 0 ? caseCards : <p className="text-center text-muted">No cases found.</p>}
                </div>
            </div>
        </>
    );
}

function CaseCard({ id, status, fname, lname, category, language, date, briefDescription, email, number, dateAdded, assignedTo }) {
    const statusClass = status ? `cl-status-${status}` : "";

    return (
        <Link to={`/edit-form/${id}`} className="text-decoration-none text-reset">            
            <div className={`cl-case-card-wrapper ${statusClass}`}>
               <div className="card cl-case-card">
                    
                    {/*Regular view*/}
                    <div className="card-body d-flex justify-content-between">
                        <div className="cl-case-card-left">
                            <div className="cl-case-card-title">
                                <p className="mb-0">{fname || "Unknown"} {lname || "Client"}</p>
                            </div>
                            <div className="cl-case-card-subtitle">
                                <p>{category || "No Category"} | {language || "No Language"}</p>
                            </div>
                        </div>
                        <div className="cl-case-card-right">
                            {/* A waitlisted case has no clinic date yet by definition —
                                say so, rather than reporting a missing field. */}
                            <p>{date || (status === "waitlisted" ? "Not Scheduled" : "No Date Set")}</p>
                        </div>
                    </div>

                    {/*Extended view*/}
                    <div className="cl-case-card-extended">
                        <div className="pb-4 cl-case-card-extended-body">
                            <div className="cl-case-card-extended-main">
                                <p className="cl-case-card-subtitle mb-0">{briefDescription || "No description provided."}</p>
                                <p className="cl-case-card-subtitle cl-case-card-added mb-0">Date added: {formatDateAdded(dateAdded)}</p>
                                <div className="cl-case-card-tag">
                                    <p className="cl-case-card-subtitle mb-0">
                                        <IconMail />
                                        {email || "No email"}
                                    </p>
                                </div>
                                <div className="cl-case-card-tag">
                                    <p className="cl-case-card-subtitle mb-0">
                                        <IconPhone />
                                        {number || "No phone"}
                                    </p>
                                </div>
                            </div>

                            {/* Who the case is assigned to — createdBy, the field the
                                edit form's Assign menu writes and Firebase Rules scope
                                Staff reads by. */}
                            <div className="cl-case-card-assignee">
                                <span className="cl-case-card-assignee-label">Staff Assignment</span>
                                <span className="cl-case-card-assignee-name">
                                    <IconAssignee />
                                    {assignedTo || "Unassigned"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
