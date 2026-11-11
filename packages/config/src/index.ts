export const supportedDestinations = [
  "Spain", "Ireland", "United Kingdom", "Germany", "Hungary", "Netherlands",
] as const;

export const matchWeights = {
  subject: 25,
  academic: 30,
  budget: 25,
  destination: 10,
  intake: 10,
} as const;

export const currencies = ["KES", "UGX", "TZS", "RWF", "USD", "EUR", "GBP"] as const;

export const featureFlags = {
  scholarshipBrowsing: true,
  unsupportedCountryReview: false,
  applications: false,
  translations: false,
  liveDataSources: false,
} as const;
