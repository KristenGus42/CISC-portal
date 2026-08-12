// Case Library filtering: what the Filter panel offers and how a case is
// tested against the checked values. Kept free of React so the rules can be
// read (and exercised) on their own.

import { CASE_CATEGORIES, LANGUAGE_OPTIONS, OTHER_LANGUAGE } from "../data/caseOptions";

// A case whose clinic date has already passed reads as "archived", regardless
// of the stored status — nothing writes that status, it's derived from the
// date. Scheduling dates are "YYYY-MM-DD", so they compare correctly as
// strings. Today still counts as upcoming, matching AttorneyView's
// Archived/Upcoming badge.
export function displayStatus(caseData, todayYMD) {
    const date = caseData.schedulingInfo?.date;
    if (date && date < todayYMD) return "archived";
    return caseData.status;
}

// The three groups the Filter panel offers. Each group's checked values are
// OR'd together; the groups are AND'd, so "Family + Housing, Cantonese" means
// a Family-or-Housing case whose client speaks Cantonese.
//
// Statuses are matched against displayStatus(), i.e. what the case's stripe
// and card actually say, not the raw stored status.
export const FILTER_GROUPS = [
    { key: "category", label: "Legal Category", values: CASE_CATEGORIES },
    { key: "language", label: "Language", values: [...LANGUAGE_OPTIONS, OTHER_LANGUAGE] },
    {
        key: "status",
        label: "Status",
        values: ["waitlisted", "scheduled", "archived"],
        // Stored values are lowercase; these are what the panel and chips show.
        labels: {
            waitlisted: "Waitlisted",
            scheduled: "Scheduled",
            archived: "Archived",
        },
    },
];

export const EMPTY_FILTERS = { category: [], language: [], status: [] };

export function filterValueLabel(group, value) {
    return group.labels?.[value] ?? value;
}

// True when the case satisfies every group that has something checked. An
// empty group is no restriction, so no filters at all matches everything.
export function matchesFilters(caseData, filters, todayYMD) {
    if (filters.category.length && !filters.category.includes(caseData.caseInfo?.category)) return false;
    if (filters.language.length && !filters.language.includes(caseData.clientInfo?.primaryLanguage)) return false;
    if (filters.status.length && !filters.status.includes(displayStatus(caseData, todayYMD))) return false;
    return true;
}

// Sort orders offered inside the Filter panel. Alphabetical is the default
// because it's the only one that's stable regardless of how a case is dated.
// Each order carries the direction it reads most naturally in, plus the words
// for the direction toggle — "Newest/Oldest" only makes sense for the dates.
export const SORT_OPTIONS = [
    {
        value: "alphabetical",
        label: "Alphabetical",
        defaultDirection: "asc",
        directionLabels: { asc: "A → Z", desc: "Z → A" },
    },
    {
        value: "dateAdded",
        label: "Date Added",
        defaultDirection: "desc",
        directionLabels: { asc: "Oldest", desc: "Newest" },
    },
    {
        value: "dateScheduled",
        label: "Date Scheduled",
        defaultDirection: "desc",
        directionLabels: { asc: "Oldest", desc: "Newest" },
    },
];

export const DEFAULT_SORT = "alphabetical";

function sortOption(sortBy) {
    return SORT_OPTIONS.find((option) => option.value === sortBy) ?? SORT_OPTIONS[0];
}

// Picking a sort snaps the direction back to that order's natural one, so
// switching to a date sort doesn't silently leave you on oldest-first.
export function defaultDirectionFor(sortBy) {
    return sortOption(sortBy).defaultDirection;
}

export const DEFAULT_SORT_DIRECTION = defaultDirectionFor(DEFAULT_SORT);

export function sortDirectionLabel(sortBy, direction) {
    return sortOption(sortBy).directionLabels[direction === "desc" ? "desc" : "asc"];
}

// Cards show "First Last", so that's what alphabetical follows.
function displayName(caseData) {
    return `${caseData.clientInfo?.fname || ""} ${caseData.clientInfo?.lname || ""}`.trim();
}

// Cases missing the value being sorted on always sink to the bottom — flipping
// the direction reorders the cases that have one, it doesn't float the blanks
// to the top. Returns null when the caller still has to compare the values.
function compareMissing(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return null;
}

// Returns a new array; never sorts the caller's list in place.
export function sortCases(cases, sortBy, direction = defaultDirectionFor(sortBy)) {
    const flip = direction === "desc" ? -1 : 1;
    const sorted = [...cases];

    if (sortBy === "dateAdded" || sortBy === "dateScheduled") {
        const dateOf = (c) => (sortBy === "dateAdded" ? c.dateAdded : c.schedulingInfo?.date);
        return sorted.sort((a, b) => {
            const missing = compareMissing(dateOf(a), dateOf(b));
            if (missing !== null) return missing;
            return flip * (new Date(dateOf(a)).getTime() - new Date(dateOf(b)).getTime());
        });
    }

    return sorted.sort((a, b) => {
        const nameA = displayName(a);
        const nameB = displayName(b);
        const missing = compareMissing(nameA, nameB);
        if (missing !== null) return missing;
        return flip * nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
}

// Name, case ID, category or language — the same fields the search box has
// always covered.
export function matchesSearch(caseData, searchQuery) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${caseData.clientInfo?.fname || ""} ${caseData.clientInfo?.lname || ""}`.toLowerCase();
    const id = (caseData.id || "").toLowerCase();
    const category = (caseData.caseInfo?.category || "").toLowerCase();
    const language = (caseData.clientInfo?.primaryLanguage || "").toLowerCase();
    return fullName.includes(q) || id.includes(q) || category.includes(q) || language.includes(q);
}
