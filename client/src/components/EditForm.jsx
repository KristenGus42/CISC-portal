import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, push as firebasePush, update as firebaseUpdate, onValue, remove as firebaseRemove} from 'firebase/database';
import { getAuth } from 'firebase/auth';

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

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ title, sub }) {
  return (
    <div className={`d-flex align-items-center ${sub ? "mb-1" : "mt-5"}`}>
      <span className={`${sub ? "" : "fw-semibold "}text-muted small`}>{title}</span>
      <hr className="flex-grow-1 m-0" />
    </div>
  );
}

// ─── Helper function ──────────────────────────────────────────────────────────

function countFilledReqFields(clientFormData) {
  const reqFieldNames = ["fname", "lname", "phone", "email"];
  let reqFieldCount = 0;
  for (const field of reqFieldNames) {
    if (clientFormData[field]) {
      reqFieldCount++;
    }
  }
  return reqFieldCount;
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ContactForm(props) {
  const navigate = useNavigate();
  const { id } = useParams(); // Firebase ID if editing
  const db = getDatabase();

  // State objects
  const [clientFormData, setClientFormData] = useState({
    fname: "", lname: "", addressLine1: "", city: "", age: "", sex: "",
    incomeLevel: "", addressLine2: "", zipCode: "", phone: "",
    backupPhone: "", email: "", availability: "", primaryLanguage: "", proficiencyLevel: "",
  });

  const [caseFormData, setCaseFormData] = useState({
    category: "", attorneyType: "", briefDescription: "", remarks: "",
  });

  const [schedulingFormData, setSchedulingFormData] = useState({
    date: "", timeSlot: "", meetingPlatform: "", meetingLink: "",
    attorneyName: "", attorneyEmail: "", attorneyPhone: "",
    legalStudentName: "", legalStudentEmail: "", legalStudentPhone: "",
    interpreterName: "", interpreterEmail: "", interpreterPhone: "",
  });

  const [attorneyNotesFormData, setAttorneyNotesFormData] = useState({
    clientConsent: "", referralPermission: "", followUpProBono: "",
    visitSummaryStatus: "", visitSummary: "", reasonForVisit: "",
  });

  const [matchFormData, setMatchFormData] = useState({
    attorney: "", legalStudent: "", interpreter: "",
  });

  const [isFormValid, setIsFormValid] = useState(false);

  const [dateAdded, setDateAdded] = useState("");

  // 1. EFFECT: Fetch data from Firebase if an ID exists (Editing mode)
  useEffect(() => {
    if (id) {
      const caseRef = ref(db, `cases/${id}`);
      onValue(caseRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.clientInfo) setClientFormData(data.clientInfo);
          if (data.caseInfo) setCaseFormData(data.caseInfo);
          if (data.schedulingInfo) setSchedulingFormData(data.schedulingInfo);
          if (data.attorneyNotes) setAttorneyNotesFormData(data.attorneyNotes);
          if (data.matchInfo) setMatchFormData(data.matchInfo);
          if (data.dateAdded) setDateAdded(data.dateAdded);
        }
      });
    }
  }, [id, db]);

  // 2. EFFECT: Validation logic
  useEffect(() => {
    setIsFormValid(countFilledReqFields(clientFormData) >= 4);
  }, [clientFormData]);

  // Handlers
  const makeChangeHandler = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = makeChangeHandler(setClientFormData);
  const handleCaseChange = makeChangeHandler(setCaseFormData);
  const handleSchedulingChange = makeChangeHandler(setSchedulingFormData);
  const handleAttorneyNotesChange = makeChangeHandler(setAttorneyNotesFormData);
  const handleMatchChange = makeChangeHandler(setMatchFormData);

  // 3. SUBMIT: Push or Update Firebase
  const handleSubmit = () => {

    const fullCaseData = {
      clientInfo: clientFormData,
      caseInfo: caseFormData,
      schedulingInfo: schedulingFormData,
      attorneyNotes: attorneyNotesFormData,
      matchInfo: matchFormData,
      status: (matchFormData && matchFormData.attorney) ? "scheduled" : "waitlisted", 
      dateAdded: dateAdded ? dateAdded : new Date().toLocaleString()
     };

    if (id) {
      // Update existing record fields without replacing metadata like createdBy.
      firebaseUpdate(ref(db, `cases/${id}`), fullCaseData)
        .then(() => navigate("/case-library"))
        .catch((err) => console.error("Error updating case: ", err));
    } else {
      // Stamp the creator's UID on new cases
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        fullCaseData.createdBy = currentUser.uid;
      }
      // Create new record
      const casesListRef = ref(db, 'cases');
      firebasePush(casesListRef, fullCaseData)
        .then(() => navigate("/case-library"))
        .catch((err) => console.error("Error saving new case: ", err));
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this case? This action cannot be undone.")) {
      firebaseRemove(ref(db, `cases/${id}`))
        .then(() => navigate("/case-library"))
        .catch((err) => console.error(`Error removing case: `, err));
    }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to exit this page? All progress will be lost.")) {
      navigate("/case-library");
    }
  };

  const header = props.newForm
    ? <NewClientHeader />
    : <ExistingClientHeader clientFormData={clientFormData} caseFormData={caseFormData} dateAdded={dateAdded}/>;

  const attorneySection = props.attorney 
    ? <AttorneySection
        attorneyNotesFormData={attorneyNotesFormData}
        handleAttorneyNotesChange={handleAttorneyNotesChange}
      />
    : "";

  return (
    <div>
      <NavBar active={"cases"} />
      {header}

      <div className="container py-5">
        <h1 className="fs-4 fw-bold mb-1">Overview</h1>
        <p className="small mb-4 err-color">* indicates required field</p>

        {/* ── CLIENT INFORMATION ── */}
        <div className="row mb-3 g-4">
          <SectionDivider title="Client Information" />
          <div className="col-3">
            <FloatInput id="fname" name="fname" label="First Name" required value={clientFormData.fname} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="lname" name="lname" label="Last Name" required value={clientFormData.lname} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="addressLine1" name="addressLine1" label="Address Line 1" value={clientFormData.addressLine1} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="city" name="city" label="City" value={clientFormData.city} onChange={handleClientChange} />
          </div>
          <div className="col-2">
            <FloatInput id="age" name="age" label="Age" value={clientFormData.age} onChange={handleClientChange} />
          </div>
          <div className="col-2">
            <FloatInput id="sex" name="sex" label="Sex" value={clientFormData.sex} onChange={handleClientChange} />
          </div>
          <div className="col-2">
            <FloatInput id="incomeLevel" name="incomeLevel" label="Income Level" value={clientFormData.incomeLevel} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="addressLine2" name="addressLine2" label="Address Line 2" value={clientFormData.addressLine2} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="zipCode" name="zipCode" label="Zip Code" value={clientFormData.zipCode} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="phone" name="phone" label="Phone Number" required type="tel" value={clientFormData.phone} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="backupPhone" name="backupPhone" label="Backup Phone Number" type="tel" value={clientFormData.backupPhone} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="email" name="email" label="Email" required type="email" value={clientFormData.email} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatSelect id="availability" name="availability" label="Availability" value={clientFormData.availability} onChange={handleClientChange}>
              <option value="">Select availability</option>
              <option value="Free">Free</option>
              <option value="Busy">Busy</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="primaryLanguage" name="primaryLanguage" label="Primary Language" value={clientFormData.primaryLanguage} onChange={handleClientChange}>
              <option value="">Select language</option>
              <option value="English">English</option>
              <option value="Mandarin">Mandarin</option>
              <option value="Cantonese">Cantonese</option>
              <option value="Hokkien">Hokkien</option>
              <option value="Other">Other (indicate in remarks)</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="proficiencyLevel" name="proficiencyLevel" label="Level of Proficiency" value={clientFormData.proficiencyLevel} onChange={handleClientChange}>
              <option value="">Select proficiency</option>
              <option value="Fluent">Fluent</option>
              <option value="Working Proficiency">Working Proficiency</option>
              <option value="Limited">Limited</option>
            </FloatSelect>
          </div>
        </div>

        {/* ── CASE INFORMATION ── */}
        <div className="row mb-3 g-4">
          <SectionDivider title="Case Information" />
          <div className="col-3">
            <FloatSelect id="category" name="category" label="Category" value={caseFormData.category} onChange={handleCaseChange}>
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
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="attorneyType" name="attorneyType" label="Type of Attorney" value={caseFormData.attorneyType} onChange={handleCaseChange}>
              <option value="">Select attorney type</option>
              <option value="Corporate Law">Corporate Law</option>
              <option value="Criminal Defense">Criminal Defense</option>
              <option value="Family Law">Family Law</option>
              <option value="Immigration Law">Immigration Law</option>
              <option value="Tax Law">Tax Law</option>
              <option value="Real Estate Law">Real Estate Law</option>
              <option value="Employment Law">Employment Law</option>
              <option value="Personal Injury">Personal Injury</option>
              <option value="Intellectual Property">Intellectual Property</option>
              <option value="General Practice">General Practice</option>
            </FloatSelect>
          </div>
          <div className="col-6">
            <FloatInput id="briefDescription" name="briefDescription" label="Brief Description of Issues" value={caseFormData.briefDescription} onChange={handleCaseChange} />
          </div>
          <div className="col-9">
            <FloatInput id="remarks" name="remarks" label="Remarks" value={caseFormData.remarks} onChange={handleCaseChange} />
          </div>
        </div>

        {/* ── SCHEDULING ── */}
        <div className="row mb-3 g-4">
          <SectionDivider title="Scheduling" />
          <div className="col-3">
            <FloatInput id="date" name="date" label="Date" type="date" value={schedulingFormData.date} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatSelect id="timeSlot" name="timeSlot" label="Time Slot" value={schedulingFormData.timeSlot} onChange={handleSchedulingChange}>
              <option value="">Select a time slot</option>
              <option value="5:30pm">5:30pm</option>
              <option value="6:10pm">6:10pm</option>
              <option value="6:50pm">6:50pm</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="meetingPlatform" name="meetingPlatform" label="Meeting Platform" value={schedulingFormData.meetingPlatform} onChange={handleSchedulingChange}>
              <option value="">Select a platform</option>
              <option value="Virtual">Virtual</option>
              <option value="Phone Call">Phone Call</option>
              <option value="In Person">In Person</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="meetingLink" name="meetingLink" label="Meeting Link" value={schedulingFormData.meetingLink} onChange={handleSchedulingChange} />
          </div>

          <div className="col-12">
            <SectionDivider title="Attorney" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="attorneyName" name="attorneyName" label="Name" value={schedulingFormData.attorneyName} onChange={handleSchedulingChange}>
               <option value="">Select name</option>
               <option value="Option 1">Option 1</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="attorneyEmail" name="attorneyEmail" label="Email" type="email" value={schedulingFormData.attorneyEmail} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatInput id="attorneyPhone" name="attorneyPhone" label="Phone Number" type="tel" value={schedulingFormData.attorneyPhone} onChange={handleSchedulingChange} />
          </div>

          <div className="col-12">
            <SectionDivider title="Legal Student" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="legalStudentName" name="legalStudentName" label="Name" value={schedulingFormData.legalStudentName} onChange={handleSchedulingChange}>
              <option value="">Select name</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="legalStudentEmail" name="legalStudentEmail" label="Email" type="email" value={schedulingFormData.legalStudentEmail} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatInput id="legalStudentPhone" name="legalStudentPhone" label="Phone Number" type="tel" value={schedulingFormData.legalStudentPhone} onChange={handleSchedulingChange} />
          </div>
        </div>

        {attorneySection}

        {/* Bottom Section */}
        <div className="d-flex justify-content-between align-items-end mb-2">
          {/* Left side */}
          <div>
            <button type="button" className="btn btn-submit danger" disabled={!isFormValid} onClick={handleDelete}>Delete</button>
          </div>

          {/* Right side */}
          <div className="d-flex flex-column align-items-end">
            <p className="err-color">{countFilledReqFields(clientFormData)}/4 required fields</p>
            <div>
              <button type="button" className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
              <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSubmit}>Save</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────

