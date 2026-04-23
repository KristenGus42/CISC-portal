import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue } from 'firebase/database';
import AttorneyForm from "./AddPersonHeader";

export default function PeopleLibrary() {
    const [allAttorneysArr, setAllAttorneysArr] = useState([]);
    const [allLegalStudentsArr, setAllLegalStudentsArr] = useState([]);
    const db = getDatabase();
    
    // Listen for changes in the 'attorneys' table
    useEffect(() => {
        const attorneysRef = ref(db, "attorneys");
        // onValue provides a real-time connection to the database
        const unsubscribe = onValue(attorneysRef, (snapshot) => {
            const attorneysObj = snapshot.val();
            
            if (attorneysObj === null) {
                setAllAttorneysArr([]);
                return;
            }
            // Convert the Firebase object into an array and include the ID
            const keys = Object.keys(attorneysObj);
            const formattedAttorneys = keys.map((key) => {
                return {
                    ...attorneysObj[key],
                    id: key, // This is the unique Firebase push key
                    personType: "Attorney"
                };
            });
            setAllAttorneysArr(formattedAttorneys);
        });
        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [db]);
    
    // Listen for changes in the 'legalStudents' table
    useEffect(() => {
        const legalStudentsRef = ref(db, "legalStudents");
        const unsubscribe = onValue(legalStudentsRef, (snapshot) => {
            const legalStudentsObj = snapshot.val();
            
            if (legalStudentsObj === null) {
                setAllLegalStudentsArr([]);
                return;
            }
            // Convert the Firebase object into an array and include the ID
            const keys = Object.keys(legalStudentsObj);
            const formattedLegalStudents = keys.map((key) => {
                return {
                    ...legalStudentsObj[key],
                    id: key,
                    personType: "Legal Student"
                };
            });
            setAllLegalStudentsArr(formattedLegalStudents);
        });
        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [db]);
    
    // Combine both arrays
    const allPeople = [...allAttorneysArr, ...allLegalStudentsArr];
    
    const attorneyCards = allPeople.map((attorney) => (
        <PersonCard
            key={attorney.id}
            id={attorney.id}
            name={attorney.name}
            position={attorney.position}
            mainPracticeAreas={attorney.mainPracticeAreas}
            languageSkills={attorney.languageSkills}
            date={attorney.date}
            email={attorney.email}
            phoneNumber={attorney.phoneNumber}
            notes={attorney.notes}
            personType={attorney.personType}
        />
    ));
    
    return (
        <>
            <NavBar active={"people"}/>
            
            {/*Header Section*/}
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <p className="mb-0 fw-bold fs-4">People</p>
                        <p className="mb-0 text-muted small">All people</p>
                    </div>
                </div>
            </div>
            
            {/*Attorney Form*/}
            <AttorneyForm />
            
            {/*Attorney Cards*/}
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <p className="mb-0 fw-bold fs-4">Active Attorneys and Legal Students</p>
                    </div>
                </div>
                <div className="row">
                    {allPeople.length > 0 ? attorneyCards : (
                        <div className="col-12">
                            <p className="text-center text-muted">No attorneys found.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// TODO: Change styling of cards
function PersonCard({ id, name, position, mainPracticeAreas, languageSkills, date, email, phoneNumber, notes, personType }) {
    return (
        <div className="col-12 col-md-6 col-lg-4 mb-4">
            <Link to={`/edit-attorney/${id}`} className="text-decoration-none text-reset">            
                <div className="person-card-wrapper h-100">
                   <div className="card person-card h-100">
                        {/*Regular view*/}
                        <div className="card-body">
                            <div className="person-card-title">
                                <p className="mb-2 fw-semibold">{name} | {personType} </p>
                            </div>
                            <div className="person-card-subtitle">
                                <p className="mb-0 small text-muted">{"Main practice areas: " + (mainPracticeAreas || "No Practice Areas")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}