export type SupportedDestination =
  | "Spain" | "Ireland" | "United Kingdom" | "Germany" | "Hungary" | "Netherlands";

export type FundingRoute =
  | "self" | "family" | "employer" | "government"
  | "partial_scholarship" | "full_scholarship";

export type StudyLevel = "foundation" | "bachelors" | "masters" | "phd";

export type LeadStatus =
  | "New" | "Contacted" | "Qualified" | "Not financially ready"
  | "Scholarship seeker" | "Application started" | "Converted" | "Closed";

export interface MatchProfile {
  funding: FundingRoute;
  level: StudyLevel;
  subject: string;
  destinations: SupportedDestination[];
  intakeType: "next" | "flexible" | "exact";
  intake?: string;
  budgetAmount: number;
  budgetCurrency: "KES" | "UGX" | "TZS" | "RWF" | "USD" | "EUR" | "GBP";
  passport: "valid" | "in_progress" | "none";
}

export interface EvidenceReference {
  sourceId: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface MatchComponentScores {
  subject: number;
  academic: number;
  budget: number | null;
  destination: number;
  intake: number;
}

export interface LeadRequest {
  idempotencyKey: string;
  profile: MatchProfile;
  serviceContactConsent: { accepted: true; noticeVersion: string; channel: string; capturedAt: string };
  marketingConsent: { accepted: boolean; capturedAt?: string };
}
