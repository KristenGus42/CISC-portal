import { Link } from "react-router";

export function NavBar(props){
    const {active} = props;

    return (
    <header className="app-navbar">
        <Link to="/schedule" className="app-navbar-brand" aria-label="CISC home" >
            <img src="/img/cisc-logo.png" alt="CISC Logo" height="50" style={{padding: "5%"}}/>
        </Link>

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
        </nav>

        <button type="button" className="app-navbar-user">
            <span className="app-navbar-user-icon" aria-hidden="true">
                <span className="app-navbar-user-head"></span>
                <span className="app-navbar-user-body"></span>
            </span>
            <span>User</span>
        </button>
    </header>
    );
}
