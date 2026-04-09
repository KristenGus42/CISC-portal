// REUSE TO BUILD DOCUMENTS VIEW

import { NavBar } from "../../src/components/NavBar";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";


import { cases } from "../../src/mock_data/cases"; // TEMPORARY BEFORE DB CONNECTION

export default function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentCase = cases.find((c) => c.id === id); // TEMPORARY BEFORE DB CONNECTION

  const [clientFormData, setClientFormData] = useState({
    age: currentCase?.clientInfo.age || "",
    sex: currentCase?.clientInfo.sex || "",
    householdSize: currentCase?.clientInfo.householdSize || "",
    incomeLevel: currentCase?.clientInfo.incomeLevel || "",
    address: currentCase?.clientInfo.address || "",
    lname: currentCase?.clientInfo.lname || "",
    fname: currentCase?.clientInfo.fname || "",
    primaryLanguage: currentCase?.clientInfo.primaryLanguage || "",
    secondaryLanguage: currentCase?.clientInfo.secondaryLanguage || ""
  });

  const [caseFormData, setCaseFormData] = useState({
    category: currentCase?.caseInfo.category || "",
    description: currentCase?.caseInfo.description || ""
  });

  const [matchFormData, setMatchFormData] = useState({
    attorney: currentCase?.matchInfo?.attorney || "",
    legalStudent: currentCase?.matchInfo?.legalStudent || "",
    interpreter: currentCase?.matchInfo?.interpreter || ""
  });

  const handleMatchChange = (event) => {
    const { name, value } = event.target;
    setMatchFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (event) => {
    const { name, value } = event.target;
    setClientFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCaseChange = (event) => {
    const { name, value } = event.target;
    setCaseFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // TEMPORARY - will completely change with db
    if (id) {
      const index = cases.findIndex((c) => c.id === id);
      cases[index] = {
        ...cases[index],
        clientInfo: { ...clientFormData },
        caseInfo: { ...caseFormData }, 
        matchInfo: {...matchFormData}
      };
    } else {
      const newCase = {
        id: String(cases.length + 1),
        clientInfo: { ...clientFormData },
        caseInfo: { ...caseFormData },
        matchInfo: {...matchFormData}
      };
      cases.push(newCase);
    }
    navigate("/case-library");
  };

 const header = id ? 
  <ExistingClientHeader currentCase={currentCase} handleMatchChange={handleMatchChange} matchFormData={matchFormData} handleSubmit={handleSubmit}/> : 
  <NewClientHeader />;

  return (
    <div>
      <NavBar active={"cases"}/>

      {/*Header (New or Existing)*/}
      {header}

      {/*Forms*/}
      <div className="container py-5">
        <h1 className="fs-4 fw-bold mb-1">Overview</h1>
        <p className="small mb-4"></p>

        {/* CLIENT INFORMATION */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Client Information</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="fname" className="form-label fw-semibold small">First Name</label>
            <input
              type="text"
              className="form-control"
              id="fname"
              name="fname"
              value={clientFormData.fname}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="lname" className="form-label fw-semibold small">Last Name</label>
            <input
              type="text"
              className="form-control"
              id="lname"
              name="lname"
              value={clientFormData.lname}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="age" className="form-label fw-semibold small">Age</label>
            <input
              type="text"
              className="form-control"
              id="age"
              name="age"
              value={clientFormData.age}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 ps-2">
            <label htmlFor="sex" className="form-label fw-semibold small">Sex</label>
            <input
              type="text"
              className="form-control"
              id="sex"
              name="sex"
              value={clientFormData.sex}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="householdSize" className="form-label fw-semibold small">Household Size</label>
            <input
              type="text"
              className="form-control"
              id="householdSize"
              name="householdSize"
              value={clientFormData.householdSize}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-5 ps-2">
            <label htmlFor="incomeLevel" className="form-label fw-semibold small">Income Level</label>
            <input
              type="text"
              className="form-control"
              id="incomeLevel"
              name="incomeLevel"
              value={clientFormData.incomeLevel}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-5 ps-2">
            <label htmlFor="address" className="form-label fw-semibold small">Address</label>
            <input
              type="text"
              className="form-control"
              id="address"
              name="address"
              value={clientFormData.address}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="primaryLanguage" className="form-label fw-semibold small">Primary Language</label>
            <input
              type="text"
              className="form-control"
              id="primaryLanguage"
              name="primaryLanguage"
              value={clientFormData.primaryLanguage}
              onChange={handleClientChange}
            />
          </div>

          <div className="col-2 ps-2">
            <label htmlFor="secondaryLanguage" className="form-label fw-semibold small">Secondary Language</label>
            <input
              type="text"
              className="form-control"
              id="secondaryLanguage"
              name="secondaryLanguage"
              value={clientFormData.secondaryLanguage}
              onChange={handleClientChange}
            />
          </div>
        </div>

        {/* CASE INFORMATION */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Case Information</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-3 pe-2">
            <label htmlFor="category" className="form-label fw-semibold small">Category</label>
            <select
              className="form-select"
              id="category"
              name="category"
              value={caseFormData.category}
              onChange={handleCaseChange}
            >
              <option value="">Select a category</option>
              <option value="Consumer / Finance">Consumer / Finance</option>
              <option value="Education">Education</option>
              <option value="Employment">Employment</option>
              <option value="Family">Family</option>
              <option value="Juvenile">Juvenile</option>
              <option value="Health">Health</option>
              <option value="Housing">Housing</option>
              <option value="Income Maintenance">Income Maintenance</option>
              <option value="Individual Rights">Individual Rights</option>
              <option value="Misc.">Misc.</option>
            </select>
          </div>

          <div className="col-9 ps-2">
            <label htmlFor="description" className="form-label fw-semibold small">Description</label>
            <textarea
              className="form-control"
              id="description"
              name="description"
              value={caseFormData.description}
              onChange={handleCaseChange}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExistingClientHeader(props) {
    const {currentCase, handleMatchChange, matchFormData, handleSubmit} = props;
    return (
        <>
          {/*Info Section + Actions*/}
          <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="mb-0 edit-form-title">{currentCase?.clientInfo.fname || "Client Name not Assigned"} {currentCase?.clientInfo.name || ""}</p>
                <p className="mb-0 edit-form-subtitle">{currentCase?.caseInfo.category || "Category not Assigned"} | {currentCase?.clientInfo.primaryLanguage || "Language not Assigned"}</p>
              </div>
              <div className="d-flex flex-column align-items-end">
                {/* Save/Edit */}
                <div>
                  <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save</button>
                </div>
                {/* Match Info */}
                <div className="d-flex gap-3">
                  <div>
                    <label htmlFor="attorney" className="form-label fw-semibold small">Attorney</label>
                    <input
                      type="text"
                      className="form-control"
                      id="attorney"
                      name="attorney"
                      value={matchFormData.attorney}
                      onChange={handleMatchChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="legalStudent" className="form-label fw-semibold small">Legal Student</label>
                    <input
                      type="text"
                      className="form-control"
                      id="legalStudent"
                      name="legalStudent"
                      value={matchFormData.legalStudent}
                      onChange={handleMatchChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="interpreter" className="form-label fw-semibold small">Interpreter</label>
                    <select
                      className="form-select"
                      id="interpreter"
                      name="interpreter"
                      value={matchFormData.interpreter}
                      onChange={handleMatchChange}
                    >
                      <option value="">Select an interpreter if Needed</option>
                      <option value="Interpreter 1">Legal Student</option>
                      <option value="Interpreter 2">Attorney</option>
                      <option value="Interpreter 3">Other</option>
                      <option value="Interpreter 1">None</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
    );
}

function NewClientHeader(props) {
    return (
        <>
          <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1> New Case </h1>
              </div>
            </div>
          </div>
        </>
    );
}