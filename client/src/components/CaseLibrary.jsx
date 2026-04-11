import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";


import { cases } from "../mock_data/cases"; // TEMPORARY BEFORE DB CONNECTION 

export default function CaseLibrary() {
    const caseCards = cases.map((client) => (
        <CaseCard
            key={client.id}
            id={client.id}
            status={client.status}
            fname={client.clientInfo.fname}
            lname={client.clientInfo.lname}
            category={client.caseInfo.category}
            language={client.clientInfo.primaryLanguage}
            date={client.caseInfo.date}
            briefDescription={client.caseInfo.briefDescription}
            email={client.clientInfo.email}
            number={client.clientInfo.phone}
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
                    {caseCards}
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
                                <p className="mb-0">{fname} {lname}</p>
                            </div>
                            <div className="case-card-subtitle">
                                <p>{category} | {language}</p>
                            </div>
                        </div>
                        <div className="case-card-right">
                            <p>{date}</p>
                        </div>
                    </div>

                    {/*Extended view*/}
                    <div className="case-card-extended">
                        <div className="pb-4"> 
                            <p className="case-card-subtitle mb-0">{briefDescription ?? "—"}</p>
                            <div class="case-card-tag">
                                <p className="case-card-subtitle mb-0">{email ?? "—"}</p>
                            </div>
                            <div className="case-card-tag">
                                <p className="case-card-subtitle mb-0">{number ?? "—"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}