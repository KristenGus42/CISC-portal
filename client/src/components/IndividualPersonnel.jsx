import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, update as firebaseUpdate, onValue, remove as firebaseRemove, set as firebaseSet } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  const [originalPersonType, setOriginalPersonType] = useState("Attorney");
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const [originalFormData, setOriginalFormData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
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
          setOriginalPersonType("Attorney");
          setOriginalEmail(data.email || "");
          setOriginalFormData(data);
        } else {
          // If not found in attorneys, try legal students
          const studentRef = ref(db, `legalStudents/${id}`);
          onValue(studentRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              setPersonnelFormData(data);
              setPersonType("Legal Student");
              setOriginalPersonType("Legal Student");
              setOriginalEmail(data.email || "");
              setOriginalFormData(data);
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

  // Check if anything has changed from original
  const hasChanges = (() => {
    if (!originalFormData) return false;
    if (personType !== originalPersonType) return true;
    return JSON.stringify(personnelFormData) !== JSON.stringify(originalFormData);
  })();
  
  // 3. SAVE: Update Firebase
  const handleSave = async () => {
    setFeedback(null);
    setIsSaving(true);

    const newCollectionName = personType === "Attorney" ? "attorneys" : "legalStudents";
    const oldCollectionName = originalPersonType === "Attorney" ? "attorneys" : "legalStudents";
    const categoryChanged = personType !== originalPersonType;

    try {
      // If the email changed, call updateUserEmail cloud function
      const emailChanged = personnelFormData.email && personnelFormData.email !== originalEmail;
      if (emailChanged) {
        const functions = getFunctions();
        const updateUserEmail = httpsCallable(functions, "updateUserEmail");
        await updateUserEmail({ uid: id, newEmail: personnelFormData.email });
      }

      if (categoryChanged) {
        // Move record: write to new collection, delete from old collection
        const updates = {};
        updates[`/${newCollectionName}/${id}`] = personnelFormData;
        updates[`/${oldCollectionName}/${id}`] = null; // delete old
        await firebaseUpdate(ref(db), updates);

        // Update auth role to match new category
        const functions = getFunctions();
        const updateUserRole = httpsCallable(functions, "updateUserRole");
        const newRole = personType === "Attorney" ? "Attorney" : "Legal Student";
        await updateUserRole({ uid: id, role: newRole });
      } else {
        // Same category – just update in place
        const updates = {};
        updates[`/${newCollectionName}/${id}`] = personnelFormData;
        await firebaseUpdate(ref(db), updates);
      }

      setFeedback({
        type: "success",
        message: `Successfully updated ${personnelFormData.name || personType}.${emailChanged ? " A password reset email has been sent to the new address." : ""}`
      });
      setOriginalPersonType(personType);
      setOriginalEmail(personnelFormData.email);
      setTimeout(() => navigate("/personnel-library"), 1200);
    } catch (err) {
      console.error(`Error updating ${personType.toLowerCase()}: `, err);
      setFeedback({
        type: "error",
        message: err.message || `Failed to update ${personnelFormData.name || personType}.`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setFeedback(null);
    const collectionName = personType === "Attorney" ? "attorneys" : "legalStudents";
    const deletedName = personnelFormData.name || personnelFormData.email || "personnel";

    try {
      // Delete the auth account via cloud function
      const functions = getFunctions();
      const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
      await deleteUserAccount({ uid: id });

      // Remove the RTDB personnel record
      await firebaseRemove(ref(db, `${collectionName}/${id}`));

      setShowDeleteModal(false);
      setFeedback({
        type: "success",
        message: `${deletedName} has been permanently removed.`
      });
      setTimeout(() => navigate("/personnel-library"), 1200);
    } catch (err) {
      console.error("Error deleting personnel: ", err);
      setShowDeleteModal(false);
      setFeedback({
        type: "error",
        message: err.message || `Failed to remove ${deletedName}. Please try again.`
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle person type change
  const handlePersonChange = (e) => {
    setPersonType(e.target.value);
  };
  
  return (
    <div>
        <NavBar active={"personnel"}/>
        <div className="container py-5">
            {/* ── FEEDBACK BANNER ── */}
            {feedback && (
              <div
                className={`alert ${
                  feedback.type === "success" ? "alert-success" : "alert-danger"
                } alert-dismissible fade show`}
                role="alert"
              >
                {feedback.message}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setFeedback(null)}
                  aria-label="Close"
                />
              </div>
            )}

            <div className="d-flex justify-content-between align-items-start mb-4 pb-3">
            <div>
                <h1 className="fs-4 fw-bold mb-1">Edit {personType}</h1>
                <p className="err-color mb-2">{countFilledReqFields(personnelFormData)}/3 required fields</p>
            </div>
            <div className="text-end">
                <button type="button" className="btn btn-cancel me-2" onClick={() => navigate("/personnel-library")}>Cancel</button>
                <button type="button" className="btn btn-submit" disabled={!isFormValid || isSaving || !hasChanges} onClick={() => { if (personnelFormData.email && personnelFormData.email !== originalEmail) { setShowSaveModal(true); } else { handleSave(); } }}>{isSaving ? "Saving…" : "Save"}</button>
                <button type="button" className="btn btn-submit mx-3" onClick={handleDelete}>Delete</button>
            </div>
            </div>
            
            {/* ── PERSONNEL INFORMATION ── */}
            <div className="row mb-3 g-3">
            <div className="col-12 col-md-6">
                <label htmlFor="personType" className="form-label">Personnel Category</label>
                <select
                  className="form-select"
                  id="personType"
                  value={personType}
                  onChange={handlePersonChange}
                >
                  <option value="Attorney">Attorney</option>
                  <option value="Legal Student">Legal Student</option>
                </select>
            </div>
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

        {/* Save Confirmation Modal */}
        {showSaveModal && (
            <div className="am-modal-overlay">
                <div className="am-modal">
                    <div className="am-modal-header">
                        <h3 className="am-modal-title">Confirm Changes</h3>
                        <button
                            type="button"
                            className="am-modal-close"
                            onClick={() => setShowSaveModal(false)}
                            disabled={isSaving}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="am-modal-body">
                        <p>You are changing the email for <strong>{personnelFormData.name || "this personnel"}</strong> from <strong>{originalEmail}</strong> to <strong>{personnelFormData.email}</strong>.</p>
                        <p className="am-modal-warning">This will update their login credentials and a password reset email will be sent to the new address. Are you sure you want to proceed?</p>
                    </div>
                    <div className="am-modal-footer">
                        <button
                            type="button"
                            className="am-modal-btn am-modal-btn-cancel"
                            onClick={() => setShowSaveModal(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="am-modal-btn am-modal-btn-confirm"
                            onClick={() => { setShowSaveModal(false); handleSave(); }}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
            <div className="am-modal-overlay">
                <div className="am-modal">
                    <div className="am-modal-header">
                        <h3 className="am-modal-title">Remove Personnel</h3>
                        <button
                            type="button"
                            className="am-modal-close"
                            onClick={() => setShowDeleteModal(false)}
                            disabled={isDeleting}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="am-modal-body">
                        <p>Are you sure you want to permanently remove <strong>{personnelFormData.name || personnelFormData.email || "this personnel"}</strong>?</p>
                        <p className="am-modal-warning">This will delete their account and all associated personnel record. This action cannot be undone.</p>
                    </div>
                    <div className="am-modal-footer">
                        <button
                            type="button"
                            className="am-modal-btn am-modal-btn-cancel"
                            onClick={() => setShowDeleteModal(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="am-modal-btn am-modal-btn-confirm"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Removing..." : "Remove Permanently"}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}