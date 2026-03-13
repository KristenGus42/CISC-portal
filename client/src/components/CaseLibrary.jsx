import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";


import { cases } from "../mock_data/cases"; // TEMPORARY BEFORE DB CONNECTION 

export default function CaseLibrary() {
    const caseCards = cases.map((client) => (
        <CaseCard
            key={client.id}
            id={client.id}
            fname={client.clientInfo.fname}
            lname={client.clientInfo.lname}
            category={client.caseInfo.category}
            language={client.clientInfo.primaryLanguage}
            date={client.caseInfo.date}
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
                        <Link to="/edit-form">
                            <button type="button" className="btn btn-primary">New Case</button>
                        </Link>
                    </div>
                </div>
            </div>

            {/*Case Cards*/}
            <div className="container">
                <div className="m-5">
                    {caseCards}
                </div>
            </div>
        </>
    );
}

function CaseCard(props) {
    const {id, fname, lname, category, language, date} = props;
    return (
        <>
            <Link to={`/edit-form/${id}`} className="text-decoration-none text-reset">
                <div className="case-card-wrapper">
                    <div className="card case-card">
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
                    </div>
                </div>
            </Link>
        </>
    );
}