function ExistingClientHeader({ clientFormData, caseFormData, dateAdded }) {
  return (
    <div className="container py-5 mb-0">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-0 edit-form-title">
            {clientFormData.fname || "Client Name not Assigned"} {clientFormData.lname || ""}
          </p>
          <p className="mb-0 edit-form-subtitle">
            {caseFormData.category || "Category not Assigned"} | {clientFormData.primaryLanguage || "Language not Assigned"} | Date Added: {dateAdded.split(" ")[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewClientHeader() {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>New Case</h1>
      </div>
    </div>
  );
}

function AttorneySection({ attorneyNotesFormData, handleAttorneyNotesChange }) {
  return (
    <div className="row mb-3 g-4" id="attorney-section">
      <SectionDivider title="Consultation Notes" />
      <div className="col-12">
        <SectionDivider title="Consent (attorney check)" sub />
        <label className="form-label fw-semibold small">Consent Statement</label>
        <ul>
          <li>Advice and consultation only.</li>
          <li>Attorneys are volunteers.</li>
          <li>Privileged information.</li>
        </ul>
        <div className="row g-4">
          <div className="col-3">
            <FloatSelect id="clientConsent" name="clientConsent" label="Client Consent" value={attorneyNotesFormData.clientConsent} onChange={handleAttorneyNotesChange}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </FloatSelect>
          </div>
        </div>
      </div>
      <div className="col-12">
        <SectionDivider title="Summary of visit" sub />
        <FloatTextarea id="visitSummary" name="visitSummary" label="Summary" value={attorneyNotesFormData.visitSummary} onChange={handleAttorneyNotesChange} height="140px" />
      </div>
    </div>
  );
}
