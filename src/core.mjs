export const SUPPORTED_DESTINATIONS = [
  "Spain", "Ireland", "United Kingdom", "Germany", "Hungary", "Netherlands"
];

export const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "USD", "EUR", "GBP", "HUF"];

export const FUNDING_OPTIONS = [
  { value: "self", label: "I will fund my studies" },
  { value: "family", label: "My family will fund my studies" },
  { value: "employer", label: "My employer will sponsor me" },
  { value: "government", label: "Government sponsorship" },
  { value: "partial_scholarship", label: "I need a partial scholarship" },
  { value: "full_scholarship", label: "I need a fully funded scholarship" }
];

export const LEAD_STATUSES = [
  "New", "Contacted", "Qualified", "Not financially ready",
  "Scholarship seeker", "Application started", "Converted", "Closed"
];

export const STATUS_TRANSITIONS = {
  "New": ["Contacted", "Qualified", "Not financially ready", "Scholarship seeker", "Closed"],
  "Contacted": ["Qualified", "Not financially ready", "Scholarship seeker", "Application started", "Closed"],
  "Qualified": ["Application started", "Converted", "Closed"],
  "Not financially ready": ["New", "Contacted", "Closed"],
  "Scholarship seeker": ["New", "Contacted", "Closed"],
  "Application started": ["Qualified", "Converted", "Closed"],
  "Converted": ["Closed"],
  "Closed": ["New"]
};

export function requiresScholarship(funding) {
  return funding === "partial_scholarship" || funding === "full_scholarship";
}

export function isFinanciallyReady(funding, budgetAccepted) {
  return ["self", "family", "employer", "government"].includes(funding) && budgetAccepted === true;
}

export function budgetFit(tuitionAmount, tuitionCurrency, budgetAmount, budgetCurrency, fxRates = {}) {
  if (!Number.isFinite(Number(tuitionAmount)) || !Number.isFinite(Number(budgetAmount))) {
    return { status: "unavailable", difference: null, comparableAmount: null };
  }
  if (tuitionCurrency === budgetCurrency) {
    const difference = Number(budgetAmount) - Number(tuitionAmount);
    return { status: difference >= 0 ? "within" : "above", difference, comparableAmount: Number(tuitionAmount) };
  }
  const rate = fxRates[`${tuitionCurrency}_${budgetCurrency}`];
  if (!Number.isFinite(rate) || rate <= 0) {
    return { status: "unavailable", difference: null, comparableAmount: null };
  }
  const comparableAmount = Number(tuitionAmount) * rate;
  const difference = Number(budgetAmount) - comparableAmount;
  return { status: difference >= 0 ? "within" : "above", difference, comparableAmount };
}

export function scoreCandidate(student, candidate, fxRates = {}) {
  const components = {};
  components.subject = student.subject === "Undecided" || candidate.subject === student.subject ? 25 : 0;
  components.academic = candidate.level === student.level ? 30 : 0;
  const fit = budgetFit(candidate.tuitionAmount, candidate.tuitionCurrency, student.budgetAmount, student.budgetCurrency, fxRates);
  components.budget = fit.status === "within" ? 25 : fit.status === "above" ? 0 : null;
  components.destination = (student.destinations || []).includes(candidate.country) ? 10 : 0;
  components.intake = candidate.intakeOpen && (student.intakeType === "flexible" || student.intakeType === "next" || candidate.intake === student.intake) ? 10 : 0;
  const availableWeight = Object.entries(components).reduce((sum, [key, value]) => sum + (value === null ? 0 : ({subject:25, academic:30, budget:25, destination:10, intake:10}[key])), 0);
  const points = Object.values(components).reduce((sum, value) => sum + (value ?? 0), 0);
  const score = availableWeight ? Math.round((points / availableWeight) * 100) : 0;
  return { score, points, availableWeight, components, budgetFit: fit };
}

export function matchCandidates(student, inventory) {
  const candidates = inventory.filter(item =>
    item.demo === true &&
    SUPPORTED_DESTINATIONS.includes(item.country) &&
    item.status === "active" &&
    item.level === student.level &&
    (student.subject === "Undecided" || item.subject === student.subject) &&
    (student.destinations || []).includes(item.country) &&
    item.intakeOpen === true
  ).map(item => ({ ...item, match: scoreCandidate(student, item) }));

  return candidates.sort((a, b) =>
    b.match.score - a.match.score ||
    (b.match.components.academic ?? -1) - (a.match.components.academic ?? -1) ||
    (b.match.components.budget ?? -1) - (a.match.components.budget ?? -1) ||
    String(a.id).localeCompare(String(b.id))
  );
}

// Live catalogue path. Unlike the demo matcher, this accepts only records that
// have passed the server's evidence, review and freshness checks.
export function matchVerifiedCandidates(student, inventory, now = new Date()) {
  const candidates = inventory.filter(item =>
    item.catalogueStatus === "verified" &&
    item.reviewStatus === "approved" &&
    item.officialRecognitionStatus === "verified" &&
    item.status === "active" &&
    item.intakeOpen === true &&
    Number.isFinite(Date.parse(item.validUntil)) && Date.parse(item.validUntil) > now.getTime() &&
    SUPPORTED_DESTINATIONS.includes(item.country) &&
    item.level === student.level &&
    (student.subject === "Undecided" || item.subject === student.subject) &&
    (student.destinations || []).includes(item.country)
  ).map(item => {
    const match = scoreCandidate(student, item);
    if (item.tuitionPeriod !== "annual" || item.feeType !== "international" || item.tuitionVerified !== true) {
      match.components.budget = null;
      const weights = { subject:25, academic:30, budget:25, destination:10, intake:10 };
      match.availableWeight = Object.entries(match.components).reduce((sum, [key, value]) => sum + (value === null ? 0 : weights[key]), 0);
      match.points = Object.values(match.components).reduce((sum, value) => sum + (value ?? 0), 0);
      match.score = match.availableWeight ? Math.round((match.points / match.availableWeight) * 100) : 0;
    }
    return { ...item, match };
  });

  return candidates.sort((a, b) =>
    b.match.score - a.match.score ||
    (b.match.components.budget ?? -1) - (a.match.components.budget ?? -1) ||
    String(a.id).localeCompare(String(b.id))
  );
}

export function transitionLeadStatus(current, next, reason = "") {
  if (!LEAD_STATUSES.includes(next)) return { ok: false, error: "Unknown status." };
  if (!(STATUS_TRANSITIONS[current] || []).includes(next)) return { ok: false, error: `Transition from ${current} to ${next} is not allowed.` };
  if (next === "Closed" && !reason.trim()) return { ok: false, error: "A close reason is required." };
  if (current === "Closed" && next === "New" && !reason.trim()) return { ok: false, error: "A reopening reason is required." };
  return { ok: true };
}

export function makeReference(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(2, 12);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AP-${stamp}-${suffix}`;
}
