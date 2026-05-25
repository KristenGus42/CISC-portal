import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../auth/useAuth";

export function NavBar(props) {
    const { active } = props;
    const { role, user, userProfile } = useAuth();
    const profileName = userProfile?.name || user?.displayName || userProfile?.email || user?.email || role || "User";
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Close the popup when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleSignOut() {
        const auth = getAuth();
        await signOut(auth);
        navigate("/");
    }

    return (
        <header className="app-navbar">
            <Link to="/" className="app-navbar-brand" aria-label="CISC home">
                <img src="/img/cisc-logo.png" alt="CISC Logo" height="50" style={{ padding: "5%" }} />
            </Link>

            {role === "Admin" && (
                <nav className="app-navbar-links" aria-label="Primary">
                    <Link
                        to="/schedule"
                        className={active === "schedule" ? "app-navbar-link active-nav-link" : "app-navbar-link"}
                    >
                        Schedule
                    </Link>
                    <Link
                        to="/case-library"
                        className={active === "cases" ? "app-navbar-link active-nav-link" : "app-navbar-link"}
                    >
                        Cases
                    </Link>
                    <Link
                        to="/personnel-library"
                        className={active === "personnel" ? "app-navbar-link active-nav-link" : "app-navbar-link"}
                    >
                        Personnel
                    </Link>
                    <Link
                        to="/access-management"
                        className={active === "access-management" ? "app-navbar-link active-nav-link" : "app-navbar-link"}
                    >
                        Access
                    </Link>
                </nav>
            )}

            {/* User button + sign-out popup */}
            <div ref={menuRef} className="app-navbar-user-wrapper">
                <button
                    type="button"
                    className="app-navbar-user"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                >
                    <span className="app-navbar-user-icon" aria-hidden="true">
                        <span className="app-navbar-user-head"></span>
                        <span className="app-navbar-user-body"></span>
                    </span>
                    <span>{profileName}</span>
                </button>

                {menuOpen && (
                    <div className="app-navbar-user-menu">
                        <button
                            type="button"
                            className="app-navbar-signout-btn"
                            onClick={handleSignOut}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
