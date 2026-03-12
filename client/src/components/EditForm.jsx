import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link } from "react-router";

export default function ContactForm() {
  const [clientFormData, setClientFormData] = useState({
    age: "",
    sex: "",
    householdSize: "",
    incomeLevel: "",
    address: "",
  });

  const [caseFormData, setCaseFormData] = useState({
    city: "",
    zip: "",
    primaryLanguage: "",
    secondaryLanguage: "",
  });

  // Controlled form handlers
  const handleClientChange = (event) => {
    const { name, value } = event.target;
    setClientFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCaseChange = (event) => {
    const { name, value } = event.target;
    setCaseFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    console.log("Client Data:", clientFormData);
    console.log("Case Data:", caseFormData);
  };

  return (
    <div>
      <NavBar active={"cases"}/>
      <div className="container py-5">  
        <h1 className="fs-4 fw-bold mb-1">Patient Form</h1>
        <p className="small mb-4"></p>

        {/* CLIENT INFORMATION */}
        <div className="row mb-3">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Client Information</span>
            <hr className="flex-grow-1 m-0" />
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
        </div>

        {/* CASE INFORMATION */}
        <div className="row mb-3">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Case Information</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="city" className="form-label fw-semibold small">City</label>
            <input
              type="text"
              className="form-control"
              id="city"
              name="city"
              value={caseFormData.city}
              onChange={handleCaseChange}
            />
          </div>

          <div className="col-2 ps-2">
            <label htmlFor="zip" className="form-label fw-semibold small">Zip</label>
            <input
              type="text"
              className="form-control"
              id="zip"
              name="zip"
              value={caseFormData.zip}
              onChange={handleCaseChange}
            />
          </div>

          <div className="col-2 pe-2">
            <label htmlFor="primaryLanguage" className="form-label fw-semibold small">Primary Language</label>
            <input
              type="text"
              className="form-control"
              id="primaryLanguage"
              name="primaryLanguage"
              value={caseFormData.primaryLanguage}
              onChange={handleCaseChange}
            />
          </div>

          <div className="col-5 ps-2">
            <label htmlFor="secondaryLanguage" className="form-label fw-semibold small">Secondary Language</label>
            <input
              type="text"
              className="form-control"
              id="secondaryLanguage"
              name="secondaryLanguage"
              value={caseFormData.secondaryLanguage}
              onChange={handleCaseChange}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <button type="button" className="btn btn-primary w-100 py-2" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}