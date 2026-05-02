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
  //const [personType, setPersonType] = useState("Attorney"); // Choose person type 

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
      
      {/*<NavBar active={"personnel"} />header*/}
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-start mb-4 pb-3">
          <div>
            <div className="d-flex">
              <h1 className="fs-4 fw-bold mb-1 my-12">Add a new {personType} </h1>
              <div className="ms-3 align-self-center">
                <FloatSelect
                  id="personType" 
                  name="personType" 
                  label="Personnel Category" 
                  value={personType} 
                  onChange={handlePersonChange}
                >
                  <option value="Attorney">Attorney</option>
                  <option value="Legal Student">Legal Student</option>
                </FloatSelect>
              </div>
            </div>
            <p className="err-color mb-2">{countFilledReqFields(personnelFormData)}/3 required fields</p>
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSubmit}>Add</button>
          </div>
        </div>
        {/* ── PERSONNEL INFORMATION ── */}
        <div className="row mb-3 g-4">
          <div className="col-6">
            <FloatInput 
              id="name" 
              name="name" 
              label="Name" 
              required
              value={personnelFormData.name} 
              onChange={handlePersonnelChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="email" 
              name="email" 
              label="Email" 
              required
              type="email"
              value={personnelFormData.email} 
              onChange={handlePersonnelChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="phoneNumber" 
              name="phoneNumber" 
              label="Phone Number" 
              required
              type="tel"
              value={personnelFormData.phoneNumber} 
              onChange={handlePersonnelChange} 
            />
          </div>
          <div className="col-4">
            <FloatInput 
              id="languageSkills" 
              name="languageSkills" 
              label="Language Skills" 
              value={personnelFormData.languageSkills} 
              onChange={handlePersonnelChange} 
            />
          </div>
          <div className="col-12">
            <FloatInput 
              id="mainPracticeAreas" 
              name="mainPracticeAreas" 
              label="Main Practice Areas" 
              value={personnelFormData.mainPracticeAreas} 
              onChange={handlePersonnelChange} 
            />
          </div>
          <div className="col-12">
            <FloatTextarea 
              id="notes" 
              name="notes" 
              label="Notes" 
              value={personnelFormData.notes} 
              onChange={handlePersonnelChange} 
              height="140px"
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