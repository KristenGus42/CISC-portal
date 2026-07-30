import { NavBar } from "./NavBar";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, push as firebasePush, update as firebaseUpdate, onValue, remove as firebaseRemove} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useAuth } from "../auth/useAuth";
import resourcesData from "../data/resources.json";

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

// ─── Documents Tab ──────────────────────────────────────────────────────────────

function IconPaperclip() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFileOutline() {
  return (
    <svg width="52" height="64" viewBox="0 0 52 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2h26l14 14v44a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="white" stroke="var(--primary-text)" strokeWidth="2.5" />
      <path d="M32 2v12a2 2 0 0 0 2 2h12" fill="none" stroke="var(--primary-text)" strokeWidth="2.5" />
    </svg>
  );
}

function DocumentCard({ name }) {
  return (
    <div className="ef-doc-card">
      <div className="ef-doc-card-filename">
        <IconPaperclip />
        <span>{name}</span>
      </div>
      <div className="ef-doc-card-preview">
        <IconFileOutline />
        <span className="ef-doc-card-badge">PDF</span>
      </div>
    </div>
  );
}

function DocumentsSection({ title, documents }) {
  return (
    <div className="mb-4">
      <SectionDivider title={title} />
      {documents.length === 0 ? (
        <p className="text-muted small ef-documents-empty">Empty</p>
      ) : (
        <div className="ef-doc-grid">
          {documents.map((doc, i) => (
            <DocumentCard key={doc.id ?? i} name={doc.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ documents = {} }) {
  return (
    <div className="ef-tab-body">
      <DocumentsSection title="Client Documents" documents={documents.client ?? []} />
      <DocumentsSection title="Attorney Documents" documents={documents.attorney ?? []} />
    </div>
  );
}

// ─── Recommended Resources Tab ─────────────────────────────────────────────────

function IconFilter() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4c.183-.53.399-1.031.647-1.492.148-.277.31-.53.492-.756A7.024 7.024 0 0 0 2.255 4H4.09zM3.13 5.5A9.94 9.94 0 0 0 2.82 8H0a7.958 7.958 0 0 1 .656-2.5H3.13zM4.847 5A12.5 12.5 0 0 0 4.51 7.5H7.5V5H4.847zM8.5 5v2.5h2.99A12.495 12.495 0 0 0 11.153 5H8.5zM4.51 8.5c.032.892.15 1.735.337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472A6.696 6.696 0 0 1 4.73 13.5c-.248-.461-.464-.962-.647-1.492H2.255a7.024 7.024 0 0 0 3.072 2.464zM3.13 10.5H.656A7.958 7.958 0 0 0 0 8h2.82c.03.87.14 1.708.31 2.5zm7.542 3.972A7.024 7.024 0 0 0 13.745 12H11.91c-.183.53-.4 1.03-.648 1.492a6.688 6.688 0 0 1-.59.98zM11.153 11h2.474c.17-.792.28-1.63.31-2.5H10.51c-.032.892-.15 1.735-.337 2.5h.98zM13.745 4H11.91a10.9 10.9 0 0 0-.647-1.492 6.688 6.688 0 0 0-.59-.98A7.024 7.024 0 0 1 13.745 4zM10.855 4a8.02 8.02 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-2.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
    </svg>
  );
}

// Case categories use "Misc." but the resource data uses the full word.
function toResourceCategory(caseCategory) {
  return caseCategory === "Misc." ? "Miscellaneous" : caseCategory;
}

// The source data is just a list of URLs (no titles) — derive a readable
// title from the last path segment.
function titleFromUrl(url) {
  try {
    const { pathname, hostname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || hostname;
    return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

function ResourceCard({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="ef-res-card">
      <IconGlobe />
      <span className="ef-res-card-title">{titleFromUrl(url)}</span>
    </a>
  );
}

function ResourcesColumn({ subcategory, urls }) {
  return (
    <div className="ef-res-column">
      <span className="ef-res-column-label">{subcategory}</span>
      {urls.map((url) => (
        <ResourceCard key={url} url={url} />
      ))}
    </div>
  );
}

function RecommendedResourcesTab({ defaultCategory }) {
  const categories = Object.keys(resourcesData);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(
    categories.includes(defaultCategory) ? defaultCategory : categories[0]
  );
  const [activeFilters, setActiveFilters] = useState([]);

  function toggleFilter(category, subcategory) {
    setActiveFilters((prev) => {
      const exists = prev.some((f) => f.category === category && f.subcategory === subcategory);
      if (exists) return prev.filter((f) => !(f.category === category && f.subcategory === subcategory));
      return [...prev, { category, subcategory }];
    });
  }

  return (
    <div className="ef-tab-body">
      <div className="ef-res-toolbar">
        <div className="ef-res-filter-wrapper">
          <button type="button" className="btn btn-submit ef-res-filter-btn" onClick={() => setFilterOpen((o) => !o)}>
            <IconFilter /> Filter
          </button>
          {filterOpen && (
            <div className="ef-res-filter-panel">
              <select
                className="form-select form-select-sm mb-2"
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="ef-res-filter-options">
                {Object.keys(resourcesData[pickerCategory]).map((sub) => {
                  const checked = activeFilters.some((f) => f.category === pickerCategory && f.subcategory === sub);
                  return (
                    <label key={sub} className="ef-res-filter-option">
                      <input type="checkbox" checked={checked} onChange={() => toggleFilter(pickerCategory, sub)} />
                      {sub}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {activeFilters.map((f) => (
          <span key={`${f.category}-${f.subcategory}`} className="ef-res-chip">
            {f.subcategory}
            <button type="button" onClick={() => toggleFilter(f.category, f.subcategory)}>
              <IconClose />
            </button>
          </span>
        ))}
      </div>

      {activeFilters.length === 0 ? (
        <p className="text-muted small ef-documents-empty">Use Filter to add resource topics.</p>
      ) : (
        <div className="ef-res-grid">
          {activeFilters.map((f) => (
            <ResourcesColumn
              key={`${f.category}-${f.subcategory}`}
              subcategory={f.subcategory}
              urls={resourcesData[f.category][f.subcategory].pages}
            />
          ))}
        </div>
      )}
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
  const { role } = useAuth();
  const canDelete = role === "Admin" || role === "Staff";

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

  const [activeTab, setActiveTab] = useState("overview");

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

      <div className="container py-5 ef-page">
        <div className="ef-tabs">
          <div className="ef-tabs-buttons">
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "overview" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "documents" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "resources" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("resources")}
            >
              Recommended Resources
            </button>
          </div>
          {activeTab === "documents" && (
            <button
              type="button"
              className="btn btn-submit ef-upload-btn"
              disabled
              title="Document upload isn't wired up yet"
            >
              Upload
            </button>
          )}
        </div>

        <div className="ef-page-body">
        {activeTab === "documents" ? (
          <DocumentsTab />
        ) : activeTab === "resources" ? (
          <RecommendedResourcesTab defaultCategory={toResourceCategory(caseFormData.category)} />
        ) : (
        <>
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
            <SectionDivider title="Interpreter" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="interpreterName" name="interpreterName" label="Name" value={schedulingFormData.interpreterName} onChange={handleSchedulingChange}>
              <option value="">Select name</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="interpreterEmail" name="interpreterEmail" label="Email" type="email" value={schedulingFormData.interpreterEmail} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatInput id="interpreterPhone" name="interpreterPhone" label="Phone Number" type="tel" value={schedulingFormData.interpreterPhone} onChange={handleSchedulingChange} />
          </div>
        </div>

        {attorneySection}
        </>
        )}
        </div>

        {/* Bottom Section */}
        <div className="d-flex justify-content-between align-items-end mb-2 ef-bottom-bar">
          {/* Left side */}
          <div>
            {canDelete && (
              <button type="button" className="btn btn-submit danger" disabled={!isFormValid} onClick={handleDelete}>Delete</button>
            )}
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
