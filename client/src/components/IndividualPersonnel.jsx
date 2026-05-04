import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, update as firebaseUpdate, onValue } from 'firebase/database';

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
export default function PersonnelEditForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // Firebase ID for editing
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
    dateAdded: ""
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [personType, setPersonType] = useState("Attorney");
  
  // 1. EFFECT: Fetch data from Firebase when component loads
  useEffect(() => {
    if (id) {
      // Try attorneys first
      const attorneyRef = ref(db, `attorneys/${id}`);
      onValue(attorneyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setPersonnelFormData(data);
          setPersonType("Attorney");
          setLoading(false);
        } else {
          // If not found in attorneys, try legal students
          const studentRef = ref(db, `legalStudents/${id}`);
          onValue(studentRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              setPersonnelFormData(data);
              setPersonType("Legal Student");
              setLoading(false);
            }
          });
        }
      });
    }
  }, [id, db]);
  
  // 2. EFFECT: Validation logic
  useEffect(() => {
    setIsFormValid(countFilledReqFields(personnelFormData) >= 3);
  }, [personnelFormData]);
  
  // Handler
  const handlePersonnelChange = (e) => {
    const { name, value } = e.target;
    setPersonnelFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // 3. SAVE: Update Firebase
  const handleSave = () => {
    const collectionName = personType === "Attorney" ? "attorneys" : "legalStudents";
    
    const updates = {};
    updates[`/${collectionName}/${id}`] = personnelFormData;
    firebaseUpdate(ref(db), updates)
      .then(() => {
        navigate("/personnel-library");
      })
      .catch((err) => console.error(`Error updating ${personType.toLowerCase()}: `, err));
  };
  
  // Handle person type change
  const handlePersonChange = (e) => {
    setPersonType(e.target.value);
  };
  
  return (
    <div>
        <NavBar active={"personnel"}/>
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-start mb-4 pb-3">
            <div>
                <h1 className="fs-4 fw-bold mb-1">Edit {personType}</h1>
                <p className="err-color mb-2">{countFilledReqFields(personnelFormData)}/3 required fields</p>
            </div>
            <div className="text-end">
                <button type="button" className="btn btn-cancel me-2" onClick={() => navigate("/personnel-library")}>Cancel</button>
                <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSave}>Save</button>
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
                />
            </div>
            </div>      
        </div>
    </div>
  );
}