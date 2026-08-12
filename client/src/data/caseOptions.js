// Canonical option lists shared by the edit form's pickers and the Case
// Library filter, so the two can't drift apart as options are added.
//
// These strings are what Firebase stores on the case, and what the filter
// matches against — renaming an entry orphans every case already saved under
// the old wording, so add rather than rename.

export const CASE_CATEGORIES = [
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
];

export const LANGUAGE_OPTIONS = [
  "English",
  "Mandarin",
  "Cantonese",
  "Taishanese",
  "Hokkien",
  "Teochew",
  "Shanghainese",
  "Fuzhounese",
  "Vietnamese",
  "Korean",
  "Japanese",
  "Tagalog",
  "Thai",
  "Khmer",
  "Russian",
  "Ukrainian",
  "Spanish",
];

// Anything outside the list above is saved under this single value, with the
// actual language written into the case's remarks.
export const OTHER_LANGUAGE = "Other";
