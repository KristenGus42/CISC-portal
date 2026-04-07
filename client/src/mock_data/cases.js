export var cases = [
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
      phone: "206-555-0101"
    },
    caseInfo: {
      category: "Family",
      attorneyType: "Family Attorney",
      briefDescription: "Custody dispute involving three dependents.",
      remarks: ""
    },
    schedulingInfo: {
      date: "04/15/2025",
      timeSlot: "5:30pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "No",
      visitSummaryStatus: "Client may return to clinic after completing the to-do list",
      visitSummary: "Client is seeking custody of three children following separation. Advised on filing process and documentation required.",
      reasonForVisit: "Option 1"
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
      phone: "206-555-0182"
    },
    caseInfo: {
      category: "Housing",
      attorneyType: "Housing Attorney",
      briefDescription: "Wrongful eviction from rental property.",
      remarks: "Tenant has documentation of all payments."
    },
    schedulingInfo: {
      date: "04/16/2025",
      timeSlot: "6:10pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "No",
      followUpProBono: "Yes",
      visitSummaryStatus: "This client requires no further services and should not return to clinic for this legal issue",
      visitSummary: "Client was wrongfully evicted without proper notice. Advised on tenant rights and next steps for filing a complaint.",
      reasonForVisit: "Option 2"
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
      phone: "206-555-0374"
    },
    caseInfo: {
      category: "Individual Rights",
      attorneyType: "Civil Rights Attorney",
      briefDescription: "Workplace discrimination complaint filed.",
      remarks: "Has witness statements from two coworkers."
    },
    schedulingInfo: {
      date: "04/17/2025",
      timeSlot: "6:50pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "No",
      visitSummaryStatus: "Client may return to clinic after completing the to-do list",
      visitSummary: "Client experienced racial discrimination at workplace. Advised on EEOC complaint process and documentation.",
      reasonForVisit: "Option 3"
    },
    matchInfo: {
      attorney: "Attorney 1",
      legalStudent: "Legal Student 1",
      interpreter: "Attorney"
    }
  },
  {
    id: "3",
    clientInfo: {
      fname: "Maria",
      lname: "Santos",
      addressLine1: "321 Elm St",
      addressLine2: "",
      city: "Seattle",
      zipCode: "98103",
      age: "38",
      sex: "Female",
      incomeLevel: "Low",
      primaryLanguage: "Spanish",
      proficiencyLevel: "Proficient",
      email: "maria.santos@email.com",
      phone: "206-555-0293"
    },
    caseInfo: {
      category: "Immigration",
      attorneyType: "General Practice Attorney",
      briefDescription: "Asylum application support for family of four.",
      remarks: "Family has been in the US for 2 years."
    },
    schedulingInfo: {
      date: "04/18/2025",
      timeSlot: "5:30pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "Yes",
      visitSummaryStatus: "Client may return to clinic after completing the to-do list",
      visitSummary: "Client is seeking asylum for herself and three children. Reviewed application and supporting documents. Several items still needed.",
      reasonForVisit: "Option 1"
    },
    matchInfo: {
      attorney: "Attorney 2",
      legalStudent: "Legal Student 2",
      interpreter: "Legal Student"
    }
  },
  {
    id: "4",
    clientInfo: {
      fname: "David",
      lname: "Park",
      addressLine1: "654 Maple Dr",
      addressLine2: "Unit 2",
      city: "Renton",
      zipCode: "98057",
      age: "52",
      sex: "Male",
      incomeLevel: "Medium",
      primaryLanguage: "Korean",
      proficiencyLevel: "Beginner",
      email: "david.park@email.com",
      phone: "206-555-0417"
    },
    caseInfo: {
      category: "Consumer / Finance",
      attorneyType: "Consumer / Finance Attorney",
      briefDescription: "Predatory lending dispute with local creditor.",
      remarks: "Has loan documents and correspondence."
    },
    schedulingInfo: {
      date: "04/19/2025",
      timeSlot: "6:10pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "No",
      followUpProBono: "No",
      visitSummaryStatus: "This client requires no further services and should not return to clinic for this legal issue",
      visitSummary: "Client signed a loan with predatory terms. Advised on consumer protection laws and options for disputing the loan.",
      reasonForVisit: "Option 2"
    },
    matchInfo: {
      attorney: "Attorney 2",
      legalStudent: "Legal Student 3",
      interpreter: "Attorney"
    }
  },
  {
    id: "5",
    clientInfo: {
      fname: "Priya",
      lname: "Nair",
      addressLine1: "987 Cedar Ln",
      addressLine2: "",
      city: "Kirkland",
      zipCode: "98033",
      age: "31",
      sex: "Female",
      incomeLevel: "Low",
      primaryLanguage: "Tamil",
      proficiencyLevel: "Proficient",
      email: "priya.nair@email.com",
      phone: "206-555-0538"
    },
    caseInfo: {
      category: "Employment",
      attorneyType: "Employment Attorney",
      briefDescription: "Unpaid wages claim against former employer.",
      remarks: "Has pay stubs and termination letter."
    },
    schedulingInfo: {
      date: "04/20/2025",
      timeSlot: "6:50pm",
      meetingPlatform: "Zoom",
      meetingLink: "https://zoom.us/j/example"
    },
    attorneyNotes: {
      clientConsent: "Yes",
      referralPermission: "Yes",
      followUpProBono: "No",
      visitSummaryStatus: "Client may return to clinic after completing the to-do list",
      visitSummary: "Client was not paid final two weeks of wages upon termination. Advised on filing a wage claim with L&I.",
      reasonForVisit: "Option 4"
    },
    matchInfo: {
      attorney: "Attorney 3",
      legalStudent: "Legal Student 2",
      interpreter: "None"
    }
  }
];