import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Import Firebase database functions
import { getDatabase, ref, onValue } from 'firebase/database';
import PersonnelForm from "./AddPersonnelHeader";

export default function PersonnelLibrary() {
    const [allAttorneysArr, setAllAttorneysArr] = useState([]);
    const [allLegalStudentsArr, setAllLegalStudentsArr] = useState([]);
    const [personType, setPersonType] = useState("Attorney"); // Choose person type 

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
    const allPersonnel = [...allAttorneysArr, ...allLegalStudentsArr];
    
    const visibleCards = (personType === "Attorney" ? allAttorneysArr : allLegalStudentsArr).map((person) => (
        <PersonCard
            key={person.id}
            id={person.id}
            name={person.name}
            mainPracticeAreas={person.mainPracticeAreas}
            languageSkills={person.languageSkills}
            email={person.email}
            phoneNumber={person.phoneNumber}
            notes={person.notes}
            personType={person.personType}
        />
    ));
    
    return (
        <>
            <NavBar active={"personnel"}/>
            
            {/*Header Section*/}
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <p className="mb-0 fw-bold fs-4">Personnel</p>
                        <p className="mb-0 text-muted small">All Personnel</p>
                    </div>
                </div>
            </div>
            
            {/*Form and Cards Side by Side*/}
            <div className="container">
                <div className="row">
                    {/*Personnel Form - Left Side*/}
                    <div className="col-9">
                        <PersonnelForm personType={personType} setPersonType={setPersonType}/>
                    </div>
                    
                    {/*Personnel Cards - Right Side*/}
                    <div className="col-3">
                        <div className="py-5">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <p className="mb-0 fw-bold fs-4">Active {personType}</p>
                                </div>
                            </div>
                            <div className="personnel-cards-scroll">
                                {visibleCards}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// TODO: Change styling of cards
function PersonCard({ id, name, mainPracticeAreas, languageSkills, email, phoneNumber, notes, personType }) {
    return (
        <div className="mb-4">
            <Link to={`/edit-attorney/${id}`} className="text-decoration-none text-reset">            
                <div className="person-card-wrapper">
                   <div className="card person-card">
                        {/*Regular view*/}
                        <div className="card-body">
                            <div className="person-card-title d-flex">
                                <p className="mb-2 fw-semibold">{name} </p>
                                <div className="case-card-tag attorney-tag">
                                    <p className="case-card-subtitle mb-0">{personType}</p>
                                </div>
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