import { mockAttorneys } from './mock_attorneys.js'; // pointing to mock file

export function calculateMatchScore(intakeCase, attorney) {
  const categoryWeight = 0.60;
  const languageWeight = 0.25;
  const availabilityWeight = 0.15;

  let categoryScore = 0;
  let languageScore = 0;
  let availabilityScore = 0;

  // 1. Legal Issue Category Match (60%)
  if (attorney.specialties?.includes(intakeCase.caseInfo?.category)) {
    categoryScore = 1.0;
  }

  // 2. Language Match (25%)
  const clientLanguage = intakeCase.clientInfo?.primaryLanguage;
  if (attorney.languagesSpoken?.includes(clientLanguage)) {
    languageScore = 1.0;
  } else if (clientLanguage === "English" && attorney.languagesSpoken?.includes("English")) {
    languageScore = 1.0;
  }

  // 3. Availability & Capacity Match (15%)
  if (attorney.availableDates?.includes(intakeCase.schedulingInfo?.date)) {
    if (attorney.currentAssignedCount < attorney.maxCapacity) {
      availabilityScore = 1.0;
    } else {
      availabilityScore = 0.5; // small penalty if they are fully booked to prevent burnout
    }
  }

  const totalScore = (categoryScore * categoryWeight) + (languageScore * languageWeight) + (availabilityScore * availabilityWeight);

  return {
    attorneyId: attorney.uid,
    name: attorney.name,
    email: attorney.email,
    phone: attorney.phone,
    totalScore: Math.round(totalScore * 100),
    breakdown: { categoryScore, languageScore, availabilityScore }
  };
}

export function generateRecommendations(intakeCase) {
  return mockAttorneys // read from sandbox file
    .map(attorney => calculateMatchScore(intakeCase, attorney))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3);
}