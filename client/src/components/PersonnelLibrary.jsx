/** TODO: Styling changes, chnage filtering options - expanded view to view all personnel together? Making drop down of different categories more obvious? */

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
    const [searchQuery, setSearchQuery] = useState(""); // Choose person type 


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
    //const allPersonnel = [...allAttorneysArr, ...allLegalStudentsArr];
    
    const filteredPersonnel = (personType === "Attorney" ? allAttorneysArr : allLegalStudentsArr)
        .filter((person) => {
            const fullName = person.name ? person.name.toLowerCase() : "";
            const languageSkills = person.languageSkills ? person.languageSkills.toLowerCase() : "";
            const mainPracticeAreas = person.mainPracticeAreas ? person.mainPracticeAreas.toLowerCase() : "";
            return (
                searchQuery === "" ||
                fullName.includes(searchQuery.toLowerCase()) ||
                languageSkills.includes(searchQuery.toLowerCase()) ||
                mainPracticeAreas.includes(searchQuery.toLowerCase())
            );
        })
        .sort((a, b) => {
            // Sort by dateAdded - newest first
            const dateA = new Date(a.dateAdded || 0);
            const dateB = new Date(b.dateAdded || 0);
            return dateB - dateA; // Descending order (newest first)
            // Use: return dateA - dateB; for ascending order (oldest first)
        });

    // Then map the filtered data to cards
    const visibleCards = filteredPersonnel.map((person) => (
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
            dateAdded={person.dateAdded}
        />
    ));
    
    return (
        <>
            <NavBar active={"personnel"}/>
            {/*Form and Cards Side by Side*/}
            <div className="mt-5">
                <div className="container">
                    <div className="row">
                        {/*Personnel Form - Left Side*/}
                        <div className="col-7">
                            <PersonnelForm personType={personType} setPersonType={setPersonType}/>
                        </div>
                        <div className="col-1"></div>
                        {/*Personnel Cards - Right Side*/}
                        <div className="col-4"> {/* Changed to col-4 so it adds to 12 */}
                            <div className="py-5">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <p className="mb-0 fw-bold fs-4">Active {personType}s</p>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm schedule-search-input"
                                        placeholder="Name, Main Practice Area or Language"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="personnel-cards-scroll personnel-container">
                                    {visibleCards}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// TODO: Change styling of cards
function PersonCard({ id, name, mainPracticeAreas, languageSkills, email, phoneNumber, notes, personType, dateAdded }) {
    return (
        <div className="mb-3">
            <Link to={`/edit-attorney/${id}`} className="text-decoration-none text-reset">            
                <div className="person-card p-3">
                    <div className="card-body">
                        <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{name}</h6>
                            <span className={"badge " + (personType === "Attorney" ? "attorney-badge" : "legal-student-badge")}>
                                {personType}
                            </span>
                        </div>
                    
                        {mainPracticeAreas && (
                            <p className="mb-1 small text-muted">
                                <strong>Practice Areas:</strong> {mainPracticeAreas}
                            </p>
                        )}
                        
                        {languageSkills && (
                            <p className="mb-4 small text-muted">
                                <strong>Languages:</strong> {languageSkills}
                            </p>
                        )}

                        <p className="mb-1 small text-muted date-added">
                            <em>Date Added: {dateAdded}</em>
                        </p>
                    
                    </div>
                </div>
            </Link>
        </div>
    );
}