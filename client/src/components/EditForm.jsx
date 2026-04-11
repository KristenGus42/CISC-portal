import { NavBar } from "./NavBar";
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { cases } from "../mock_data/cases";
import { useEffect } from 'react';


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
        value={value}
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
        value={value}
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
        value={value}
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

// ─── Attorney–category pairing ────────────────────────────────────────────────

const CATEGORY_ATTORNEY_MAP = {
  "Consumer / Finance": "Consumer / Finance Attorney",
  "Education": "Education Attorney",
  "Employment": "Employment Attorney",
  "Family": "Family Attorney",
  "Juvenile": "Juvenile Attorney",
  "Health": "Health Attorney",
  "Housing": "Housing Attorney",
  "Income Maintenance": "Income Maintenance Attorney",
  "Individual Rights": "Civil Rights Attorney",
  "Misc.": "General Practice Attorney",
};

function countFilledReqFields(clientFormData) {
  const reqFieldNames = ["fname", "lname", "phone", "email"];
  var reqFieldCount = 0;
  for (const field of reqFieldNames) {
    console.log(clientFormData);
    if (clientFormData[field]) {
      reqFieldCount++;
    }
  }
  console.log(reqFieldCount);
  return reqFieldCount;
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ContactForm(props) {
  const attorneyAccount = props.attorney;

  const navigate = useNavigate();
  const { id } = useParams();
  const currentCase = cases.find((c) => c.id === id);

  const [clientFormData, setClientFormData] = useState({
    fname:           currentCase?.clientInfo.fname           || "",
    lname:           currentCase?.clientInfo.lname           || "",
    addressLine1:    currentCase?.clientInfo.addressLine1    || "",
    city:            currentCase?.clientInfo.city            || "",
    age:             currentCase?.clientInfo.age             || "",
    sex:             currentCase?.clientInfo.sex             || "",
    incomeLevel:     currentCase?.clientInfo.incomeLevel     || "",
    addressLine2:    currentCase?.clientInfo.addressLine2    || "",
    zipCode:         currentCase?.clientInfo.zipCode         || "",
    phone:           currentCase?.clientInfo.phone           || "",
    backupPhone:     currentCase?.clientInfo.backupPhone     || "",
    email:           currentCase?.clientInfo.email           || "",
    availability:    currentCase?.clientInfo.availability    || "",
    primaryLanguage: currentCase?.clientInfo.primaryLanguage || "",
    proficiencyLevel:currentCase?.clientInfo.proficiencyLevel|| "",
  });

  const [caseFormData, setCaseFormData] = useState({
    category:         currentCase?.caseInfo.category         || "",
    attorneyType:     currentCase?.caseInfo.attorneyType     || "",
    briefDescription: currentCase?.caseInfo.briefDescription || "",
    remarks:          currentCase?.caseInfo.remarks          || "",
  });

  const [schedulingFormData, setSchedulingFormData] = useState({
    date:            currentCase?.schedulingInfo?.date            || "",
    timeSlot:        currentCase?.schedulingInfo?.timeSlot        || "",
    meetingPlatform: currentCase?.schedulingInfo?.meetingPlatform || "",
    meetingLink:     currentCase?.schedulingInfo?.meetingLink     || "",
    attorneyName:    currentCase?.schedulingInfo?.attorneyName    || "",
    attorneyEmail:   currentCase?.schedulingInfo?.attorneyEmail   || "",
    attorneyPhone:   currentCase?.schedulingInfo?.attorneyPhone   || "",
    legalStudentName:  currentCase?.schedulingInfo?.legalStudentName  || "",
    legalStudentEmail: currentCase?.schedulingInfo?.legalStudentEmail || "",
    legalStudentPhone: currentCase?.schedulingInfo?.legalStudentPhone || "",
    interpreterName:   currentCase?.schedulingInfo?.interpreterName   || "",
    interpreterEmail:  currentCase?.schedulingInfo?.interpreterEmail  || "",
    interpreterPhone:  currentCase?.schedulingInfo?.interpreterPhone  || "",
  });

  const [attorneyNotesFormData, setAttorneyNotesFormData] = useState({
    clientConsent:      currentCase?.attorneyNotes?.clientConsent      || "",
    referralPermission: currentCase?.attorneyNotes?.referralPermission || "",
    followUpProBono:    currentCase?.attorneyNotes?.followUpProBono    || "",
    visitSummaryStatus: currentCase?.attorneyNotes?.visitSummaryStatus || "",
    visitSummary:       currentCase?.attorneyNotes?.visitSummary       || "",
    reasonForVisit:     currentCase?.attorneyNotes?.reasonForVisit     || "",
  });

  const [matchFormData, setMatchFormData] = useState({
    attorney:     currentCase?.matchInfo?.attorney     || "",
    legalStudent: currentCase?.matchInfo?.legalStudent || "",
    interpreter:  currentCase?.matchInfo?.interpreter  || "",
  });

  // Generic handler factory — covers all simple field updates
  const makeChangeHandler = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange        = makeChangeHandler(setClientFormData);
  const handleSchedulingChange    = makeChangeHandler(setSchedulingFormData);
  const handleAttorneyNotesChange = makeChangeHandler(setAttorneyNotesFormData);
  const handleMatchChange         = makeChangeHandler(setMatchFormData);

  // Case handler is custom: auto-fills attorney type when category changes
  const handleCaseChange = (e) => {
    const { name, value } = e.target;
    setCaseFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "category" ? { attorneyType: CATEGORY_ATTORNEY_MAP[value] || "" } : {}),
    }));
  };

  const handleSubmit = () => {
    if (id) {
      const index = cases.findIndex((c) => c.id === id);
      cases[index] = {
        ...cases[index],
        clientInfo:    { ...clientFormData },
        caseInfo:      { ...caseFormData },
        schedulingInfo:{ ...schedulingFormData },
        attorneyNotes: { ...attorneyNotesFormData },
        matchInfo:     { ...matchFormData },
      };
    } else {
      cases.push({
        id: String(cases.length + 1),
        clientInfo:    { ...clientFormData },
        caseInfo:      { ...caseFormData },
        schedulingInfo:{ ...schedulingFormData },
        attorneyNotes: { ...attorneyNotesFormData },
        matchInfo:     { ...matchFormData },
      });
    }

    navigate("/case-library");
  };

  const handleCancel = () => {
    // TODO: Add something here like a confirmation "are you sure you want to lose your work? It will not be saved"
    navigate("/case-library");
  }

  const header = props.newForm
    ? <NewClientHeader />
    : <ExistingClientHeader currentCase={currentCase} handleMatchChange={handleMatchChange} matchFormData={matchFormData} />;

  const attorneySection = props.attorney 
    ? <AttorneySection
            attorneyNotesFormData={attorneyNotesFormData}
            handleAttorneyNotesChange={handleAttorneyNotesChange}
          />
    : "";

    // Set initial state
    const [isFormValid, setIsFormValid] = useState(false);    
    useEffect(() => {
      setIsFormValid(countFilledReqFields(clientFormData) >= 4);
    }, [clientFormData]);



  return (
    <div>
      <NavBar active={"cases"} />
      {header}

      <div className="container py-5">
        <h1 className="fs-4 fw-bold mb-1 ">Overview</h1>
        <p className="small mb-4 err-color">* indicates required field</p>

        {/* ── CLIENT INFORMATION ── */}
        <div className="row mb-3 g-4">
          <SectionDivider title="Client Information" />

          {/* Row 1 */}
          <div className="col-3">
            <FloatInput id="fname" name="fname" label="First Name" required value={clientFormData.fname} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="lname" name="lname" label="Last Name" required value={clientFormData.lname} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="addressLine1" name="addressLine1" label="Address Line 1"  value={clientFormData.addressLine1} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="city" name="city" label="City"  value={clientFormData.city} onChange={handleClientChange} />
          </div>

          {/* Row 2 */}
          <div className="col-2">
            <FloatInput id="age" name="age" label="Age"  value={clientFormData.age} onChange={handleClientChange} />
          </div>
          <div className="col-2">
            <FloatInput id="sex" name="sex" label="Sex"  value={clientFormData.sex} onChange={handleClientChange} />
          </div>
          <div className="col-2">
            <FloatInput id="incomeLevel" name="incomeLevel" label="Income Level"  value={clientFormData.incomeLevel} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="addressLine2" name="addressLine2" label="Address Line 2"  value={clientFormData.addressLine2} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="zipCode" name="zipCode" label="Zip Code"  value={clientFormData.zipCode} onChange={handleClientChange} />
          </div>

          {/* Row 3 */}
          <div className="col-3">
            <FloatInput id="phone" name="phone" label="Phone Number" required type="tel" value={clientFormData.phone} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="backupPhone" name="backupPhone" label="Backup Phone Number"  type="tel" value={clientFormData.backupPhone} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatInput id="email" name="email" label="Email" required type="email" value={clientFormData.email} onChange={handleClientChange} />
          </div>
          <div className="col-3">
            <FloatSelect id="availability" name="availability" label="Availability"  value={clientFormData.availability} onChange={handleClientChange}>
              <option value="">Select availability</option>
              <option value="Free">Free</option>
              <option value="Busy">Busy</option>
            </FloatSelect>
          </div>

          {/* Row 4 */}
          <div className="col-3">
            <FloatSelect id="primaryLanguage" name="primaryLanguage" label="Primary Language"  value={clientFormData.primaryLanguage} onChange={handleClientChange}>
              <option value="">Select language</option>
              <option value="English">English</option>
              <option value="Mandarin">Mandarin</option>
              <option value="Cantonese">Cantonese</option>
              <option value="Hokkien">Hokkien</option>
              <option value="Other">Other (indicate in remarks)</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="proficiencyLevel" name="proficiencyLevel" label="Level of Proficiency"  value={clientFormData.proficiencyLevel} onChange={handleClientChange}>
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

          {/* Row 1 */}
          <div className="col-3">
            <FloatSelect id="category" name="category" label="Category"  value={caseFormData.category} onChange={handleCaseChange}>
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
            <FloatSelect id="attorneyType" name="attorneyType" label="Type of Attorney"  value={caseFormData.attorneyType} onChange={handleCaseChange}>
              <option value="">Select attorney type</option>
              <option value="Consumer / Finance Attorney">Consumer / Finance Attorney</option>
              <option value="Education Attorney">Education Attorney</option>
              <option value="Employment Attorney">Employment Attorney</option>
              <option value="Family Attorney">Family Attorney</option>
              <option value="Juvenile Attorney">Juvenile Attorney</option>
              <option value="Health Attorney">Health Attorney</option>
              <option value="Housing Attorney">Housing Attorney</option>
              <option value="Income Maintenance Attorney">Income Maintenance Attorney</option>
              <option value="Civil Rights Attorney">Civil Rights Attorney</option>
              <option value="General Practice Attorney">General Practice Attorney</option>
            </FloatSelect>
          </div>

          {/* Row 2 */}
          <div className="col-6">
            <FloatInput id="briefDescription" name="briefDescription" label="Brief Description of Issues"  value={caseFormData.briefDescription} onChange={handleCaseChange} />
          </div>
          <div className="col-9">
            <FloatInput id="remarks" name="remarks" label="Remarks" value={caseFormData.remarks} onChange={handleCaseChange} />
          </div>
        </div>

        {/* ── SCHEDULING ── */}
        <div className="row mb-3 g-4">
          <SectionDivider title="Scheduling" />

          {/*Row 1*/}
          <div className="col-3">
            <FloatInput id="date" name="date" label="Date"  type="date" value={schedulingFormData.date} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatSelect id="timeSlot" name="timeSlot" label="Time Slot"  value={schedulingFormData.timeSlot} onChange={handleSchedulingChange}>
              <option value="">Select a time slot</option>
              <option value="5:30pm">5:30pm</option>
              <option value="6:10pm">6:10pm</option>
              <option value="6:50pm">6:50pm</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatSelect id="meetingPlatform" name="meetingPlatform" label="Meeting Platform"  value={schedulingFormData.meetingPlatform} onChange={handleSchedulingChange}>
              <option value="">Select a platform</option>
              <option value="Virtual">Virtual</option>
              <option value="Phone Call">Phone Call</option>
              <option value="In Person">In Person</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="meetingLink" name="meetingLink" label="Meeting Link"  value={schedulingFormData.meetingLink} onChange={handleSchedulingChange} />
          </div>

          {/*Row 2 - Attorney*/}
          <div className="col-12">
            <SectionDivider title="Attorney" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="attorneyName" name="attorneyName" label="Name" value={schedulingFormData.attorneyName} onChange={handleSchedulingChange}>
              <option value="">Select name</option>
              <option value="Option 1">Option 1</option>
              <option value="Option 2">Option 2</option>
              <option value="Option 3">Option 3</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="attorneyEmail" name="attorneyEmail" label="Email" type="email" value={schedulingFormData.attorneyEmail} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatInput id="attorneyPhone" name="attorneyPhone" label="Phone Number" type="tel" value={schedulingFormData.attorneyPhone} onChange={handleSchedulingChange} />
          </div>

          {/*Row 3 - Legal Student*/}
          <div className="col-12">
            <SectionDivider title="Legal Student" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="legalStudentName" name="legalStudentName" label="Name" value={schedulingFormData.legalStudentName} onChange={handleSchedulingChange}>
              <option value="">Select name</option>
              <option value="Option 1">Option 1</option>
              <option value="Option 2">Option 2</option>
              <option value="Option 3">Option 3</option>
            </FloatSelect>
          </div>
          <div className="col-3">
            <FloatInput id="legalStudentEmail" name="legalStudentEmail" label="Email" type="email" value={schedulingFormData.legalStudentEmail} onChange={handleSchedulingChange} />
          </div>
          <div className="col-3">
            <FloatInput id="legalStudentPhone" name="legalStudentPhone" label="Phone Number" type="tel" value={schedulingFormData.legalStudentPhone} onChange={handleSchedulingChange} />
          </div>

          {/*Row 4 - Interpreter*/}
          <div className="col-12">
            <SectionDivider title="Interpreter" sub />
          </div>
          <div className="col-3">
            <FloatSelect id="interpreterName" name="interpreterName" label="Name" value={schedulingFormData.interpreterName} onChange={handleSchedulingChange}>
              <option value="">Select name</option>
              <option value="Option 1">Option 1</option>
              <option value="Option 2">Option 2</option>
              <option value="Option 3">Option 3</option>
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

        {/* Bottom Section */}
        <div className="d-flex flex-column align-items-end">
          <div className="mb-2">
            <div>
              <p className="err-color">{countFilledReqFields(clientFormData)}/4 required fields</p>
            </div>
            <div>
              <button type="button" className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
              <button type="button" className="btn btn-submit" disabled={!isFormValid} onClick={handleSubmit}> Save </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────

function ExistingClientHeader({ currentCase }) {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-0 edit-form-title">
            {currentCase?.clientInfo.fname || "Client Name not Assigned"} {currentCase?.clientInfo.lname || ""}
          </p>
          <p className="mb-0 edit-form-subtitle">
            {currentCase?.caseInfo.category || "Category not Assigned"} | {currentCase?.clientInfo.primaryLanguage || "Language not Assigned"}
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

      {/* Consent subsection */}
      <div className="col-12">
        <SectionDivider title="Consent (attorney check)" sub />
        <label className="form-label fw-semibold small">Consent Statement</label>
        <p>I understand that:</p>
        <ul>
          <li>Neighborhood Legal Clinics (NLC) program provides advice and consultation only.</li>
          <li>NLC attorneys are volunteers and are not available for hire.</li>
          <li>NLC attorney may not specialize in the area of law needed.</li>
          <li>Information disclosed is protected by attorney-client privilege.</li>
          <li>I cannot return for the same issue if it lacks legal merit.</li>
          <li>The NLC is drug, alcohol, weapon, and threat free.</li>
        </ul>

        <div className="row g-4">
          <div className="col-3">
            <FloatSelect
              id="clientConsent"
              name="clientConsent"
              label="Client Consent"
              
              value={attorneyNotesFormData.clientConsent}
              onChange={handleAttorneyNotesChange}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </FloatSelect>
          </div>

          <div className="col-3">
            <FloatSelect
              id="referralPermission"
              name="referralPermission"
              label="Referral Permission"
              
              value={attorneyNotesFormData.referralPermission}
              onChange={handleAttorneyNotesChange}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </FloatSelect>
          </div>
        </div>
      </div>

      {/* Future work */}
      <div className="col-12">
        <SectionDivider title="Future work with client" sub />
        <label className="form-label fw-semibold small ">
          Do you plan to follow up outside the clinic pro bono?
        </label>
        <div className="d-flex gap-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="followUpProBono"
              value="Yes"
              checked={attorneyNotesFormData.followUpProBono === "Yes"}
              onChange={handleAttorneyNotesChange}
            />
            <label className="form-check-label small">Yes</label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="followUpProBono"
              value="No"
              checked={attorneyNotesFormData.followUpProBono === "No"}
              onChange={handleAttorneyNotesChange}
            />
            <label className="form-check-label small">No</label>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="col-12">
        <SectionDivider title="Summary of visit" sub />
        <FloatTextarea
          id="visitSummary"
          name="visitSummary"
          label="Please summarize client's legal issue and advice given"
          
          value={attorneyNotesFormData.visitSummary}
          onChange={handleAttorneyNotesChange}
          height="140px"
        />
      </div>

      {/* Reason */}
      <div className="col-12">
        <SectionDivider title="Reason for client's visit" sub />
        <div className="d-flex flex-column gap-2">
          {[
            "Consumer / Finance",
            "Education",
            "Employment",
            "Family",
            "Juvenile",
            "Health",
            "Housing",
            "Income Maintenance",
            "Individual Rights",
            "Misc.",
          ].map((reason) => (
            <div className="form-check" key={reason}>
              <input
                className="form-check-input"
                type="radio"
                name="reasonForVisit"
                value={reason}
                checked={attorneyNotesFormData.reasonForVisit === reason}
                onChange={handleAttorneyNotesChange}
              />
              <label className="form-check-label small">{reason}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}