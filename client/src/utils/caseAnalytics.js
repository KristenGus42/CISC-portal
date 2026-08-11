// Builds the Case Library analytics export: one row per case, one column per
// stat. ExcelJS is ~1MB, so it is imported dynamically inside the export
// function — nothing loads until someone actually clicks Analytics.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Mirrors CaseLibrary's displayStatus: a clinic date in the past reads as
// "archived" no matter what status is stored, since nothing writes that status.
function displayStatus(caseData, todayYMD) {
    const date = caseData.schedulingInfo?.date;
    if (date && date < todayYMD) return "archived";
    return caseData.status || "";
}

// dateAdded is written as new Date().toLocaleString(), which parses back
// reliably enough for a day count but not for anything finer.
function parseDateAdded(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function midnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Days from intake to the clinic appointment. Cases with no date yet are still
// waiting, so they count against today instead — that's the number that tells
// you how long a waitlisted client has been sitting there.
function daysWaiting(caseData, now) {
    const added = parseDateAdded(caseData.dateAdded);
    if (!added) return "";
    const clinicDate = caseData.schedulingInfo?.date;
    const end = clinicDate ? new Date(`${clinicDate}T00:00:00`) : now;
    if (Number.isNaN(end.getTime())) return "";
    return Math.max(0, Math.round((midnight(end) - midnight(added)) / MS_PER_DAY));
}

function listToText(value) {
    if (Array.isArray(value)) return value.join(", ");
    return value || "";
}

function countArray(value) {
    return Array.isArray(value) ? value.length : 0;
}

// documents is a Firebase push-keyed object per section, not an array.
function documentCount(documents, section) {
    const bucket = documents?.[section];
    if (!bucket) return 0;
    return Array.isArray(bucket) ? bucket.length : Object.keys(bucket).length;
}

function yesNo(condition) {
    return condition ? "Yes" : "No";
}

// The same fields EditForm blocks a save on. "Complete" here means the attorney
// has finished their write-up, which is the number staff actually chase.
const REQUIRED_ATTORNEY_NOTES_FIELDS = [
    "clientConsent", "referralPermission", "followUpProBono", "visitSummary", "reasonForVisit",
];

function attorneyNotesComplete(notes) {
    if (!notes) return false;
    return REQUIRED_ATTORNEY_NOTES_FIELDS.every((field) => {
        const value = notes[field];
        return Array.isArray(value) ? value.length > 0 : Boolean(value && String(value).trim());
    });
}

// Column order is the story the sheet tells: identity, then lifecycle timing,
// then case type, then client demographics, then staffing, then outcomes.
const COLUMNS = [
    { header: "Case ID", width: 22, value: (c) => c.id || "" },
    { header: "First Name", width: 14, value: (c) => c.clientInfo?.fname || "" },
    { header: "Last Name", width: 14, value: (c) => c.clientInfo?.lname || "" },
    { header: "Status", width: 12, value: (c, ctx) => displayStatus(c, ctx.todayYMD) },

    { header: "Date Added", width: 20, value: (c) => c.dateAdded || "" },
    { header: "Clinic Date", width: 13, value: (c) => c.schedulingInfo?.date || "" },
    { header: "Time Slot", width: 11, value: (c) => c.schedulingInfo?.timeSlot || "" },
    { header: "Days Waiting", width: 13, value: (c, ctx) => daysWaiting(c, ctx.now) },
    { header: "Scheduled", width: 11, value: (c) => yesNo(c.schedulingInfo?.date) },

    { header: "Category", width: 16, value: (c) => c.caseInfo?.category || "" },
    { header: "Attorney Type", width: 20, value: (c) => c.caseInfo?.attorneyType || "" },
    { header: "Reason For Visit", width: 18, value: (c) => c.attorneyNotes?.reasonForVisit || "" },
    { header: "Brief Description", width: 44, value: (c) => c.caseInfo?.briefDescription || "" },
    { header: "Remarks", width: 30, value: (c) => c.caseInfo?.remarks || "" },

    { header: "Age", width: 7, value: (c) => c.clientInfo?.age || "" },
    { header: "Sex", width: 9, value: (c) => c.clientInfo?.sex || "" },
    { header: "Income Level", width: 13, value: (c) => c.clientInfo?.incomeLevel || "" },
    { header: "City", width: 14, value: (c) => c.clientInfo?.city || "" },
    { header: "Zip Code", width: 10, value: (c) => c.clientInfo?.zipCode || "" },
    { header: "Primary Language", width: 17, value: (c) => c.clientInfo?.primaryLanguage || "" },
    { header: "Proficiency Level", width: 16, value: (c) => c.clientInfo?.proficiencyLevel || "" },
    { header: "Additional Languages", width: 22, value: (c) => listToText(c.clientInfo?.additionalLanguages) },
    { header: "Email", width: 26, value: (c) => c.clientInfo?.email || "" },
    { header: "Phone", width: 15, value: (c) => c.clientInfo?.phone || "" },

    { header: "Meeting Platform", width: 16, value: (c) => c.schedulingInfo?.meetingPlatform || "" },
    { header: "Attorney", width: 20, value: (c) => c.schedulingInfo?.attorneyName || "" },
    { header: "Legal Student", width: 20, value: (c) => c.schedulingInfo?.legalStudentName || "" },
    { header: "Interpreter", width: 20, value: (c) => c.schedulingInfo?.interpreterName || "" },
    { header: "Interpreter Assigned", width: 19, value: (c) => yesNo(c.schedulingInfo?.interpreterName) },
    // Every role the clinic staffs is filled, so the appointment can run as-is.
    {
        header: "Fully Staffed", width: 13,
        value: (c) => yesNo(c.schedulingInfo?.attorneyName && c.schedulingInfo?.legalStudentName),
    },

    { header: "Client Consent", width: 14, value: (c) => c.attorneyNotes?.clientConsent || "" },
    { header: "Referral Permission", width: 18, value: (c) => c.attorneyNotes?.referralPermission || "" },
    { header: "Follow-Up Pro Bono", width: 18, value: (c) => c.attorneyNotes?.followUpProBono || "" },
    { header: "Follow-Up Service Types", width: 26, value: (c) => listToText(c.attorneyNotes?.followUpServiceTypes) },
    { header: "Visit Summary Status", width: 30, value: (c) => c.attorneyNotes?.visitSummaryStatus || "" },
    { header: "KCBA Referral Services", width: 26, value: (c) => listToText(c.attorneyNotes?.kcbaReferralServices) },
    { header: "KCBA Referral Count", width: 19, value: (c) => countArray(c.attorneyNotes?.kcbaReferralServices) },
    { header: "Attorney Notes Complete", width: 22, value: (c) => yesNo(attorneyNotesComplete(c.attorneyNotes)) },
    { header: "Visit Summary", width: 50, value: (c) => c.attorneyNotes?.visitSummary || "" },

    { header: "Client Documents", width: 17, value: (c) => documentCount(c.documents, "client") },
    { header: "Attorney Documents", width: 19, value: (c) => documentCount(c.documents, "attorney") },
    {
        header: "Total Documents", width: 16,
        value: (c) => documentCount(c.documents, "client") + documentCount(c.documents, "attorney"),
    },
];

/**
 * Build one analytics row per case, in the sheet's column order.
 * Exported separately from the workbook so the field logic stays testable.
 */
export function buildCaseAnalyticsRows(cases, now = new Date()) {
    const ctx = { now, todayYMD: toYMD(now) };
    return cases.map((caseData) => COLUMNS.map((column) => column.value(caseData, ctx)));
}

export function caseAnalyticsHeaders() {
    return COLUMNS.map((column) => column.header);
}

/**
 * Generate the analytics workbook for the given cases and trigger a download.
 * Returns the file name that was downloaded.
 */
export async function downloadCaseAnalytics(cases, now = new Date()) {
    const ExcelJS = (await import("exceljs")).default;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CISC Portal";
    workbook.created = now;

    const sheet = workbook.addWorksheet("Cases", {
        views: [{ state: "frozen", ySplit: 1 }], // keep headers visible while scrolling
    });

    sheet.columns = COLUMNS.map((column) => ({ header: column.header, width: column.width }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
    headerRow.alignment = { vertical: "middle" };
    headerRow.height = 20;

    buildCaseAnalyticsRows(cases, now).forEach((row) => sheet.addRow(row));

    // Excel's own filter/sort UI beats reimplementing it in the portal.
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: COLUMNS.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `cisc-case-analytics-${toYMD(now)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return fileName;
}
