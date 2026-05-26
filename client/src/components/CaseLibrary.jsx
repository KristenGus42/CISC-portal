import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from "../auth/useAuth";

export default function CaseLibrary() {
    const [allCasesArr, setAllCasesArr] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const db = getDatabase();
    const { role, user } = useAuth();

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

    // Filter visible cases by search query
    const filteredCases = allCasesArr.filter((client) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${client.clientInfo?.fname || ""} ${client.clientInfo?.lname || ""}`.toLowerCase();
        const id = (client.id || "").toLowerCase();
        const category = (client.caseInfo?.category || "").toLowerCase();
        const language = (client.clientInfo?.primaryLanguage || "").toLowerCase();
        return fullName.includes(q) || id.includes(q) || category.includes(q) || language.includes(q);
    });

    const caseCards = filteredCases.map((client) => (
        <CaseCard
            key={client.id}
            id={client.id}
            status={client.status} // Defaulting to active if status isn't set
            fname={client.clientInfo?.fname}
            lname={client.clientInfo?.lname}
            category={client.caseInfo?.category}
            language={client.clientInfo?.primaryLanguage}
            date={client.schedulingInfo?.date} // Mapping from schedulingInfo based on your form structure
            briefDescription={client.caseInfo?.briefDescription}
            email={client.clientInfo?.email}
            number={client.clientInfo?.phone}
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

                {/* Search, Filter & Add Case toolbar */}
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

                        <button type="button" className="cl-filter-btn">
                            {/* Filter icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                            </svg>
                            Filter
                        </button>
                    </div>

                    <Link to="/new-form" className="text-decoration-none">
                        <button type="button" className="cl-add-case-btn">
                            {/* Plus-circle icon */}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="16"/>
                                <line x1="8" y1="12" x2="16" y2="12"/>
                            </svg>
                            Add case
                        </button>
                    </Link>
                </div>

                {/* Color-coded case age legend */}
                <div className="cl-legend">
                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--old"></span>
                        Older cases
                    </div>
                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--medium"></span>
                        Medium age cases
                    </div>
                    <div className="cl-legend-item">
                        <span className="cl-legend-dot cl-legend-dot--new"></span>
                        Newer cases
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

function CaseCard({ id, status, fname, lname, category, language, date, briefDescription, email, number }) {
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
                            <p>{date || "No Date Set"}</p>
                        </div>
                    </div>

                    {/*Extended view*/}
                    <div className="cl-case-card-extended">
                        <div className="pb-4"> 
                            <p className="cl-case-card-subtitle mb-0">{briefDescription || "No description provided."}</p>
                            <div className="cl-case-card-tag">
                                <p className="cl-case-card-subtitle mb-0">{email || "No email"}</p>
                            </div>
                            <div className="cl-case-card-tag">
                                <p className="cl-case-card-subtitle mb-0">{number || "No phone"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
