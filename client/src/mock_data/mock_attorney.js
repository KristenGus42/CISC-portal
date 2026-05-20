// mock_attorneys.js
export const mockAttorneys = [
    {
      uid: "attorney_opt_1",
      name: "Option 1 (Family & Civil Rights Expert)",
      email: "attorney1@email.com",
      phone: "206-555-1001",
      specialties: ["Family", "Individual Rights"],
      languagesSpoken: ["Cantonese", "English"],
      availableDates: ["2025-04-15", "2025-04-17"],
      maxCapacity: 5,
      currentAssignedCount: 2
    },
    {
      uid: "attorney_opt_2",
      name: "Option 2 (Bilingual Civil Rights Expert)",
      email: "attorney2@email.com",
      phone: "206-555-1002",
      specialties: ["Individual Rights", "Miscellaneous"],
      languagesSpoken: ["Cantonese", "Mandarin", "English"],
      availableDates: ["2025-04-17"],
      maxCapacity: 3,
      currentAssignedCount: 1
    },
    {
      uid: "attorney_opt_3",
      name: "Option 3 (Housing Specialist)",
      email: "attorney3@email.com",
      phone: "206-555-1003",
      specialties: ["Housing"],
      languagesSpoken: ["English"],
      availableDates: ["2025-04-16"],
      maxCapacity: 4,
      currentAssignedCount: 0
    },
    {
      uid: "attorney_opt_4",
      name: "Option 4 (Family Specialist - At Max Capacity)",
      email: "attorney4@email.com",
      phone: "206-555-1004",
      specialties: ["Family"],
      languagesSpoken: ["Cantonese", "English"],
      availableDates: ["2025-04-15"],
      maxCapacity: 2,
      currentAssignedCount: 2 //  will trigger the capacity filter logic
    }
  ];