// Typed integration boundaries. Production providers remain BLOCKED until credentials,
// licensing and operational approval are supplied. Never substitute synthetic data in production.
export type DependencyState = "READY" | "BLOCKED";

export interface UniversityRecord {
  institutionId: string;
  courseId: string;
  country: "Spain" | "Ireland" | "United Kingdom" | "Germany" | "Hungary" | "Netherlands";
  courseName: string;
  annualTuition?: { amount: number; currency: string; verifiedAt: string; sourceUrl: string };
}

export interface UniversityDataProvider {
  state: DependencyState;
  listApprovedCourses(): Promise<UniversityRecord[]>;
}

export interface FxRateProvider {
  state: DependencyState;
  getDatedRate(base: string, quote: string, at: string): Promise<number | null>;
}

export interface NotificationProvider {
  state: DependencyState;
  sendLeadReceived(reference: string, destination: string): Promise<void>;
}

export const blockedUniversityProvider: UniversityDataProvider = {
  state: "BLOCKED",
  async listApprovedCourses() {
    throw new Error("University inventory is BLOCKED: approved official sources are not connected.");
  },
};

export const blockedFxProvider: FxRateProvider = {
  state: "BLOCKED",
  async getDatedRate() {
    return null;
  },
};

export const blockedNotificationProvider: NotificationProvider = {
  state: "BLOCKED",
  async sendLeadReceived() {
    throw new Error("Notifications are BLOCKED: no transactional email provider is connected.");
  },
};
