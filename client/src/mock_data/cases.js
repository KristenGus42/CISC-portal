// Three different statuses: waitlisted/scheduled/completed 
export const cases = [
  {
    id: "0",
    status: "waitlisted",
    clientInfo: {
      fname: "Alex",
      lname: "Li",
      addressLine1: "123 Main St",
      addressLine2: "",
      city: "Seattle",
      zipCode: "98101",
      age: "34",
      sex: "Male",
      incomeLevel: "Low",
      primaryLanguage: "Cantonese",
      proficiencyLevel: "Fluent",
      email: "alex.li@email.com",
      phone: "206-555-0101",
      backupPhone: ""
    },
    caseInfo: {
      category: "Family",
      attorneyType: "Family Attorney",
      briefDescription: "Custody dispute involving three dependents.",
      remarks: ""
    },
    schedulingInfo: {
      date: "2025-04-15",
      timeSlot: "5:30pm",
      meetingPlatform: "Virtual",
      meetingLink: "https://zoom.us/j/example",
      attorneyName: "Option 1",
      attorneyEmail: "attorney1@email.com",
      attorneyPhone: "206-555-1001",
      legalStudentName: "Option 2",
      legalStudentEmail: "student2@email.com",
      legalStudentPhone: "206-555-2002",
      interpreterName: "Option 1",
      interpreterEmail: "interpreter1@email.com",
      interpreterPhone: "206-555-3001"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "No",
      visitSummaryStatus:
        "Client may return to clinic after completing the to-do list",
      visitSummary:
        "Client is seeking custody of three children following separation. Advised on filing process and documentation required.",
      reasonForVisit: "Family"
    },
    matchInfo: {
      attorney: "Attorney 1",
      legalStudent: "Legal Student 1",
      interpreter: "None"
    }
  },
  {
    id: "1",
    status: "waitlisted",
    clientInfo: {
      fname: "Jennifer",
      lname: "Lin",
      addressLine1: "456 Oak Ave",
      addressLine2: "Apt 3B",
      city: "Seattle",
      zipCode: "98102",
      age: "28",
      sex: "Female",
      incomeLevel: "Medium",
      primaryLanguage: "English",
      proficiencyLevel: "Fluent",
      email: "jennifer.lin@email.com",
      phone: "206-555-0182",
      backupPhone: ""
    },
    caseInfo: {
      category: "Housing",
      attorneyType: "Housing Attorney",
      briefDescription: "Wrongful eviction from rental property.",
      remarks: "Tenant has documentation of all payments."
    },
    schedulingInfo: {
      date: "2025-04-16",
      timeSlot: "6:10pm",
      meetingPlatform: "Virtual",
      meetingLink: "https://zoom.us/j/example",
      attorneyName: "Option 3",
      attorneyEmail: "attorney3@email.com",
      attorneyPhone: "206-555-1003",
      legalStudentName: "Option 1",
      legalStudentEmail: "student1@email.com",
      legalStudentPhone: "206-555-2001",
      interpreterName: "",
      interpreterEmail: "",
      interpreterPhone: ""
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "No",
      followUpProBono: "Yes",
      visitSummaryStatus:
        "This client requires no further services and should not return to clinic for this legal issue",
      visitSummary:
        "Client was wrongfully evicted without proper notice. Advised on tenant rights and next steps.",
      reasonForVisit: "Housing"
    },
    matchInfo: {
      attorney: "Attorney 1",
      legalStudent: "Legal Student 1",
      interpreter: "None"
    }
  },
  {
    id: "2",
    status: "completed",
    clientInfo: {
      fname: "Aaron",
      lname: "Liu",
      addressLine1: "789 Pine Rd",
      addressLine2: "",
      city: "Bellevue",
      zipCode: "98004",
      age: "45",
      sex: "Male",
      incomeLevel: "Low",
      primaryLanguage: "Cantonese",
      proficiencyLevel: "Proficient",
      email: "aaron.liu@email.com",
      phone: "206-555-0374",
      backupPhone: ""
    },
    caseInfo: {
      category: "Individual Rights",
      attorneyType: "Civil Rights Attorney",
      briefDescription: "Workplace discrimination complaint filed.",
      remarks: "Has witness statements from two coworkers."
    },
    schedulingInfo: {
      date: "2025-04-17",
      timeSlot: "6:50pm",
      meetingPlatform: "Virtual",
      meetingLink: "https://zoom.us/j/example",
      attorneyName: "Option 2",
      attorneyEmail: "attorney2@email.com",
      attorneyPhone: "206-555-1002",
      legalStudentName: "Option 3",
      legalStudentEmail: "student3@email.com",
      legalStudentPhone: "206-555-2003",
      interpreterName: "Option 2",
      interpreterEmail: "interpreter2@email.com",
      interpreterPhone: "206-555-3002"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "No",
      visitSummaryStatus:
        "Client may return to clinic after completing the to-do list",
      visitSummary:
        "Client experienced racial discrimination at workplace. Advised on EEOC process.",
      reasonForVisit: "Individual Rights"
    },
    matchInfo: {
      attorney: "Attorney 1",
      legalStudent: "Legal Student 1",
      interpreter: "Attorney"
    }
  }
];