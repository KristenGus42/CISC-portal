import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link } from "react-router";


export default function CaseLibrary() {
  return (
    <>
        <NavBar active={"cases"}/>
        <div>
            <h1>Cases</h1>
            <div>
                {/*Search bar*/}
            </div>
            <div class="m-5">
                {/* Case Card */}
                <CaseCard name="Alex Li" category="Divorce" language="Cantonese" date="February 1, 2026"/>
                <CaseCard name="Abby Smith" category="Property" language="English" date="February 1, 2026"/>
                <CaseCard name="Ben Johnson" category="Traffic Violation" language="Cantonese" date="February 1, 2026"/>
            </div>
        </div>
    </>
  );
}

function CaseCard(props) {
    const {name, category, language, date} = props;
    const caseId = "12345";
    return(
        <>
            <Link to={`/edit-form/${caseId}`} className="text-decoration-none text-reset">            
                <div className="case-card-wrapper">
                    <div className="card case-card">
                        <div className="card-body d-flex justify-content-between">
                            <div className="case-card-left">
                                <div className="case-card-title">
                                    <p className="mb-0">{name}</p>
                                </div>
                                <div className="case-card-subtitle ">
                                    <p>{category} | {language}</p>
                                </div>
                            </div>
                            <div className="case-card-right">
                                <p>{date}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </>
    );
}