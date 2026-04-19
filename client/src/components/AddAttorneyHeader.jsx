// TODO: Generalize for legal students and attorneys - add a spot in the form to indicate which one!

import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, push as firebasePush, update as firebaseUpdate, onValue } from 'firebase/database';

// ─── Reusable floating label components ───────────────────────────────────────
function FloatInput({ id, name, label, required, value, onChange, type = "text" }) {
  return (
    <div className="form-floating">
      <input
        type={type}
        className="form-control"
        id={id}
        name={name}
        placeholder={label}
        value={value || ""}
        onChange={onChange}
        required={required}
      />
      <label htmlFor={id} className={required ? "required" : ""}>{label}</label>
    </div>
  );
}

function FloatSelect({ id, name, label, required, value, onChange, children }) {
  return (
    <div className="form-floating">
      <select
        className="form-select"
        id={id}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
      >
        {children}
      </select>
      <label htmlFor={id} className={required ? "required" : ""}>{label}</label>
    </div>
  );
}

function FloatTextarea({ id, name, label, required, value, onChange, height = "120px" }) {
  return (
    <div className="form-floating">
      <textarea
        className="form-control"
        id={id}
        name={name}
        placeholder={label}
        value={value || ""}
        onChange={onChange}
        required={required}
        style={{ height }}
      />
      <label htmlFor={id} className={required ? "required" : ""}>{label}</label>
    </div>
  );
}

// ─── Helper function ──────────────────────────────────────────────────────────
function countFilledReqFields(attorneyFormData) {
  const reqFieldNames = ["name", "email", "phoneNumber"];
  let reqFieldCount = 0;
  for (const field of reqFieldNames) {
    if (attorneyFormData[field]) {
      reqFieldCount++;
    }
  }
  return reqFieldCount;
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function AttorneyForm(props) {
  const navigate = useNavigate();
  const { id } = useParams(); // Firebase ID if editing
  const db = getDatabase();

  // State object for attorney information
  const [attorneyFormData, setAttorneyFormData] = useState({
    date: "",
    position: "",
    name: "",
    email: "",
    phoneNumber: "",
    languageSkills: "",
    mainPracticeAreas: "",
    notes: "",
  });

  const [isFormValid, setIsFormValid] = useState(false);

  // 1. EFFECT: Fetch data from Firebase if an ID exists (Editing mode)
  useEffect(() => {
    if (id) {
      const attorneyRef = ref(db, `attorneys/${id}`);
      onValue(attorneyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAttorneyFormData(data);
        }
      });
    }
  }, [id, db]);

  // 2. EFFECT: Validation logic
  useEffect(() => {
    setIsFormValid(countFilledReqFields(attorneyFormData) >= 3);
  }, [attorneyFormData]);

  // Handler
  const handleAttorneyChange = (e) => {
    const { name, value } = e.target;
    setAttorneyFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setAttorneyFormData({
      date: attorneyFormData.date,
      position: "",
      name: "",
      email: "",
      phoneNumber: "",
      languageSkills: "",
      mainPracticeAreas: "",
      notes: ""
    })
  }

  // 3. SUBMIT: Push or Update Firebase
  const handleSubmit = () => {
    if (id) {
      // Update existing record
      const updates = {};
      updates[`/attorneys/${id}`] = attorneyFormData;
      firebaseUpdate(ref(db), updates)
        .then(() => resetForm())
        .catch((err) => console.error("Error updating attorney: ", err));
    } else {
      // Create new record
      const attorneysListRef = ref(db, 'attorneys');
      firebasePush(attorneysListRef, attorneyFormData)
        .then(() => resetForm())
        .catch((err) => console.error("Error saving new attorney: ", err));
    }
  };


  return (
    <div>
      
      {/*<NavBar active={"attorneys"} />header*/}
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-start mb-4 pb-3">
          <div>
            <h1 className="fs-4 fw-bold mb-1">Add Attorneys</h1>
            <p className="err-color mb-2">{countFilledReqFields(attorneyFormData)}/3 required fields</p>
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSubmit}>Add</button>
          </div>
        </div>

        {/* ── ATTORNEY INFORMATION ── */}
        <div className="row mb-3 g-4">
          <div className="col-3">
            <FloatInput 
              id="date" 
              name="date" 
              label="Date" 
              type="date"
              value={attorneyFormData.date} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-3">
            <FloatSelect 
              id="position" 
              name="position" 
              label="Position" 
              value={attorneyFormData.position} 
              onChange={handleAttorneyChange}
            >
              <option value="">Select position</option>
              <option value="Attorney 1">Attorney 1</option>
              <option value="Attorney 2">Attorney 2</option>
              <option value="Attorney 3">Attorney 3</option>
            </FloatSelect>
          </div>
          <div className="col-6">
            <FloatInput 
              id="name" 
              name="name" 
              label="Name" 
              required
              value={attorneyFormData.name} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="email" 
              name="email" 
              label="Email" 
              required
              type="email"
              value={attorneyFormData.email} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="phoneNumber" 
              name="phoneNumber" 
              label="Phone Number" 
              required
              type="tel"
              value={attorneyFormData.phoneNumber} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="languageSkills" 
              name="languageSkills" 
              label="Language Skills" 
              value={attorneyFormData.languageSkills} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-12">
            <FloatInput 
              id="mainPracticeAreas" 
              name="mainPracticeAreas" 
              label="Main Practice Areas" 
              value={attorneyFormData.mainPracticeAreas} 
              onChange={handleAttorneyChange} 
            />
          </div>
          <div className="col-12">
            <FloatTextarea 
              id="notes" 
              name="notes" 
              label="Notes" 
              value={attorneyFormData.notes} 
              onChange={handleAttorneyChange} 
              height="140px"
            />
          </div>
        </div>      
      </div>
    </div>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────
function ExistingAttorneyHeader({ attorneyFormData }) {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-0 edit-form-title">
            {attorneyFormData.name || "Attorney Name not Assigned"}
          </p>
          <p className="mb-0 edit-form-subtitle">
            {attorneyFormData.position || "Position not Assigned"} | {attorneyFormData.mainPracticeAreas || "Practice Areas not Assigned"}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewAttorneyHeader() {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>New Attorney</h1>
      </div>
    </div>
  );
}