export const cases = [
  {
    id: "0",
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
      meetingLink: "https://zoom.us/j/example"
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
      meetingLink: "https://zoom.us/j/example"
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
      meetingLink: "https://zoom.us/j/example"
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