const AVATAR_COLORS = [
    "#e07a5f", "#3d5a80", "#8338ec", "#2a9d8f", "#e76f51",
    "#457b9d", "#f4a261", "#6a4c93", "#1d8a99", "#c9184a",
    "#5e548e", "#118ab2",
];

/** Deterministic "random" color for a profile avatar, stable per seed (e.g. uid or email) */
export function getAvatarColor(seed) {
    const str = (seed || "").toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 1-2 letter initials derived from a name (or email as a fallback) */
export function getInitials(source) {
    const trimmed = (source || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
