import { NavBar } from "../../src/components/NavBar";
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { cases } from "../../src/mock_data/cases";

export default function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentCase = cases.find((c) => c.id === id);

  const [clientFormData, setClientFormData] = useState({
    fname: currentCase?.clientInfo.fname || "",
    lname: currentCase?.clientInfo.lname || "",
    addressLine1: currentCase?.clientInfo.addressLine1 || "",
    city: currentCase?.clientInfo.city || "",
    age: currentCase?.clientInfo.age || "",
    sex: currentCase?.clientInfo.sex || "",
    incomeLevel: currentCase?.clientInfo.incomeLevel || "",
    addressLine2: currentCase?.clientInfo.addressLine2 || "",
    zipCode: currentCase?.clientInfo.zipCode || "",
    primaryLanguage: currentCase?.clientInfo.primaryLanguage || "",
    proficiencyLevel: currentCase?.clientInfo.proficiencyLevel || "",
  });

  const [caseFormData, setCaseFormData] = useState({
    category: currentCase?.caseInfo.category || "",
    attorneyType: currentCase?.caseInfo.attorneyType || "",
    briefDescription: currentCase?.caseInfo.briefDescription || "",
    remarks: currentCase?.caseInfo.remarks || "",
  });

  const [schedulingFormData, setSchedulingFormData] = useState({
    date: currentCase?.schedulingInfo?.date || "",
    timeSlot: currentCase?.schedulingInfo?.timeSlot || "",
    meetingPlatform: currentCase?.schedulingInfo?.meetingPlatform || "",
    meetingLink: currentCase?.schedulingInfo?.meetingLink || "",
  });

  const [attorneyNotesFormData, setAttorneyNotesFormData] = useState({
    clientConsent: currentCase?.attorneyNotes?.clientConsent || "",
    referralPermission: currentCase?.attorneyNotes?.referralPermission || "",
    followUpProBono: currentCase?.attorneyNotes?.followUpProBono || "",
    visitSummaryStatus: currentCase?.attorneyNotes?.visitSummaryStatus || "",
    visitSummary: currentCase?.attorneyNotes?.visitSummary || "",
    reasonForVisit: currentCase?.attorneyNotes?.reasonForVisit || "",
  });

  const [matchFormData, setMatchFormData] = useState({
    attorney: currentCase?.matchInfo?.attorney || "",
    legalStudent: currentCase?.matchInfo?.legalStudent || "",
    interpreter: currentCase?.matchInfo?.interpreter || "",
  });

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleCaseChange = (e) => {
    const { name, value } = e.target;
    setCaseFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSchedulingChange = (e) => {
    const { name, value } = e.target;
    setSchedulingFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleAttorneyNotesChange = (e) => {
    const { name, value } = e.target;
    setAttorneyNotesFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleMatchChange = (e) => {
    const { name, value } = e.target;
    setMatchFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (id) {
      const index = cases.findIndex((c) => c.id === id);
      cases[index] = {
        ...cases[index],
        clientInfo: { ...clientFormData },
        caseInfo: { ...caseFormData },
        schedulingInfo: { ...schedulingFormData },
        attorneyNotes: { ...attorneyNotesFormData },
        matchInfo: { ...matchFormData },
      };
    } else {
      const newCase = {
        id: String(cases.length + 1),
        clientInfo: { ...clientFormData },
        caseInfo: { ...caseFormData },
        schedulingInfo: { ...schedulingFormData },
        attorneyNotes: { ...attorneyNotesFormData },
        matchInfo: { ...matchFormData },
      };
      cases.push(newCase);
    }
    navigate("/case-library");
  };

  const header = id ?
    <ExistingClientHeader currentCase={currentCase} handleMatchChange={handleMatchChange} matchFormData={matchFormData} handleSubmit={handleSubmit} /> :
    <NewClientHeader handleSubmit={handleSubmit} />;

  return (
    <div>
      <NavBar active={"cases"} />
      {header}

      <div className="container py-5">
        <h1 className="fs-4 fw-bold mb-1">Overview</h1>
        <p className="small mb-4"></p>

        {/* ── CLIENT INFORMATION ── */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Client Information</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control required" id="fname" name="fname" placeholder="First Name" value={clientFormData.fname} onChange={handleClientChange} />
              <label htmlFor="fname" className="required">First Name</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="lname" name="lname" placeholder="Last Name" value={clientFormData.lname} onChange={handleClientChange} />
              <label htmlFor="lname">Last Name</label>
            </div>
          </div>
          <div className="col-2">
            <div className="form-floating">
              <input type="text" className="form-control" id="age" name="age" placeholder="Age" value={clientFormData.age} onChange={handleClientChange} />
              <label htmlFor="age">Age</label>
            </div>
          </div>
          <div className="col-2">
            <div className="form-floating">
              <input type="text" className="form-control" id="sex" name="sex" placeholder="Sex" value={clientFormData.sex} onChange={handleClientChange} />
              <label htmlFor="sex">Sex</label>
            </div>
          </div>
          <div className="col-2">
            <div className="form-floating">
              <input type="text" className="form-control" id="incomeLevel" name="incomeLevel" placeholder="Income Level" value={clientFormData.incomeLevel} onChange={handleClientChange} />
              <label htmlFor="incomeLevel">Income Level</label>
            </div>
          </div>

          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="addressLine1" name="addressLine1" placeholder="Address Line 1" value={clientFormData.addressLine1} onChange={handleClientChange} />
              <label htmlFor="addressLine1">Address Line 1</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="addressLine2" name="addressLine2" placeholder="Address Line 2" value={clientFormData.addressLine2} onChange={handleClientChange} />
              <label htmlFor="addressLine2">Address Line 2</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="city" name="city" placeholder="City" value={clientFormData.city} onChange={handleClientChange} />
              <label htmlFor="city">City</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="zipCode" name="zipCode" placeholder="Zip Code" value={clientFormData.zipCode} onChange={handleClientChange} />
              <label htmlFor="zipCode">Zip Code</label>
            </div>
          </div>

          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="primaryLanguage" name="primaryLanguage" placeholder="Primary Language" value={clientFormData.primaryLanguage} onChange={handleClientChange} />
              <label htmlFor="primaryLanguage">Primary Language</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <select className="form-select" id="proficiencyLevel" name="proficiencyLevel" value={clientFormData.proficiencyLevel} onChange={handleClientChange}>
                <option value="">Select proficiency</option>
                <option value="Beginner">Beginner</option>
                <option value="Proficient">Proficient</option>
                <option value="Fluent">Fluent</option>
              </select>
              <label htmlFor="proficiencyLevel">Level of Proficiency</label>
            </div>
          </div>
        </div>

        {/* ── CASE INFORMATION ── */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Case Information</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-3">
            <div className="form-floating">
              <select className="form-select" id="category" name="category" value={caseFormData.category} onChange={handleCaseChange}>
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
              <label htmlFor="category">Category</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <select className="form-select" id="attorneyType" name="attorneyType" value={caseFormData.attorneyType} onChange={handleCaseChange}>
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
              </select>
              <label htmlFor="attorneyType">Type of Attorney</label>
            </div>
          </div>
          <div className="col-6">
            <div className="form-floating">
              <input type="text" className="form-control" id="briefDescription" name="briefDescription" placeholder="Brief Description of Issues" value={caseFormData.briefDescription} onChange={handleCaseChange} />
              <label htmlFor="briefDescription">Brief Description of Issues</label>
            </div>
          </div>
          <div className="col-9">
            <div className="form-floating">
              <input type="text" className="form-control" id="remarks" name="remarks" placeholder="Remarks" value={caseFormData.remarks} onChange={handleCaseChange} />
              <label htmlFor="remarks">Remarks</label>
            </div>
          </div>
        </div>

        {/* ── SCHEDULING ── */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Scheduling</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          <div className="col-3">
            <div className="form-floating">
              <input type="date" className="form-control" id="date" name="date" placeholder="Date" value={schedulingFormData.date} onChange={handleSchedulingChange} />
              <label htmlFor="date">Date</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <select className="form-select" id="timeSlot" name="timeSlot" value={schedulingFormData.timeSlot} onChange={handleSchedulingChange}>
                <option value="">Select a time slot</option>
                <option value="5:30pm">5:30pm</option>
                <option value="6:10pm">6:10pm</option>
                <option value="6:50pm">6:50pm</option>
              </select>
              <label htmlFor="timeSlot">Time Slot</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <select className="form-select" id="meetingPlatform" name="meetingPlatform" value={schedulingFormData.meetingPlatform} onChange={handleSchedulingChange}>
                <option value="">Select a platform</option>
                <option value="Zoom">Zoom</option>
              </select>
              <label htmlFor="meetingPlatform">Meeting Platform</label>
            </div>
          </div>
          <div className="col-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="meetingLink" name="meetingLink" placeholder="Meeting Link" value={schedulingFormData.meetingLink} onChange={handleSchedulingChange} />
              <label htmlFor="meetingLink">Meeting Link</label>
            </div>
          </div>
        </div>

        {/* ── ATTORNEY NOTES ── */}
        <div className="row mb-3 g-4">
          <div className="d-flex align-items-center gap-3 my-4">
            <span className="text-muted small">Attorney Notes</span>
            <hr className="flex-grow-1 m-0" />
          </div>

          {/* Consent subsection */}
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="text-muted small">Consent (attorney check)</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <div className="row g-4">
              <div className="col-3">
                <div className="form-floating">
                  <select className="form-select" id="clientConsent" name="clientConsent" value={attorneyNotesFormData.clientConsent} onChange={handleAttorneyNotesChange}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <label htmlFor="clientConsent">Client Consent</label>
                </div>
              </div>
              <div className="col-3">
                <div className="form-floating">
                  <select className="form-select" id="referralPermission" name="referralPermission" value={attorneyNotesFormData.referralPermission} onChange={handleAttorneyNotesChange}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <label htmlFor="referralPermission">Referral Permission</label>
                </div>
              </div>
            </div>
          </div>

          {/* Future work subsection */}
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="text-muted small">Future work with client</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <label className="form-label fw-semibold small">Do you plan to follow up outside the clinic pro bono?</label>
            <div className="d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="followUpProBono" id="followUpYes" value="Yes" checked={attorneyNotesFormData.followUpProBono === "Yes"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="followUpYes">Yes</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="followUpProBono" id="followUpNo" value="No" checked={attorneyNotesFormData.followUpProBono === "No"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="followUpNo">No</label>
              </div>
            </div>
          </div>

          {/* Summary of visit subsection */}
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="text-muted small">Summary of visit</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <div className="d-flex flex-column gap-2 mb-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="visitSummaryStatus" id="noFurtherServices" value="This client requires no further services and should not return to clinic for this legal issue" checked={attorneyNotesFormData.visitSummaryStatus === "This client requires no further services and should not return to clinic for this legal issue"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="noFurtherServices">This client requires no further services and should not return to clinic for this legal issue</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="visitSummaryStatus" id="mayReturn" value="Client may return to clinic after completing the to-do list" checked={attorneyNotesFormData.visitSummaryStatus === "Client may return to clinic after completing the to-do list"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="mayReturn">Client may return to clinic after completing the to-do list</label>
              </div>
            </div>
            <div className="form-floating">
              <textarea className="form-control" id="visitSummary" name="visitSummary" placeholder="Please summarize client's legal issue and advice given" value={attorneyNotesFormData.visitSummary} onChange={handleAttorneyNotesChange} style={{ height: "120px" }} />
              <label htmlFor="visitSummary">Please summarize client's legal issue and advice given</label>
            </div>
          </div>

          {/* Reason for visit subsection */}
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-3">
              <span className="text-muted small">Reason for client's visit</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <div className="d-flex flex-column gap-2">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="reasonForVisit" id="reason1" value="Option 1" checked={attorneyNotesFormData.reasonForVisit === "Option 1"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="reason1">Option 1</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="reasonForVisit" id="reason2" value="Option 2" checked={attorneyNotesFormData.reasonForVisit === "Option 2"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="reason2">Option 2</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="reasonForVisit" id="reason3" value="Option 3" checked={attorneyNotesFormData.reasonForVisit === "Option 3"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="reason3">Option 3</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="reasonForVisit" id="reason4" value="Option 4" checked={attorneyNotesFormData.reasonForVisit === "Option 4"} onChange={handleAttorneyNotesChange} />
                <label className="form-check-label small" htmlFor="reason4">Option 4</label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ExistingClientHeader({ currentCase, handleMatchChange, matchFormData, handleSubmit }) {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <p className="mb-0 edit-form-title">{currentCase?.clientInfo.fname || "Client Name not Assigned"} {currentCase?.clientInfo.lname || ""}</p>
          <p className="mb-0 edit-form-subtitle">{currentCase?.caseInfo.category || "Category not Assigned"} | {currentCase?.clientInfo.primaryLanguage || "Language not Assigned"}</p>
        </div>
        <div className="d-flex flex-column align-items-end">
          <div className="mb-2">
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </div>
          <div className="d-flex gap-3">
            <div className="form-floating">
              <input type="text" className="form-control" id="attorney" name="attorney" placeholder="Attorney" value={matchFormData.attorney} onChange={handleMatchChange} />
              <label htmlFor="attorney">Attorney</label>
            </div>
            <div className="form-floating">
              <input type="text" className="form-control" id="legalStudent" name="legalStudent" placeholder="Legal Student" value={matchFormData.legalStudent} onChange={handleMatchChange} />
              <label htmlFor="legalStudent">Legal Student</label>
            </div>
            <div className="form-floating">
              <select className="form-select" id="interpreter" name="interpreter" value={matchFormData.interpreter} onChange={handleMatchChange}>
                <option value="">Select if needed</option>
                <option value="Legal Student">Legal Student</option>
                <option value="Attorney">Attorney</option>
                <option value="Other">Other</option>
                <option value="None">None</option>
              </select>
              <label htmlFor="interpreter">Interpreter</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewClientHeader({ handleSubmit }) {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>New Case</h1>
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save</button>
      </div>
    </div>
  );
}