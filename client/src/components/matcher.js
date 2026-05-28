/**
 * Robust matching engine for pairing waitlisted cases with volunteer attorneys.
 * Supports both Firebase schema attributes and legacy mock attributes.
 */

export function calculateMatchScore(intakeCase, attorney) {
  const categoryWeight = 0.60;
  const languageWeight = 0.25;
  const availabilityWeight = 0.15;

  let categoryScore = 0;
  let languageScore = 0;
  let availabilityScore = 0;

  // 1. Legal Issue Category Match (60%)
  const caseCategory = intakeCase.caseInfo?.category;
  if (caseCategory) {
    let specialties = [];
    if (Array.isArray(attorney.specialties)) {
      specialties = attorney.specialties.map(s => s.trim().toLowerCase());
    } else if (typeof attorney.mainPracticeAreas === "string" && attorney.mainPracticeAreas) {
      specialties = attorney.mainPracticeAreas.split(",").map(s => s.trim().toLowerCase());
    } else if (typeof attorney.specialty === "string" && attorney.specialty) {
      specialties = attorney.specialty.split(",").map(s => s.trim().toLowerCase());
    }

    const catLower = caseCategory.trim().toLowerCase();
    // Normalize category: remove trailing words like "attorney" or "law"
    const cleanCat = catLower.replace(/\s+attorney$/, "").replace(/\s+law$/, "").trim();

    const matched = specialties.some(spec => {
      const cleanSpec = spec.replace(/\s+attorney$/, "").replace(/\s+law$/, "").trim();
      return cleanSpec === cleanCat || cleanSpec.includes(cleanCat) || cleanCat.includes(cleanSpec);
    });

    if (matched) {
      categoryScore = 1.0;
    }
  }

  // 2. Language Match (25%)
  const clientLanguage = intakeCase.clientInfo?.primaryLanguage;
  if (clientLanguage) {
    let spokenLanguages = [];
    if (Array.isArray(attorney.languagesSpoken)) {
      spokenLanguages = attorney.languagesSpoken.map(l => l.trim().toLowerCase());
    } else if (typeof attorney.languageSkills === "string" && attorney.languageSkills) {
      spokenLanguages = attorney.languageSkills.split(",").map(l => l.trim().toLowerCase());
    } else if (typeof attorney.language === "string" && attorney.language) {
      spokenLanguages = attorney.language.split(",").map(l => l.trim().toLowerCase());
    } else if (typeof attorney.primaryLanguage === "string" && attorney.primaryLanguage) {
      spokenLanguages = attorney.primaryLanguage.split(",").map(l => l.trim().toLowerCase());
    }

    const clientLangLower = clientLanguage.trim().toLowerCase();
    if (spokenLanguages.includes(clientLangLower)) {
      languageScore = 1.0;
    } else if (clientLangLower === "english" && spokenLanguages.includes("english")) {
      languageScore = 1.0;
    }
  }

  // 3. Availability & Capacity Match (15%)
  const caseDate = intakeCase.schedulingInfo?.date;
  let availableDates = [];
  if (Array.isArray(attorney.availableDates)) {
    availableDates = attorney.availableDates;
  } else if (typeof attorney.date === "string" && attorney.date) {
    availableDates = attorney.date.split(",").map(d => d.trim());
  }

  if (availableDates.length > 0) {
    if (caseDate && availableDates.includes(caseDate)) {
      const maxCapacity = attorney.maxCapacity ?? 5;
      const currentAssignedCount = attorney.currentAssignedCount ?? 0;
      if (currentAssignedCount < maxCapacity) {
        availabilityScore = 1.0;
      } else {
        availabilityScore = 0.5; // Capacity penalty
      }
    } else {
      availabilityScore = 0.0; // Not available on requested date
    }
  } else {
    // If no specific dates are set, default to available but respect capacity
    const maxCapacity = attorney.maxCapacity ?? 5;
    const currentAssignedCount = attorney.currentAssignedCount ?? 0;
    if (currentAssignedCount < maxCapacity) {
      availabilityScore = 1.0;
    } else {
      availabilityScore = 0.5;
    }
  }

  const totalScore = (categoryScore * categoryWeight) + (languageScore * languageWeight) + (availabilityScore * availabilityWeight);

  return {
    attorneyId: attorney.id || attorney.uid,
    name: attorney.name || "Unknown Attorney",
    email: attorney.email || "",
    phone: attorney.phoneNumber || attorney.phone || "",
    totalScore: Math.round(totalScore * 100),
    breakdown: { categoryScore, languageScore, availabilityScore }
  };
}

export function generateRecommendations(intakeCase, allAttorneys) {
  if (!allAttorneys || !Array.isArray(allAttorneys)) return [];
  return allAttorneys
    .map(attorney => calculateMatchScore(intakeCase, attorney))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3);
}
