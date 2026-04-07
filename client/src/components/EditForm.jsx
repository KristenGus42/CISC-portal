import { NavBar } from "./NavBar";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { cases } from "../mock_data/cases";

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

        {/* ── CLIENT INFORMATION ── */}
        <div className="row mb-5 align-items-stretch">
          <div className="col-2 form-section-bar">
            <p className="fw-semibold small mb-0">Client Information</p>
          </div>
          <div className="col-10">
            <div className="row g-4">

              {/* Row 1 */}
              <div className="col-3">
                <label htmlFor="fname" className="form-label fw-semibold small">First Name</label>
                <input type="text" className="form-control" id="fname" name="fname" value={clientFormData.fname} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="lname" className="form-label fw-semibold small">Last Name</label>
                <input type="text" className="form-control" id="lname" name="lname" value={clientFormData.lname} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="addressLine1" className="form-label fw-semibold small">Address Line 1</label>
                <input type="text" className="form-control" id="addressLine1" name="addressLine1" value={clientFormData.addressLine1} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="city" className="form-label fw-semibold small">City</label>
                <input type="text" className="form-control" id="city" name="city" value={clientFormData.city} onChange={handleClientChange} />
              </div>

              {/* Row 2 */}
              <div className="col-2">
                <label htmlFor="age" className="form-label fw-semibold small">Age</label>
                <input type="text" className="form-control" id="age" name="age" value={clientFormData.age} onChange={handleClientChange} />
              </div>
              <div className="col-2">
                <label htmlFor="sex" className="form-label fw-semibold small">Sex</label>
                <input type="text" className="form-control" id="sex" name="sex" value={clientFormData.sex} onChange={handleClientChange} />
              </div>
              <div className="col-2">
                <label htmlFor="incomeLevel" className="form-label fw-semibold small">Income Level</label>
                <input type="text" className="form-control" id="incomeLevel" name="incomeLevel" value={clientFormData.incomeLevel} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="addressLine2" className="form-label fw-semibold small">Address Line 2</label>
                <input type="text" className="form-control" id="addressLine2" name="addressLine2" value={clientFormData.addressLine2} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="zipCode" className="form-label fw-semibold small">Zip Code</label>
                <input type="text" className="form-control" id="zipCode" name="zipCode" value={clientFormData.zipCode} onChange={handleClientChange} />
              </div>

              {/* Row 3 */}
              <div className="col-3">
                <label htmlFor="primaryLanguage" className="form-label fw-semibold small">Primary Language</label>
                <input type="text" className="form-control" id="primaryLanguage" name="primaryLanguage" value={clientFormData.primaryLanguage} onChange={handleClientChange} />
              </div>
              <div className="col-3">
                <label htmlFor="proficiencyLevel" className="form-label fw-semibold small">Level of Proficiency</label>
                <select className="form-select" id="proficiencyLevel" name="proficiencyLevel" value={clientFormData.proficiencyLevel} onChange={handleClientChange}>
                  <option value="">Select proficiency</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Proficient">Proficient</option>
                  <option value="Fluent">Fluent</option>
                </select>
              </div>

            </div>
          </div>
        </div>

        {/* ── CASE INFORMATION ── */}
        <div className="row mb-5 align-items-stretch">
          <div className="col-2 form-section-bar">
            <p className="fw-semibold small mb-0">Case Information</p>
          </div>
          <div className="col-10">
            <div className="row g-4">

              {/* Row 1 */}
              <div className="col-3">
                <label htmlFor="category" className="form-label fw-semibold small">Category</label>
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
              </div>
              <div className="col-3">
                <label htmlFor="attorneyType" className="form-label fw-semibold small">Type of Attorney</label>
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
              </div>

              {/* Row 2 */}
              <div className="col-6">
                <label htmlFor="briefDescription" className="form-label fw-semibold small">Brief Description of Issues</label>
                <input type="text" className="form-control" id="briefDescription" name="briefDescription" value={caseFormData.briefDescription} onChange={handleCaseChange} />
              </div>
              <div className="col-6">
                <label htmlFor="remarks" className="form-label fw-semibold small">Remarks</label>
                <input type="text" className="form-control" id="remarks" name="remarks" value={caseFormData.remarks} onChange={handleCaseChange} />
              </div>

            </div>
          </div>
        </div>

        {/* ── SCHEDULING ── */}
        <div className="row mb-5 align-items-stretch">
          <div className="col-2 form-section-bar">
            <p className="fw-semibold small mb-0">Scheduling</p>
          </div>
          <div className="col-10">
            <div className="row g-4">
              <div className="col-3">
                <label htmlFor="date" className="form-label fw-semibold small">Date</label>
                <input type="text" className="form-control" id="date" name="date" value={schedulingFormData.date} onChange={handleSchedulingChange} />
              </div>
              <div className="col-3">
                <label htmlFor="timeSlot" className="form-label fw-semibold small">Time Slot</label>
                <select className="form-select" id="timeSlot" name="timeSlot" value={schedulingFormData.timeSlot} onChange={handleSchedulingChange}>
                  <option value="">Select a time slot</option>
                  <option value="5:30pm">5:30pm</option>
                  <option value="6:10pm">6:10pm</option>
                  <option value="6:50pm">6:50pm</option>
                </select>
              </div>
              <div className="col-3">
                <label htmlFor="meetingPlatform" className="form-label fw-semibold small">Meeting Platform</label>
                <select className="form-select" id="meetingPlatform" name="meetingPlatform" value={schedulingFormData.meetingPlatform} onChange={handleSchedulingChange}>
                  <option value="">Select a platform</option>
                  <option value="Zoom">Zoom</option>
                </select>
              </div>
              <div className="col-3">
                <label htmlFor="meetingLink" className="form-label fw-semibold small">Meeting Link</label>
                <input type="text" className="form-control" id="meetingLink" name="meetingLink" value={schedulingFormData.meetingLink} onChange={handleSchedulingChange} />
              </div>
            </div>
          </div>
        </div>

        {/* ── ATTORNEY NOTES ── */}
        <div className="row mb-5 align-items-stretch">
          <div className="col-2 form-section-bar">
            <p className="fw-semibold small mb-0">Attorney Notes</p>
          </div>
          <div className="col-10">

            {/* Consent */}
            <div className="d-flex align-items-center gap-3 my-4">
              <span className="text-muted small">Consent (attorney check)</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <p className="small text-muted">Description</p>
            <div className="row g-4">
              <div className="col-3">
                <label htmlFor="clientConsent" className="form-label fw-semibold small">Client Consent</label>
                <select className="form-select" id="clientConsent" name="clientConsent" value={attorneyNotesFormData.clientConsent} onChange={handleAttorneyNotesChange}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="col-3">
                <label htmlFor="referralPermission" className="form-label fw-semibold small">Referral Permission</label>
                <select className="form-select" id="referralPermission" name="referralPermission" value={attorneyNotesFormData.referralPermission} onChange={handleAttorneyNotesChange}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* Future work with client */}
            <div className="d-flex align-items-center gap-3 my-4">
              <span className="text-muted small">Future work with client</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <p className="small text-muted">Description</p>
            <div className="row g-4">
              <div className="col-12">
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
            </div>

            {/* Summary of visit */}
            <div className="d-flex align-items-center gap-3 my-4">
              <span className="text-muted small">Summary of visit</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <p className="small text-muted">Description</p>
            <div className="row g-4">
              <div className="col-12">
                <div className="d-flex flex-column gap-2">
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="visitSummaryStatus" id="noFurtherServices" value="This client requires no further services and should not return to clinic for this legal issue" checked={attorneyNotesFormData.visitSummaryStatus === "This client requires no further services and should not return to clinic for this legal issue"} onChange={handleAttorneyNotesChange} />
                    <label className="form-check-label small" htmlFor="noFurtherServices">This client requires no further services and should not return to clinic for this legal issue</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="visitSummaryStatus" id="mayReturn" value="Client may return to clinic after completing the to-do list" checked={attorneyNotesFormData.visitSummaryStatus === "Client may return to clinic after completing the to-do list"} onChange={handleAttorneyNotesChange} />
                    <label className="form-check-label small" htmlFor="mayReturn">Client may return to clinic after completing the to-do list</label>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <label htmlFor="visitSummary" className="form-label fw-semibold small">Please summarize client's legal issue and advice given</label>
                <textarea className="form-control" id="visitSummary" name="visitSummary" value={attorneyNotesFormData.visitSummary} onChange={handleAttorneyNotesChange} rows={4} />
              </div>
            </div>

            {/* Reason for client's visit */}
            <div className="d-flex align-items-center gap-3 my-4">
              <span className="text-muted small">Reason for client's visit</span>
              <hr className="flex-grow-1 m-0" />
            </div>
            <div className="row g-4">
              <div className="col-12">
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
          <div>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save</button>
          </div>
          <div className="d-flex gap-3">
            <div>
              <label htmlFor="attorney" className="form-label fw-semibold small">Attorney</label>
              <input type="text" className="form-control" id="attorney" name="attorney" value={matchFormData.attorney} onChange={handleMatchChange} />
            </div>
            <div>
              <label htmlFor="legalStudent" className="form-label fw-semibold small">Legal Student</label>
              <input type="text" className="form-control" id="legalStudent" name="legalStudent" value={matchFormData.legalStudent} onChange={handleMatchChange} />
            </div>
            <div>
              <label htmlFor="interpreter" className="form-label fw-semibold small">Interpreter</label>
              <select className="form-select" id="interpreter" name="interpreter" value={matchFormData.interpreter} onChange={handleMatchChange}>
                <option value="">Select if needed</option>
                <option value="Legal Student">Legal Student</option>
                <option value="Attorney">Attorney</option>
                <option value="Other">Other</option>
                <option value="None">None</option>
              </select>
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