import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue } from 'firebase/database';

export default function CaseLibrary() {
    const [allCasesArr, setAllCasesArr] = useState([]);
    const db = getDatabase();

    // Listen for changes in the 'cases' table
    useEffect(() => {
        const casesRef = ref(db, "cases");

        // onValue provides a real-time connection to the database
        const unsubscribe = onValue(casesRef, (snapshot) => {
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
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [db]);

    const caseCards = allCasesArr.map((client) => (
        <CaseCard
            key={client.id}
            id={client.id}
            status={client.status || "active"} // Defaulting to active if status isn't set
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
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <p className="mb-0 fw-bold fs-4">Cases</p>
                        <p className="mb-0 text-muted small">All active cases</p>
                    </div>
                    <div>
                        <Link to="/new-form">
                            <button type="button" className="btn btn-primary">New Case</button>
                        </Link>
                    </div>
                </div>
            </div>

            {/*Case Cards*/}
            <div className="container overflow-hidden">
                <div className="m-5">
                    {allCasesArr.length > 0 ? caseCards : <p className="text-center text-muted">No cases found.</p>}
                </div>
            </div>
        </>
    );
}

function CaseCard({ id, status, fname, lname, category, language, date, briefDescription, email, number }) {
    return (
        <Link to={`/edit-form/${id}`} className="text-decoration-none text-reset">            
            <div className={"case-card-wrapper " + status}>
               <div className="card case-card">
                    
                    {/*Regular view*/}
                    <div className="card-body d-flex justify-content-between">
                        <div className="case-card-left">
                            <div className="case-card-title">
                                <p className="mb-0">{fname || "Unknown"} {lname || "Client"}</p>
                            </div>
                            <div className="case-card-subtitle">
                                <p>{category || "No Category"} | {language || "No Language"}</p>
                            </div>
                        </div>
                        <div className="case-card-right">
                            <p>{date || "No Date Set"}</p>
                        </div>
                    </div>

                    {/*Extended view*/}
                    <div className="case-card-extended">
                        <div className="pb-4"> 
                            <p className="case-card-subtitle mb-0">{briefDescription || "No description provided."}</p>
                            <div className="case-card-tag">
                                <p className="case-card-subtitle mb-0">{email || "No email"}</p>
                            </div>
                            <div className="case-card-tag">
                                <p className="case-card-subtitle mb-0">{number || "No phone"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}