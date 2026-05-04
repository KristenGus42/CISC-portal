// TODO: Generalize for legal students and attorneys - add a spot in the form to indicate which one!
import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, push as firebasePush, update as firebaseUpdate, onValue } from 'firebase/database';

function countFilledReqFields(personnelFormData) {
  const reqFieldNames = ["name", "email", "phoneNumber"];
  let reqFieldCount = 0;
  for (const field of reqFieldNames) {
    if (personnelFormData[field]) {
      reqFieldCount++;
    }
  }
  return reqFieldCount;
}

// ─── Main form ────────────────────────────────────────────────────────────────
export default function PersonnelForm(props) {
  const navigate = useNavigate();
  const { id } = useParams(); // Firebase ID if editing
  const db = getDatabase();
  // State object for personnel information
  const [personnelFormData, setPersonnelFormData] = useState({
    date: "",
    position: "",
    name: "",
    email: "",
    phoneNumber: "",
    languageSkills: "",
    mainPracticeAreas: "",
    notes: "",
    dateAdded: new Date().toLocaleString()
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const personType = props.personType;
  const setPersonType = props.setPersonType;
  
  // 1. EFFECT: Fetch data from Firebase if an ID exists (Editing mode)
  useEffect(() => {
    if (id) {
      const collectionName = personType === "Attorney" ? "attorneys" : "legalStudents";
      const personRef = ref(db, `${collectionName}/${id}`);
      onValue(personRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setPersonnelFormData(data);
        }
      });
    }
  }, [id, db, personType]);
  
  // 2. EFFECT: Validation logic
  useEffect(() => {
    setIsFormValid(countFilledReqFields(personnelFormData) >= 3);
  }, [personnelFormData]);
  
  // Handler
  const handlePersonnelChange = (e) => {
    const { name, value } = e.target;
    setPersonnelFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const resetForm = () => {
    setPersonnelFormData({
      date: personnelFormData.date,
      position: "",
      name: "",
      email: "",
      phoneNumber: "",
      languageSkills: "",
      mainPracticeAreas: "",
      notes: "",
      dateAdded: new Date().toLocaleString()
    })
  }
  
  // 3. SUBMIT: Push or Update Firebase
  const handleSubmit = () => {
    const collectionName = personType === "Attorney" ? "attorneys" : "legalStudents";
    
    if (id) {
      // Update existing record
      const updates = {};
      updates[`/${collectionName}/${id}`] = personnelFormData;
      firebaseUpdate(ref(db), updates)
        .then(() => resetForm())
        .catch((err) => console.error(`Error updating ${personType.toLowerCase()}: `, err));
    } else {
      // Create new record
      const listRef = ref(db, collectionName);
      firebasePush(listRef, personnelFormData)
        .then(() => resetForm())
        .catch((err) => console.error(`Error saving new ${personType.toLowerCase()}: `, err));
    }
  };
  
  // Handle person type change
  const handlePersonChange = (e) => {
    setPersonType(e.target.value);
  };
  
  return (
    <div>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-start mb-4 pb-3">
          <div>
            <h1 className="fs-4 fw-bold mb-1">Add a new {personType}</h1>
            <p className="err-color mb-2">{countFilledReqFields(personnelFormData)}/3 required fields</p>
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSubmit}>Add</button>
          </div>
        </div>
        
        {/* Person Type Selector */}
        <div className="row mb-3 g-3">
          <div className="col-12">
            <label htmlFor="personType" className="form-label fw-bold">Personnel Category (Attorney or Legal Student) </label>
            <select
              className="form-select"
              id="personType" 
              name="personType" 
              value={personType} 
              onChange={handlePersonChange}
            >
              <option value="Attorney">Attorney</option>
              <option value="Legal Student">Legal Student</option>
            </select>
          </div>
        </div>
        
        {/* ── PERSONNEL INFORMATION ── */}
        <div className="row mb-3 g-3">
          <div className="col-12">
            <label htmlFor="name" className="form-label required">Name</label>
            <input
              type="text"
              className="form-control"
              id="name" 
              name="name" 
              value={personnelFormData.name} 
              onChange={handlePersonnelChange}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="email" className="form-label required">Email</label>
            <input
              type="email"
              className="form-control"
              id="email" 
              name="email" 
              value={personnelFormData.email} 
              onChange={handlePersonnelChange}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="phoneNumber" className="form-label required">Phone Number</label>
            <input
              type="tel"
              className="form-control"
              id="phoneNumber" 
              name="phoneNumber" 
              value={personnelFormData.phoneNumber} 
              onChange={handlePersonnelChange}
              required
            />
          </div>
          <div className="col-12">
            <label htmlFor="languageSkills" className="form-label">Language Skills</label>
            <input
              type="text"
              className="form-control"
              id="languageSkills" 
              name="languageSkills" 
              value={personnelFormData.languageSkills} 
              onChange={handlePersonnelChange}
            />
          </div>
          <div className="col-12">
            <label htmlFor="mainPracticeAreas" className="form-label">Main Practice Areas</label>
            <input
              type="text"
              className="form-control"
              id="mainPracticeAreas" 
              name="mainPracticeAreas" 
              value={personnelFormData.mainPracticeAreas} 
              onChange={handlePersonnelChange}
            />
          </div>
          <div className="col-12">
            <label htmlFor="notes" className="form-label">Notes</label>
            <textarea
              className="form-control"
              id="notes" 
              name="notes" 
              value={personnelFormData.notes} 
              onChange={handlePersonnelChange}
              style={{ height: "140px" }}
            />
          </div>
        </div>      
      </div>
    </div>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────
function ExistingPersonnelHeader({ personnelFormData }) {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-0 edit-form-title">
            {personnelFormData.name || "Personnel Name not Assigned"}
          </p>
          <p className="mb-0 edit-form-subtitle">
            {personnelFormData.mainPracticeAreas || "Practice Areas not Assigned"}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewPersonnelHeader() {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>New Personnel</h1>
      </div>
    </div>
  );
}