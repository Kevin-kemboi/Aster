import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_DESTINATIONS, requiresScholarship, isFinanciallyReady,
  budgetFit, matchCandidates, matchVerifiedCandidates, transitionLeadStatus
} from "../src/core.mjs";
import { DEMO_COURSES } from "../src/demo-data.mjs";

test("only the six supported destinations are active", () => {
  assert.deepEqual(SUPPORTED_DESTINATIONS, ["Spain","Ireland","United Kingdom","Germany","Hungary","Netherlands"]);
  assert.equal(DEMO_COURSES.some(x => x.country === "Canada"), false);
});

test("scholarship seekers are never financially ready", () => {
  assert.equal(requiresScholarship("partial_scholarship"), true);
  assert.equal(requiresScholarship("full_scholarship"), true);
  assert.equal(isFinanciallyReady("partial_scholarship", true), false);
  assert.equal(isFinanciallyReady("full_scholarship", true), false);
  assert.equal(isFinanciallyReady("self", true), true);
});

test("budget comparison is unavailable without a verified FX rate", () => {
  assert.equal(budgetFit(10000,"EUR",1500000,"KES").status, "unavailable");
  assert.equal(budgetFit(10000,"EUR",12000,"EUR").status, "within");
  assert.equal(budgetFit(10000,"EUR",9000,"EUR").status, "above");
});

test("matcher filters by study level, subject and selected supported destination", () => {
  const profile = { level:"bachelors", subject:"Computer Science & IT", destinations:["Germany"], budgetAmount:1500000, budgetCurrency:"KES", intakeType:"next" };
  const results = matchCandidates(profile, DEMO_COURSES);
  assert.equal(results.length, 1);
  assert.equal(results[0].country, "Germany");
  assert.equal(results[0].institution.startsWith("DEMO"), true);
});

test("missing English evidence is not used as a hard exclusion", () => {
  const profile = { level:"masters", subject:"Computer Science & IT", destinations:["Ireland"], budgetAmount:10000, budgetCurrency:"EUR", intakeType:"next" };
  const results = matchCandidates(profile, DEMO_COURSES);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "D-IE-002");
});

test("verified matcher excludes synthetic, expired and unapproved records", () => {
  const profile = { level:"masters", subject:"Computer Science & IT", destinations:["Ireland"], budgetAmount:15000, budgetCurrency:"EUR", intakeType:"next" };
  const fixture = {
    ...DEMO_COURSES.find(x => x.country === "Ireland"),
    id:"verified-irish-record", demo:false, catalogueStatus:"verified", reviewStatus:"approved",
    officialRecognitionStatus:"verified", validUntil:"2027-06-30T00:00:00Z",
    tuitionPeriod:"annual", feeType:"international", tuitionVerified:true
  };
  const stale = { ...fixture, id:"stale-record", validUntil:"2020-01-01T00:00:00Z" };
  const unapproved = { ...fixture, id:"unapproved-record", reviewStatus:"pending" };
  const results = matchVerifiedCandidates(profile,[fixture,stale,unapproved],new Date("2026-11-11T00:00:00Z"));
  assert.deepEqual(results.map(x=>x.id),["verified-irish-record"]);
  assert.equal(results[0].match.budgetFit.status,"within");
});

test("status transitions require close and reopen reasons", () => {
  assert.equal(transitionLeadStatus("New","Contacted").ok, true);
  assert.equal(transitionLeadStatus("New","Closed").ok, false);
  assert.equal(transitionLeadStatus("New","Closed","Duplicate request").ok, true);
  assert.equal(transitionLeadStatus("Closed","New").ok, false);
  assert.equal(transitionLeadStatus("Closed","New","Student re-engaged").ok, true);
});
