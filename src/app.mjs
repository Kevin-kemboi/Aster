import {
  SUPPORTED_DESTINATIONS, CURRENCIES, FUNDING_OPTIONS, LEAD_STATUSES,
  requiresScholarship, isFinanciallyReady, matchCandidates, scoreCandidate, transitionLeadStatus, makeReference
} from "./core.mjs";
import { DEMO_COURSES, DEMO_LEADS, DESTINATION_META } from "./demo-data.mjs";
import { CATALOGUE_SOURCES } from "./catalogue-sources.mjs";

const app = document.getElementById("app");
const STORE = {
  leads: "asterpath_demo_leads_v1",
  saved: "asterpath_saved_options_v1",
  draft: "asterpath_student_draft_v1",
  events: "asterpath_events_v1",
  recommendation: "asterpath_recommendation_v1"
};
const clone = value => JSON.parse(JSON.stringify(value));
const load = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : clone(fallback); }
  catch { return clone(fallback); }
};
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const money = (amount, currency) => {
  try { return new Intl.NumberFormat("en", { style:"currency", currency, maximumFractionDigits:0 }).format(Number(amount)); }
  catch { return `${currency} ${Number(amount).toLocaleString()}`; }
};
const labelFunding = value => FUNDING_OPTIONS.find(x => x.value === value)?.label || "Not provided";
const labelLevel = value => ({ foundation:"Foundation / pathway", bachelors:"Bachelor’s", masters:"Master’s", phd:"PhD" }[value] || value || "Not provided");
const labelStatusClass = status => status === "New" ? "new" : status === "Qualified" || status === "Converted" ? "qualified" : status === "Scholarship seeker" ? "scholarship" : status === "Not financially ready" ? "notready" : status === "Closed" ? "closed" : "";
const dateTime = value => value ? new Date(value).toLocaleString() : "—";
const eventLog = (name, detail = {}) => {
  const events = load(STORE.events, []);
  events.push({ name, at:new Date().toISOString(), detail });
  localStorage.setItem(STORE.events, JSON.stringify(events.slice(-500)));
};
const blankProfile = () => ({
  funding:"", level:"bachelors", subject:"Computer Science & IT", alternateSubject:"", qualificationCountry:"Kenya",
  qualificationName:"Kenya Certificate of Secondary Education (KCSE)", qualificationResult:"", completionStatus:"completed",
  completionYear:"2025", relevantSubjects:"", bachelorTitle:"", bachelorInstitution:"", bachelorCountry:"Kenya",
  bachelorCompletion:"completed", bachelorYear:"2024", bachelorClassification:"", subjectRelevance:"related",
  highestPostgrad:"", researchField:"", proposalStatus:"in progress", publications:"", supervisorStatus:"not yet",
  secondaryQualification:"Kenya Certificate of Secondary Education (KCSE)", secondaryGrade:"", intendedProgression:"",
  destinations:["Spain","Ireland","Germany"], intakeType:"next", intake:"September 2027",
  budgetAmount:"1500000", budgetCurrency:"KES", budgetFlex:"10", livingCostsSeparate:"yes",
  passport:"valid"
});

const initialScreen = new URLSearchParams(location.search).get("screen");
const explicitDemoMode = new URLSearchParams(location.search).get("demo") === "1";
let state = {
  view: initialScreen === "admin" ? "admin" : initialScreen === "matcher" ? "matcher" : "home",
  adminTab:"overview", role:"Administrator", step:0, profile:load(STORE.draft, blankProfile()),
  scholarshipAck:false, results:[], resultFilter:"all", resultSort:"fit", selectedDetail:null,
  saved:load(STORE.saved, []), compare:[], leads:load(STORE.leads, DEMO_LEADS),
  selectedLead:null, leadSearch:"", leadStatusFilter:"all", statusReason:"", noteDraft:"",
  contact:{ name:"", email:"", phone:"", residence:"Kenya", preferredChannel:"WhatsApp" },
  serviceConsent:false, marketingConsent:false, budgetAccepted:false, reference:null, toast:"",
  unsupportedCountry:"", modal:"", reportPeriod:"30 days", lastMatchAt:null
};
state.resultsMode = "demo";
state.resultsLoading = false;
state.resultsError = "";
state.catalogueMeta = null;
state.recommendation = {...{
  name:"", subject:"", level:"", destinations:[], work:"any", postStudy:"any", residency:"any",
  accommodation:"any", campus:"any", budgetAmount:"", budgetCurrency:"KES"
},...load(STORE.recommendation, {})};
state.recommendationOpen = false;
state.recommendationStep = 0;
if (!localStorage.getItem(STORE.leads)) localStorage.setItem(STORE.leads, JSON.stringify(state.leads));

function persist() {
  localStorage.setItem(STORE.draft, JSON.stringify(state.profile));
  localStorage.setItem(STORE.saved, JSON.stringify(state.saved));
  localStorage.setItem(STORE.leads, JSON.stringify(state.leads));
}
function toast(message) {
  state.toast = message;
  renderToast();
  setTimeout(() => { state.toast = ""; renderToast(); }, 2600);
}
function renderToast() {
  let node = document.getElementById("toast");
  if (!state.toast) { node?.remove(); return; }
  if (!node) { node = document.createElement("div"); node.id = "toast"; node.className = "toast"; document.body.append(node); }
  node.textContent = state.toast;
}
function header() {
  return `<div class="demo-ribbon">${explicitDemoMode?"DEMO PREVIEW · Synthetic institutions and tuition only":"LIVE CATALOGUE REQUIRED · Recommendations show only approved, current source records"} · No live applications or counsellor notifications</div>
  <header class="topbar"><div class="topbar-inner">
    <a class="brand" href="#" data-action="home"><span class="brand-mark">✦</span><span>AsterPath</span></a>
    <nav class="nav" aria-label="Main navigation">
      <button data-action="home" ${state.view==="home"?'aria-current="page"':''}>Home</button><button data-action="destinations">Destinations</button><button data-action="how">How it works</button><button data-action="saved" ${state.view==="saved"?'aria-current="page"':''}>Saved options <span id="saved-count">${state.saved.length ? `(${state.saved.length})` : ""}</span></button>
    </nav>
    <div class="nav-actions"><button class="btn btn-secondary" data-action="admin">Staff workspace</button><button class="btn btn-primary" data-action="start">Find my options <span>↗</span></button></div>
    <details class="mobile-menu"><summary aria-label="Open navigation menu" title="Navigation">☰</summary><nav class="mobile-panel" aria-label="Mobile navigation"><button data-action="home">Home</button><button data-action="destinations">Destinations</button><button data-action="how">How it works</button><button data-action="saved">Saved options ${state.saved.length?`(${state.saved.length})`:""}</button><button data-action="admin">Staff workspace</button></nav></details>
  </div></header>`;
}
function footer() {
  return `<footer class="footer"><div class="container footer-inner"><div><strong>AsterPath</strong><br>Study abroad, with a clearer plan.</div><div>Working brand name · Not trademark or domain screened<br>© 2026 AsterPath demo</div><div>Study options are not admission decisions.<br>Tuition excludes living costs unless stated.</div></div></footer>`;
}
function homeView() {
  const dests = DESTINATION_META.map(d => `<div class="dest-card"><div class="flag">${d.flag}</div><div><strong>${d.country}</strong><small>${d.region}</small></div><span class="status-dot">● ${d.status}</span></div>`).join("");
  return `${header()}
  <main>
    <section class="hero"><div class="container hero-grid">
      <div><div class="eyebrow">A clearer route to studying abroad</div>
        <h1>Find study options that fit your <span style="color:var(--teal-2)">plans and budget.</span></h1>
        <p class="lead">Answer a few focused questions about your qualifications, preferred destinations and tuition budget. Review options, understand what still needs checking, and request a counsellor when you are ready.</p>
        <div class="hero-actions"><button class="btn btn-primary" data-action="start">Find my options <span>→</span></button><button class="btn btn-secondary" data-action="how">See how it works</button></div>
        <div class="trust-row"><span><b class="check">✓</b> No account to start</span><span><b class="check">✓</b> Tuition shown with evidence status</span><span><b class="check">✓</b> No admission guarantees</span></div>
      </div>
      <div class="hero-art" aria-label="Illustration of a student study plan">
        <div class="orbit"></div><div class="route-card">
          <div class="route-head"><small>YOUR STUDY PLAN</small><span class="tag demo">DEMO PREVIEW</span></div>
          <h3>A route that starts with you.</h3>
          <div class="route-line"><div class="route-dot">◎</div><div class="route-copy"><strong>Your qualifications</strong><small>Study level and academic background</small></div><span class="route-chip">01</span></div>
          <div class="route-line"><div class="route-dot">⌖</div><div class="route-copy"><strong>Your destinations</strong><small>Six supported study destinations</small></div><span class="route-chip">02</span></div>
          <div class="route-line"><div class="route-dot">◈</div><div class="route-copy"><strong>Your tuition budget</strong><small>Clear costs and currency context</small></div><span class="route-chip">03</span></div>
          <div class="route-footer"><span>About 3–5 minutes</span><span>Save as you go ↗</span></div>
        </div><div class="float-pill one">✦ Your shortlist, your pace</div><div class="float-pill two">✓ No early account required</div>
      </div>
    </div></section>
    <section class="section" id="destinations"><div class="container">
      <div class="section-head"><div><div class="eyebrow">Supported destinations</div><h2>Start with six destinations.</h2></div><p>Only these destinations are currently supported in this product specification. Other destinations are routed to optional manual review.</p></div>
      <div class="dest-grid">${dests}</div>
    </div></section>
    <div class="editorial-strip"><div class="container"><strong>✳ Your ambition. A clearer direction.</strong><span>Study options · Budget context · Transparent next steps</span></div></div>
    <section class="section" id="how" style="background:#eff5f1"><div class="container">
      <div class="section-head"><div><div class="eyebrow">How it works</div><h2>Three simple steps.</h2></div><p>Understand the options first. Share your contact details only when you decide to request support.</p></div>
      <div class="steps-grid">
        <article class="step-card"><div class="step-number">01</div><h3>Tell us about your plans</h3><p>Choose a study level, subject, academic background, destination, intake and annual tuition budget.</p></article>
        <article class="step-card"><div class="step-number">02</div><h3>Review your options</h3><p>Compare course-level options, tuition evidence and the points that still require confirmation.</p></article>
        <article class="step-card"><div class="step-number">03</div><h3>Request a counsellor</h3><p>Confirm that the tuition range is affordable, then send a ready request for follow-up.</p></article>
      </div>
    </div></section>
    <section class="section"><div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center">
      <div><div class="eyebrow">Funding clarity</div><h2>Built for self-funded plans.</h2><p class="lead" style="font-size:16px">Students funding their studies, supported by family, employers or government sponsors can continue through the normal qualification journey.</p></div>
      <div class="notice warning"><strong>Looking for a scholarship?</strong><br>We do not currently offer scholarships or financial aid. You may still browse self-funded options and verified institutional discounts where available. Scholarship seekers are not counted as financially ready leads.</div>
    </div></section>
    <section class="section" style="padding-top:0"><div class="container"><div class="notice"><strong>Important:</strong> This preview runs in demo mode. It uses synthetic institution names and illustrative tuition figures, not verified university inventory. No admission decision, visa advice, payment or live application submission is provided.</div></div></section>
    <section class="final-cta"><div class="container"><div><div class="eyebrow">Make your next move</div><h2>Your next chapter starts with a clear plan.</h2><p>Tell us where you want to study, what you want to learn and the tuition range that works for you. No account required to begin.</p></div><button class="btn btn-primary" data-action="start">Explore my options ↗</button></div></section>
  </main>${footer()}`;
}

const stepNames = ["Funding", "Study level", "Subject", "Academics", "Destinations", "Intake", "Budget", "Passport", "Review"];
function progressMarkup() {
  const p = Math.round(((state.step + 1) / stepNames.length) * 100);
  return `<div class="progress-head"><span>STEP ${state.step + 1} OF ${stepNames.length} · ${stepNames[state.step].toUpperCase()}</span><span>${p}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div>`;
}
function option(value, title, subtitle, icon, selected) {
  return `<button class="option ${selected ? "selected" : ""}" type="button" data-choice="${esc(value)}"><span class="option-icon">${icon}</span><span><strong>${title}</strong><small>${subtitle}</small></span></button>`;
}
function field(label, name, value, opts = {}) {
  const type = opts.type || "text";
  const cls = opts.full ? "field full" : "field";
  if (opts.select) {
    return `<div class="${cls}"><label for="${name}">${label}</label><select id="${name}" name="${name}" data-${opts.scope || "profile"}="${name}">${opts.select.map(o => `<option value="${esc(o.value)}" ${String(value)===String(o.value)?"selected":""}>${esc(o.label)}</option>`).join("")}</select>${opts.help?`<span class="help">${opts.help}</span>`:""}</div>`;
  }
  return `<div class="${cls}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${opts.min!==undefined?`min="${opts.min}"`:""} ${opts.placeholder?`placeholder="${esc(opts.placeholder)}"`:""} data-${opts.scope || "profile"}="${name}" ${opts.required?"required":""}>${opts.help?`<span class="help">${opts.help}</span>`:""}</div>`;
}
function academicFields() {
  const p = state.profile;
  if (p.level === "masters") return `<div class="field-grid">
    ${field("Bachelor’s degree title","bachelorTitle",p.bachelorTitle,{scope:"academic",placeholder:"e.g. BSc Computer Science",full:true})}
    ${field("Awarding institution","bachelorInstitution",p.bachelorInstitution,{scope:"academic",placeholder:"Institution name"})}
    ${field("Country of institution","bachelorCountry",p.bachelorCountry,{scope:"academic",select:["Kenya","Uganda","Tanzania","Rwanda","Other"].map(x=>({value:x,label:x}))})}
    ${field("Completion status","bachelorCompletion",p.bachelorCompletion,{scope:"academic",select:[{value:"completed",label:"Completed"},{value:"in_progress",label:"In progress"}]})}
    ${field("Completion year","bachelorYear",p.bachelorYear,{scope:"academic",type:"number",min:1980})}
    ${field("Classification or GPA (as awarded)","bachelorClassification",p.bachelorClassification,{scope:"academic",placeholder:"Keep your original grading scale"})}
    <div class="field full"><label>How relevant is your degree to the intended subject?</label><select data-academic="subjectRelevance"><option value="related" ${p.subjectRelevance==="related"?"selected":""}>Related</option><option value="partly_related" ${p.subjectRelevance==="partly_related"?"selected":""}>Partly related</option><option value="unrelated" ${p.subjectRelevance==="unrelated"?"selected":""}>Not directly related</option><option value="unsure" ${p.subjectRelevance==="unsure"?"selected":""}>Not sure</option></select></div>
  </div><div class="notice">Your original classification or GPA is preserved. This demo does not convert grades into a universal GPA.</div>`;
  if (p.level === "phd") return `<div class="field-grid">
    ${field("Highest postgraduate qualification","highestPostgrad",p.highestPostgrad,{scope:"academic",placeholder:"e.g. Master of Public Health",full:true})}
    ${field("Research field","researchField",p.researchField,{scope:"academic",placeholder:"Your intended research area",full:true})}
    ${field("Research proposal status","proposalStatus",p.proposalStatus,{scope:"academic",select:[{value:"not_started",label:"Not started"},{value:"in progress",label:"In progress"},{value:"ready",label:"Ready"}]})}
    ${field("Publications (optional)","publications",p.publications,{scope:"academic",placeholder:"Optional"})}
    ${field("Supervisor contact (optional)","supervisorStatus",p.supervisorStatus,{scope:"academic",select:[{value:"not yet",label:"Not contacted"},{value:"contacted",label:"Contacted"},{value:"confirmed",label:"Confirmed"}]})}
  </div>`;
  if (p.level === "foundation") return `<div class="field-grid">
    ${field("Secondary qualification","secondaryQualification",p.secondaryQualification,{scope:"academic",full:true})}
    ${field("Overall grade / result","secondaryGrade",p.secondaryGrade,{scope:"academic",placeholder:"Enter the result as awarded"})}
    ${field("Completion year","completionYear",p.completionYear,{scope:"academic",type:"number",min:1980})}
    ${field("Intended degree progression","intendedProgression",p.intendedProgression,{scope:"academic",placeholder:"e.g. Bachelor of Business"})}
  </div><div class="notice">Your original qualification and grade are retained. No automatic equivalency decision is made.</div>`;
  return `<div class="field-grid">
    ${field("Qualification country","qualificationCountry",p.qualificationCountry,{scope:"academic",select:["Kenya","Uganda","Tanzania","Rwanda","Burundi","South Sudan","Other"].map(x=>({value:x,label:x}))})}
    ${field("Qualification name","qualificationName",p.qualificationName,{scope:"academic"})}
    ${field("Result / grade (as awarded)","qualificationResult",p.qualificationResult,{scope:"academic",placeholder:"e.g. B+ or 68%",full:true})}
    ${field("Completion status","completionStatus",p.completionStatus,{scope:"academic",select:[{value:"completed",label:"Completed"},{value:"in_progress",label:"In progress"}]})}
    ${field("Completion year","completionYear",p.completionYear,{scope:"academic",type:"number",min:1980})}
    ${field("Relevant subjects (optional)","relevantSubjects",p.relevantSubjects,{scope:"academic",placeholder:"List subjects if relevant to your course",full:true})}
  </div><div class="notice">Enter grades exactly as awarded. No unverified grade conversion is applied.</div>`;
}
function reviewItem(label, value) { return `<div class="review-item"><small>${label}</small><strong>${esc(value || "Not provided")}</strong></div>`; }
function matcherStepContent() {
  const p = state.profile;
  if (state.step === 0) return `<h2>How will your studies be funded?</h2><p class="question-sub">This helps us understand whether a self-funded study route is suitable.</p>
    <div class="option-grid">${FUNDING_OPTIONS.map((o,i)=>option(o.value,o.label,["Personal savings or income","Family or guardian support","Employer sponsorship","Government sponsorship","Some scholarship support is needed","Full scholarship support is needed"][i],["◈","⌂","▣","♧","✧","✦"][i],p.funding===o.value)).join("")}</div>
    ${requiresScholarship(p.funding)?`<div class="notice warning" style="margin-top:18px"><strong>Scholarship information</strong><br>We do not currently offer scholarships or financial aid. You may still browse self-funded options and verified institutional discounts where available. An institution discount is not a scholarship.<label style="display:flex;gap:9px;align-items:flex-start;margin-top:14px;color:#78531d"><input type="checkbox" id="scholarship-ack" ${state.scholarshipAck?"checked":""} style="margin-top:3px;accent-color:#8b5b17"> I understand and would still like to browse self-funded options.</label></div>`:""}`;
  if (state.step === 1) return `<h2>What level do you want to study?</h2><p class="question-sub">Choose the award you intend to pursue.</p><div class="option-grid">
    ${option("foundation","Foundation / pathway","A preparatory route before a degree","◇",p.level==="foundation")}
    ${option("bachelors","Bachelor’s degree","Undergraduate study","⌂",p.level==="bachelors")}
    ${option("masters","Master’s degree","Postgraduate taught or research study","▤",p.level==="masters")}
    ${option("phd","PhD","Doctoral research study","✧",p.level==="phd")}
  </div><div class="notice" style="margin-top:16px">A master’s normally requires a completed bachelor’s degree. A PhD normally requires relevant postgraduate preparation. Institution-specific rules require verification.</div>`;
  if (state.step === 2) {
    const subjects=["Computer Science & IT","Business & Management","Engineering","Health & Life Sciences","Arts & Social Sciences","Education","Law","Undecided"];
    return `<h2>Which subject interests you?</h2><p class="question-sub">Choose one main subject. You can add an alternative or select undecided.</p><div class="option-grid">${subjects.map((s,i)=>option(s,s,"Study area",["⌘","◫","⚙","✚","✎","⌂","§","?" ][i],p.subject===s)).join("")}</div>
    <div class="field" style="margin-top:18px"><label for="alternateSubject">Alternative subject (optional)</label><input id="alternateSubject" data-profile="alternateSubject" value="${esc(p.alternateSubject)}" placeholder="Add one alternative subject"></div>`;
  }
  if (state.step === 3) return `<h2>Tell us about your academic background.</h2><p class="question-sub">We ask for different details depending on your intended study level.</p>${academicFields()}`;
  if (state.step === 4) return `<h2>Where would you like to study?</h2><p class="question-sub">Select one or more supported destinations. Your choices influence the order of results.</p>
    <div class="choice-list">${DESTINATION_META.map(d=>`<label class="choice-check"><input type="checkbox" data-destination="${d.country}" ${p.destinations.includes(d.country)?"checked":""}><span>${d.flag} <strong>${d.country}</strong></span></label>`).join("")}</div>
    <div style="margin-top:16px"><button class="btn btn-secondary" data-action="unsupported">I am interested in another country</button></div>
    <p class="help" style="margin-top:10px">USA, Canada, Australia and other unsupported destinations are not included in current inventory. Optional administrator review does not promise that options will be found.</p>`;
  if (state.step === 5) return `<h2>When would you like to start?</h2><p class="question-sub">Choose a specific intake or keep your timing flexible.</p>
    <div class="option-grid">
      ${option("next","Next available intake","Find the next intake marked open","↗",p.intakeType==="next")}
      ${option("flexible","I am flexible","Consider different available years","∞",p.intakeType==="flexible")}
      ${option("exact","Specific month and year","I have a target start date","▦",p.intakeType==="exact")}
    </div>${p.intakeType==="exact"?`<div class="field" style="margin-top:18px"><label for="intake">Preferred month and year</label><select id="intake" data-profile="intake">${["January 2027","February 2027","April 2027","September 2027","October 2027","January 2028","September 2028"].map(x=>`<option ${p.intake===x?"selected":""}>${x}</option>`).join("")}</select></div>`:""}`;
  if (state.step === 6) return `<h2>What is your annual tuition budget?</h2><p class="question-sub">Enter the maximum amount you can allocate to tuition for one academic year.</p>
    <div class="field-grid">
      ${field("Annual tuition budget","budgetAmount",p.budgetAmount,{scope:"profile",type:"number",min:1,placeholder:"e.g. 1500000"})}
      ${field("Currency","budgetCurrency",p.budgetCurrency,{scope:"profile",select:CURRENCIES.map(x=>({value:x,label:x}))})}
      ${field("Maximum flexibility","budgetFlex",p.budgetFlex,{scope:"profile",select:[{value:"0",label:"No flexibility"},{value:"5",label:"Up to 5% more"},{value:"10",label:"Up to 10% more"},{value:"20",label:"Up to 20% more"},{value:"25",label:"Up to 25% more"}]})}
      ${field("Are living costs separate?","livingCostsSeparate",p.livingCostsSeparate,{scope:"profile",select:[{value:"yes",label:"Yes — separate from tuition"},{value:"no",label:"No — included in this budget"},{value:"unsure",label:"Not sure yet"}]})}
    </div><div class="notice">Tuition is separate from visa, travel, accommodation, insurance and other living costs unless a verified course record states otherwise. Currency comparisons require a dated exchange rate; none is connected in this demo.</div>`;
  if (state.step === 7) return `<h2>What is your passport status?</h2><p class="question-sub">A passport helps with planning, but not having one does not prevent you from continuing.</p><div class="option-grid">
    ${option("valid","I have a valid passport","Ready for travel planning","✓",p.passport==="valid")}
    ${option("in_progress","I have applied for one","Passport application is in progress","◷",p.passport==="in_progress")}
    ${option("none","I do not have one yet","You can continue and receive a reminder","＋",p.passport==="none")}
  </div>`;
  return `<h2>Review your study profile.</h2><p class="question-sub">Check your answers before we prepare a demonstration shortlist.</p>
    <div class="review-grid">
      ${reviewItem("Funding",labelFunding(p.funding))}
      ${reviewItem("Study level",labelLevel(p.level))}
      ${reviewItem("Subject",p.subject)}
      ${reviewItem("Academic evidence",p.level==="masters" ? `${p.bachelorTitle || "Degree title not provided"} · ${p.bachelorClassification || "Classification not provided"}` : p.level==="phd" ? `${p.highestPostgrad || "Postgraduate qualification not provided"}` : `${p.qualificationName || p.secondaryQualification} · ${p.qualificationResult || p.secondaryGrade || "Result not provided"}`)}
      ${reviewItem("Destinations",p.destinations.join(", "))}
      ${reviewItem("Intake",p.intakeType==="next"?"Next available":p.intakeType==="flexible"?"Flexible":p.intake)}
      ${reviewItem("Annual tuition budget",`${money(p.budgetAmount,p.budgetCurrency)} · ${p.budgetFlex}% flexibility`)}
      ${reviewItem("Passport",({valid:"Valid passport",in_progress:"Application in progress",none:"No passport yet"})[p.passport])}
    </div>
    <div class="notice" style="margin-top:17px">This preview uses synthetic course fixtures. It does not evaluate official entry requirements, make admission decisions or guarantee eligibility.</div>`;
}
function matcherView() {
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Your study profile</div><h1>Find options that fit your plan.</h1><p>Answer a few questions. Your progress is saved in this browser.</p></div>
    <div class="wizard-wrap">${progressMarkup()}<section class="question-card">${matcherStepContent()}
      <div class="wizard-actions"><button class="btn btn-ghost" data-action="back" ${state.step===0?"disabled":""}>← Back</button><button class="btn btn-primary" data-action="next">${state.step===stepNames.length-1?explicitDemoMode?"Show demo matches":"Check live matches":"Continue →"}</button></div>
    </section><p class="help" style="text-align:center;margin-top:14px">No account is required. Use fictional contact details if you test the request flow.</p></div></main>${footer()}`;
}

function resultCard(item) {
  const saved = state.saved.includes(item.id);
  const compared = state.compare.includes(item.id);
  const match = item.match || scoreCandidate(state.profile, item);
  const fit = match.budgetFit;
  const budgetText = fit.status === "within" ? "Within budget (same currency)" : fit.status === "above" ? "Above budget (same currency)" : `Budget comparison unavailable · ${state.profile.budgetCurrency} to ${item.tuitionCurrency} rate not connected`;
  return `<article class="result-card">
    <div class="result-top"><div><div class="result-country">${esc(item.country)} · ${esc(item.city)}</div><h3>${esc(item.course)}</h3><p>${esc(item.institution)}</p></div><span class="tag ${state.resultsMode==="live"?"verified":"demo"}">${state.resultsMode==="live"?"VERIFIED SOURCE RECORD":"DEMO FIXTURE"}</span></div>
    <div class="result-tags"><span class="tag">${labelLevel(item.level)}</span><span class="tag">${esc(item.duration)}</span><span class="tag">${esc(item.intake)}</span><span class="tag review">Eligibility: manual review</span></div>
    <p><strong>Why it appears:</strong> ${item.subject===state.profile.subject?"Subject and study level align with your answers.":"Study level aligns with your answers."} ${state.profile.destinations.includes(item.country)?"Destination selected.":""}</p>
    <p><strong>Budget:</strong> ${esc(budgetText)}</p>
    <div class="result-bottom"><div class="tuition"><strong>${money(item.tuitionAmount,item.tuitionCurrency)}</strong><small>${state.resultsMode==="live"?`International tuition · ${esc(item.academicYear)} · source checked ${esc(item.lastVerifiedAt?.slice(0,10)||"date unavailable")}`:"Illustrative annual tuition · synthetic demo figure"}</small></div>
      <div class="card-actions"><button class="small-btn ${saved?"active":""}" data-action="save" data-id="${item.id}">${saved?"✓ Saved":"＋ Save"}</button><button class="small-btn ${compared?"active":""}" data-action="compare" data-id="${item.id}">${compared?"✓ Compare":"⇄ Compare"}</button><button class="small-btn" data-action="details" data-id="${item.id}">Details</button></div>
    </div>
    <div class="result-disclaimer">${state.resultsMode==="live"?`<a href="${esc(item.courseUrl)}" target="_blank" rel="noopener noreferrer">Course source</a> · <a href="${esc(item.feeSourceUrl)}" target="_blank" rel="noopener noreferrer">Fee source</a> · <a href="${esc(item.recognitionSourceUrl)}" target="_blank" rel="noopener noreferrer">Recognition source</a> · Valid through ${esc(item.validUntil?.slice(0,10)||"not stated")} · ${esc(item.sourceAttribution)}`:`Source: ${esc(item.source)} · Last verified: Not verified · This institution and fee are not real.`}</div>
  </article>`;
}
function resultsView() {
  const countries = [...new Set(state.results.map(x=>x.country))];
  let list = state.results.filter(x=>state.resultFilter==="all" || x.country===state.resultFilter);
  if (state.resultSort==="tuition") list = [...list].sort((a,b)=>a.tuitionAmount-b.tuitionAmount);
  if (state.resultSort==="fit") list = [...list].sort((a,b)=>b.match.score-a.match.score || a.id.localeCompare(b.id));
  const fundingKnown=Boolean(state.profile.funding);
  const ready = fundingKnown && (isFinanciallyReady(state.profile.funding, false) || ["self","family","employer","government"].includes(state.profile.funding));
  const live=state.resultsMode==="live";
  return `${header()}<main class="container">
    <div class="results-head"><div><div class="eyebrow">${live?"Source-checked study options":"Demonstration shortlist"}</div><h1 style="font-size:36px;margin:8px 0">${state.recommendation.name?`Here are your matches, ${esc(state.recommendation.name)}.`:`${state.resultsLoading?"Checking current sources…":`We found ${list.length} ${live?"verified option":"demo option"}${list.length===1?"":"s"}.`}`}</h1><p class="muted">${live?`Matched by course, level and destination. Catalogue checked ${esc(state.catalogueMeta?.lastFetchedAt?.slice(0,10)||"pending")}.`:`${list.length} synthetic course example${list.length===1?"":"s"} based on your selected study level, subject and destinations.`}</p></div><div class="chip-row"><button class="btn btn-secondary" data-action="matcher">Complete study profile</button><button class="btn btn-secondary" data-action="compare-view" ${state.compare.length<2?"disabled":""}>Compare ${state.compare.length?`(${state.compare.length})`:"options"}</button></div></div>
    ${state.resultsLoading?`<div class="notice">Connecting to the configured university data feed. No course will appear until its source, current status and verification window pass checks.</div>`:""}
    ${state.resultsError?`<div class="notice warning"><strong>Live recommendations are unavailable.</strong><br>${esc(state.resultsError)}<br><span>Open Staff workspace → Universities &amp; data to see the required sources and connection status. Demo records are not substituted.</span></div>`:""}
    ${live&&list.length?`<div class="notice warning" style="margin-bottom:20px"><strong>Source-checked records, not admissions decisions.</strong> Each result links to its course, fee and recognition evidence. Eligibility still requires review by the institution. Currency conversion is not applied without a verified rate.</div>`:!live?`<div class="notice warning" style="margin-bottom:20px"><strong>Demo inventory only.</strong> These synthetic records are shown only in explicit demo mode. They are not university recommendations.</div>`:""}
    ${live?`<div class="results-layout"><aside class="filter-panel"><h3>Refine options</h3><label for="resultFilter">Destination</label><select id="resultFilter"><option value="all">All selected destinations</option>${countries.map(c=>`<option ${state.resultFilter===c?"selected":""}>${esc(c)}</option>`).join("")}</select><label for="resultSort">Sort by</label><select id="resultSort"><option value="fit" ${state.resultSort==="fit"?"selected":""}>Best match (explainable score)</option><option value="tuition" ${state.resultSort==="tuition"?"selected":""}>Lowest verified annual tuition</option></select>${state.recommendation.subject?`<div class="divider"></div><h4>Preferences saved</h4><p class="help">Course: ${esc(state.recommendation.subject)}<br>Study level: ${esc(labelLevel(state.recommendation.level))}<br>Work, stay and campus answers are not scored unless verified source data exists.</p>`:""}<div class="divider"></div><p class="help">Current filters require an approved record, supported country, exact study level and subject, a selected destination, an open intake, and unexpired evidence. Budget scores only use verified annual international tuition; unmatched currencies are omitted.</p><button class="btn btn-light" style="width:100%;margin-top:15px" data-action="saved">View saved options</button></aside><section class="result-list">${state.resultsLoading?"":list.length?list.map(resultCard).join(""):`<div class="empty-state"><h3>${state.resultsError?"No live catalogue connected":"No verified records match these choices"}</h3><p>${state.resultsError?"The app needs an approved current feed before it can display live recommendations.":"Try another subject or destination. Records with missing, expired or unapproved evidence are excluded."}</p><button class="btn btn-primary" data-action="matcher">Adjust answers</button></div>`}${list.length?`<div class="notice">Data provider: ${esc(state.catalogueMeta?.provider||"approved feed")} · attribution: ${esc(state.catalogueMeta?.licence?.name||"see source record")}.</div>`:""}</section></div>`:`<div class="result-list">${!state.resultsLoading&&list.length?list.map(resultCard).join(""):!state.resultsLoading&&!state.resultsError?`<div class="empty-state"><h3>No demo matches</h3><p>Your selected choices returned no synthetic example.</p></div>`:""}</div>`}
    ${ready?`<section class="section" style="padding:38px 0"><div class="notice purple"><strong>Ready to speak with a counsellor?</strong><br>After you confirm the estimated tuition range, you can submit a counsellor request. This is not a university application.</div><div style="margin-top:15px"><button class="btn btn-primary" data-action="ready">Help me apply →</button></div></section>`:`<section class="section" style="padding:38px 0"><div class="notice warning"><strong>${fundingKnown?"Browsing only — not financially ready.":"Continue your study profile when you are ready."}</strong><br>${fundingKnown?"Your selected funding route requires scholarship support. You can save and compare self-funded options, but this profile will not be submitted as a financially qualified lead.":"This quick recommendation flow is for browsing. Complete the full study profile to add funding and academic details before requesting counsellor support."}</div></section>`}
  </main>${footer()}${state.selectedDetail?detailModal(state.selectedDetail):""}`;
}

function detailModal(item) {
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <div class="eyebrow">Course detail · ${state.resultsMode==="live"?"source-checked record":"demo fixture"}</div><h2 id="detail-title">${esc(item.course)}</h2><p>${esc(item.institution)} · ${item.city}, ${item.country}</p>
    <div class="detail-kv">
      <div><small>Study level</small><strong>${labelLevel(item.level)}</strong></div><div><small>Duration</small><strong>${esc(item.duration)}</strong></div>
      <div><small>${state.resultsMode==="live"?"Verified annual international tuition":"Illustrative annual tuition"}</small><strong>${money(item.tuitionAmount,item.tuitionCurrency)}</strong></div><div><small>Intake</small><strong>${esc(item.intake)}</strong></div>
      <div><small>Eligibility</small><strong>Manual review</strong></div><div><small>Source status</small><strong>${state.resultsMode==="live"?`Verified · valid through ${esc(item.validUntil?.slice(0,10)||"not stated")}`:"Synthetic fixture"}</strong></div>
    </div>
    ${state.resultsMode==="live"?`<div class="notice" style="margin-top:15px"><a href="${esc(item.courseUrl)}" target="_blank" rel="noopener noreferrer">Course source</a> · <a href="${esc(item.institutionUrl)}" target="_blank" rel="noopener noreferrer">Institution</a> · <a href="${esc(item.feeSourceUrl)}" target="_blank" rel="noopener noreferrer">Fee source</a> · <a href="${esc(item.recognitionSourceUrl)}" target="_blank" rel="noopener noreferrer">Recognition source</a><br>Checked ${esc(item.lastVerifiedAt?.slice(0,10)||"date unavailable")} · ${esc(item.sourceAttribution)}</div>`:`<div class="notice warning" style="margin-top:15px">No official entry requirements, application deadline, fee schedule or recognition record is attached. Do not rely on this fixture for an application or financial decision.</div>`}
    <div style="display:flex;justify-content:flex-end;margin-top:18px"><button class="btn btn-primary" data-action="close-detail">Close</button></div>
  </section></div>`;
}

function readyView() {
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Budget confirmation</div><h1>Confirm the tuition range.</h1><p>This step qualifies a ready request. It does not submit an application.</p></div>
    <div class="wizard-wrap"><section class="question-card"><h2>Are you comfortable with the estimated tuition?</h2><p class="question-sub">Your selected budget is ${money(state.profile.budgetAmount,state.profile.budgetCurrency)} per year. The current preview uses illustrative demo tuition and does not have verified exchange rates.</p>
      <label class="choice-check" style="align-items:flex-start"><input type="checkbox" id="budget-accept" ${state.budgetAccepted?"checked":""} style="margin-top:3px;accent-color:var(--teal)"><span><strong>I understand the estimated tuition and can self-fund within this range.</strong><small class="muted">Only confirm if this statement accurately reflects your funding position.</small></span></label>
      <div class="notice warning" style="margin-top:16px">Submitting this request asks a counsellor to contact you. It does not submit a university application, guarantee admission or provide visa advice.</div>
      <div class="wizard-actions"><button class="btn btn-ghost" data-action="back-results">← Back to results</button><button class="btn btn-primary" data-action="contact" ${state.budgetAccepted?"":"disabled"}>Continue →</button></div>
    </section></div></main>${footer()}`;
}
function contactView() {
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Counsellor request</div><h1>Where should we reach you?</h1><p>Contact details are collected only after you confirm financial readiness.</p></div>
    <div class="wizard-wrap"><section class="question-card"><h2>Your contact details</h2><p class="question-sub">For this preview, use fictional contact details. The information stays in this browser only.</p>
      <form id="contact-form"><div class="field-grid">
        ${field("Full name","name",state.contact.name,{scope:"contact",placeholder:"e.g. Amina N.",full:true})}
        ${field("Email address","email",state.contact.email,{scope:"contact",type:"email",placeholder:"you@example.com"})}
        ${field("Phone / WhatsApp number","phone",state.contact.phone,{scope:"contact",type:"tel",placeholder:"+254 7xx xxx xxx",help:"Use international format, e.g. +254, +256, +255 or +250."})}
        ${field("Country of residence","residence",state.contact.residence,{scope:"contact",select:["Kenya","Uganda","Tanzania","Rwanda","Burundi","South Sudan","DR Congo","Other"].map(x=>({value:x,label:x}))})}
        ${field("Preferred contact channel","preferredChannel",state.contact.preferredChannel,{scope:"contact",select:["WhatsApp","Phone","Email"].map(x=>({value:x,label:x}))})}
      </div>
      <div class="divider"></div>
      <label class="choice-check"><input type="checkbox" id="service-consent" ${state.serviceConsent?"checked":""} required style="accent-color:var(--teal)"><span><strong>I agree to be contacted about this study-abroad request.</strong><small class="muted">Required service contact consent. Notice version: DEMO-1.0.</small></span></label>
      <label class="choice-check" style="margin-top:10px"><input type="checkbox" id="marketing-consent" ${state.marketingConsent?"checked":""} style="accent-color:var(--teal)"><span><strong>I would also like to receive relevant updates and marketing.</strong><small class="muted">Optional. This is separate from service contact consent.</small></span></label>
      <div class="notice" style="margin-top:16px">Your request preview will include your academic profile, selected destinations, budget, funding route, passport status, saved options and contact preference.</div>
      <div class="wizard-actions"><button type="button" class="btn btn-ghost" data-action="back-ready">← Back</button><button class="btn btn-primary" type="submit">Review request →</button></div></form>
    </section></div></main>${footer()}`;
}
function previewView() {
  const p=state.profile;
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Final review</div><h1>Review your counsellor request.</h1><p>Check the details that will be added to the demo request queue.</p></div><div class="wizard-wrap"><section class="question-card">
    <div class="review-grid">
      ${reviewItem("Student",state.contact.name)}
      ${reviewItem("Email",state.contact.email)}
      ${reviewItem("Phone",state.contact.phone)}
      ${reviewItem("Residence",state.contact.residence)}
      ${reviewItem("Preferred channel",state.contact.preferredChannel)}
      ${reviewItem("Funding",labelFunding(p.funding))}
      ${reviewItem("Study level",labelLevel(p.level))}
      ${reviewItem("Subject",p.subject)}
      ${reviewItem("Destinations",p.destinations.join(", "))}
      ${reviewItem("Annual tuition budget",`${money(p.budgetAmount,p.budgetCurrency)} · ${p.budgetFlex}% flexibility`)}
      ${reviewItem("Passport",p.passport)}
      ${reviewItem("Saved course options",state.saved.length)}
    </div>
    <div class="notice warning" style="margin-top:18px">Demo submission only. The request is saved to this browser’s local demo queue. No live counsellor, email service or external system is notified.</div>
    <div class="wizard-actions"><button class="btn btn-ghost" data-action="edit-contact">← Edit details</button><button class="btn btn-primary" data-action="submit-request">Submit counsellor request</button></div>
  </section></div></main>${footer()}`;
}
function confirmationView() {
  return `${header()}<main class="container"><div class="wizard-wrap"><section class="question-card" style="text-align:center;padding:45px 30px">
    <div class="step-number" style="margin:0 auto 18px;width:58px;height:58px;font-size:25px">✓</div><div class="eyebrow" style="justify-content:center">Request saved</div><h2 style="margin:12px 0">Your demo request is in the queue.</h2><p class="lead" style="margin:0 auto 20px;font-size:16px">Reference <strong>${esc(state.reference)}</strong></p>
    <div class="notice" style="text-align:left"><strong>What happens next?</strong><br>This is a local demonstration. No counsellor has been notified and no response window is configured. In a production deployment, the administrator would configure the expected response window and notification channel.</div>
    <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:23px"><button class="btn btn-primary" data-action="admin">Open staff workspace</button><button class="btn btn-secondary" data-action="home">Back to home</button></div>
  </section></div></main>${footer()}`;
}

function savedView() {
  const items=state.saved.map(id=>DEMO_COURSES.find(x=>x.id===id)).filter(Boolean).map(x=>({...x,match:scoreCandidate(state.profile,x)}));
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Your shortlist</div><h1>Saved study options.</h1><p>Saved locally in this browser. Options are synthetic demo fixtures.</p></div>
    ${items.length?`<div class="result-list">${items.map(resultCard).join("")}</div>`:`<div class="empty-state"><h3>No saved options yet</h3><p>Save an option from your results to build a shortlist.</p><button class="btn btn-primary" data-action="start">Find my options</button></div>`}
    <div style="margin:22px 0"><button class="btn btn-secondary" data-action="results">Back to results</button><button class="btn btn-primary" data-action="compare-view" style="margin-left:8px" ${state.compare.length<2?"disabled":""}>Compare selected</button></div>
  </main>${footer()}`;
}
function compareView() {
  const items=state.compare.map(id=>DEMO_COURSES.find(x=>x.id===id)).filter(Boolean).slice(0,4);
  return `${header()}<main class="container"><div class="page-top"><div class="eyebrow">Side-by-side view</div><h1>Compare your options.</h1><p>Compare 2–4 course-level options. All entries below are synthetic fixtures.</p></div>
  ${items.length>=2?`<div class="panel table-wrap"><table><thead><tr><th>Decision point</th>${items.map(x=>`<th>${esc(x.institution)}</th>`).join("")}</tr></thead><tbody>
    <tr><td>Course</td>${items.map(x=>`<td>${esc(x.course)}</td>`).join("")}</tr>
    <tr><td>Destination</td>${items.map(x=>`<td>${x.country} · ${x.city}</td>`).join("")}</tr>
    <tr><td>Level</td>${items.map(x=>`<td>${labelLevel(x.level)}</td>`).join("")}</tr>
    <tr><td>Annual tuition</td>${items.map(x=>`<td>${money(x.tuitionAmount,x.tuitionCurrency)}</td>`).join("")}</tr>
    <tr><td>Duration</td>${items.map(x=>`<td>${esc(x.duration)}</td>`).join("")}</tr>
    <tr><td>Intake</td>${items.map(x=>`<td>${esc(x.intake)}</td>`).join("")}</tr>
    <tr><td>Eligibility</td>${items.map(x=>`<td>Manual review</td>`).join("")}</tr>
    <tr><td>Source freshness</td>${items.map(x=>`<td>Not verified</td>`).join("")}</tr>
  </tbody></table></div>`:`<div class="empty-state"><h3>Select at least two options</h3><p>Return to your results and choose Compare on two to four cards.</p><button class="btn btn-primary" data-action="results">Back to results</button></div>`}
  <div style="margin:22px 0"><button class="btn btn-secondary" data-action="results">Back to results</button></div></main>${footer()}`;
}

function adminSidebar() {
  const tabs=[["overview","▦","Overview"],["requests","☷","Requests"],["data","◈","Universities & data"],["reports","▤","Reports"],["settings","⚙","Settings"]];
  return `<aside class="admin-sidebar"><div class="brand"><span class="brand-mark">✦</span><span>AsterPath</span></div><nav class="admin-nav" aria-label="Staff navigation">${tabs.map(([id,icon,label])=>`<button class="${state.adminTab===id?"active":""}" data-admin-tab="${id}">${icon} &nbsp; ${label}</button>`).join("")}</nav><div class="admin-sidebar-note"><strong>DEMO WORKSPACE</strong><br>Local browser data only. Staff sign-in, MFA and server-side permissions are not enabled.</div></aside>`;
}
function adminHeader(title, subtitle) {
  return `<div class="admin-title"><div><div class="eyebrow">Staff workspace</div><h1>${title}</h1><p>${subtitle}</p></div><div class="admin-toolbar"><select id="role-select" aria-label="Preview staff role"><option ${state.role==="Administrator"?"selected":""}>Administrator</option><option ${state.role==="Counsellor"?"selected":""}>Counsellor</option><option ${state.role==="Manager"?"selected":""}>Manager</option></select><button class="btn btn-secondary" data-action="home">Exit workspace</button></div></div>`;
}
function metric(label,value,sub) { return `<div class="metric"><small>${label}</small><strong>${value}</strong><span>${sub}</span></div>`; }
function adminOverview() {
  const leads=state.leads;
  const count=s=>leads.filter(l=>l.status===s).length;
  const unassigned=leads.filter(l=>l.assigned==="Unassigned").length;
  const ready=leads.filter(l=>l.financiallyReady).length;
  return `${adminHeader("Operational overview","Prioritise ready requests, scholarship seekers and records needing follow-up.")}
    <div class="metric-grid">${metric("Total demo requests",leads.length,"Synthetic test records")}${metric("New requests",count("New"),"Awaiting first contact")}${metric("Unassigned",unassigned,"No counsellor assigned")}${metric("Financially ready",ready,"Self / family / sponsored")}</div>
    <div class="metric-grid">${metric("Scholarship seekers",count("Scholarship seeker"),"Tracked separately")}${metric("Not financially ready",count("Not financially ready"),"Not qualified as ready leads")}${metric("Applications started",count("Application started"),"Application foundation only")}${metric("Converted",count("Converted"),"Demo status only")}</div>
    <section class="panel"><div class="panel-head"><h3>Incoming requests</h3><button class="small-btn" data-admin-tab="requests">Open queue →</button></div>${leadTable(leads.slice(0,5),false)}</section>
    <div class="notice">Operational data shown here is synthetic. No response-time SLA has been configured, and no actual counsellor activity is represented.</div>`;
}
function leadTable(leads, showOpen=true) {
  if (!leads.length) return `<div class="empty-state"><h3>No requests found</h3><p>Try changing the search or status filter.</p></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Study plan</th><th>Destination</th><th>Budget</th><th>Status</th><th>Assigned to</th></tr></thead><tbody>
    ${leads.map(l=>`<tr ${showOpen?`data-open-lead="${l.id}"`:""}><td><div class="person"><div class="avatar">${esc(l.name.split(" ").map(x=>x[0]).join("").slice(0,2))}</div><div><strong>${esc(l.name)}</strong><small>${esc(l.reference)}</small></div></div></td><td>${labelLevel(l.level)}<br><span class="muted">${esc(l.subject)}</span></td><td>${esc((l.destinations||[]).join(", "))}</td><td>${money(l.budgetAmount,l.budgetCurrency)}</td><td><span class="status ${labelStatusClass(l.status)}">${esc(l.status)}</span></td><td>${esc(l.assigned||"Unassigned")}</td></tr>`).join("")}
  </tbody></table></div>`;
}
function adminRequests() {
  const q=state.leadSearch.toLowerCase();
  const filtered=state.leads.filter(l=>(state.leadStatusFilter==="all"||l.status===state.leadStatusFilter) && (!q||`${l.name} ${l.reference} ${l.email} ${l.phone}`.toLowerCase().includes(q)));
  return `${adminHeader("Request queue","Search, filter and open a request to review the full student context.")}
    <section class="panel"><div class="panel-head"><h3>All requests <span class="muted">(${filtered.length})</span></h3><div class="admin-toolbar"><input id="lead-search" placeholder="Search name or reference" value="${esc(state.leadSearch)}"><select id="lead-status-filter"><option value="all">All statuses</option>${LEAD_STATUSES.map(s=>`<option ${state.leadStatusFilter===s?"selected":""}>${s}</option>`).join("")}</select><button class="small-btn" data-action="export">Export CSV ↓</button></div></div>${leadTable(filtered,true)}</section>
    <div class="notice">Lead statuses are tracked separately for scholarship seekers and students who are not financially ready. A scholarship request is not treated as a qualified self-funded lead.</div>`;
}
function adminData() {
  return `${adminHeader("Universities & data","Maintain institution, course, fee, intake and requirement evidence.")}
    <div class="metric-grid">${metric("Verified live records","Pending","Waiting for source feed")}${metric("Synthetic demo courses",DEMO_COURSES.length,"Demo mode only")}${metric("Connected destinations","0 of 6","No feed configured")}${metric("Expired or unapproved","Excluded","Never shown as live matches")}</div>
    <section class="panel"><div class="panel-head"><h3>Supported destinations</h3><span class="tag">6 destinations</span></div><div class="dest-grid">${DESTINATION_META.map(d=>`<div class="dest-card"><div class="flag">${d.flag}</div><div><strong>${d.country}</strong><small>Supported destination</small></div><span class="status-dot">● Enabled</span></div>`).join("")}</div></section>
    <section id="live-catalogue-status" class="panel"><div class="panel-head"><h3>Official source access</h3><span class="status notready">Checking</span></div><p class="muted">Checking whether an approved live feed is configured. Source listings by themselves do not mean programme, fee or intake data is connected.</p></section>
    <section class="panel"><h3>Demo course fixtures</h3><p class="muted">These records exist only to demonstrate matching and result-card behaviour.</p><div class="table-wrap"><table><thead><tr><th>Institution</th><th>Country</th><th>Course</th><th>Tuition</th><th>Evidence status</th></tr></thead><tbody>${DEMO_COURSES.slice(0,6).map(x=>`<tr><td>${esc(x.institution)}</td><td>${x.country}</td><td>${esc(x.course)}</td><td>${money(x.tuitionAmount,x.tuitionCurrency)}</td><td><span class="status notready">Synthetic · unverified</span></td></tr>`).join("")}</tbody></table></div></section>`;
}
function adminReports() {
  const statuses=LEAD_STATUSES.map(s=>[s,state.leads.filter(l=>l.status===s).length]);
  const max=Math.max(1,...statuses.map(x=>x[1]));
  const funding=["self","family","employer","government","partial_scholarship","full_scholarship"].map(f=>[labelFunding(f),state.leads.filter(l=>l.funding===f).length]);
  return `${adminHeader("Reports & metrics","Monitor qualification quality, not just traffic volume.")}
    <section class="panel"><div class="panel-head"><h3>Requests by lifecycle status</h3><span class="tag demo">Demo data</span></div><div class="report-bars">${statuses.map(([name,value])=>`<div class="bar-row"><span>${esc(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${value/max*100}%"></div></div><strong>${value}</strong></div>`).join("")}</div></section>
    <section class="panel"><div class="panel-head"><h3>Funding route</h3></div><div class="report-bars">${funding.map(([name,value])=>`<div class="bar-row"><span>${esc(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${value/max*100}%"></div></div><strong>${value}</strong></div>`).join("")}</div></section>
    <div class="notice">Production KPI events specified for tracking include matcher starts, result views, budget acceptance, ready requests, counsellor response, qualified leads, applications and conversions. Scholarship-seeker and not-financially-ready rates are separate metrics. These figures are local demo counts only.</div>`;
}
function adminSettings() {
  return `${adminHeader("Workspace settings","Review feature availability and launch dependencies.")}
    <section class="panel"><h3>Feature flags</h3><div class="detail-kv" style="margin-top:16px">
      <div><small>Scholarship browsing notice</small><strong>Enabled</strong></div><div><small>Unsupported-country review</small><strong>Manual review only</strong></div>
      <div><small>Applications</small><strong>Foundation only · not live</strong></div><div><small>Translations</small><strong>English-first · not launched</strong></div>
      <div><small>Live data sources</small><strong>Disabled</strong></div><div><small>Demo fixtures</small><strong>Enabled with banner</strong></div>
    </div></section>
    <section class="panel"><h3>Operational configuration</h3><div class="detail-kv" style="margin-top:16px">
      <div><small>Expected response window</small><strong>Not configured</strong></div><div><small>FX conversion source</small><strong>Not connected</strong></div>
      <div><small>Email provider</small><strong>Not connected</strong></div><div><small>Staff MFA</small><strong>Not implemented in demo</strong></div>
    </div></section>
    <section class="panel"><h3>Role preview</h3><p class="muted">Administrator manages system and inventory; counsellor manages assigned leads; manager sees team and reports. The selector previews navigation only. It is not a security boundary.</p></section>
    <section class="notice warning"><strong>Production launch blockers:</strong> staff authentication and MFA, server-side role enforcement, managed PostgreSQL, approved university data, current tuition and requirement evidence, dated FX rates, consent/privacy review, email delivery, monitoring, backups and security testing.</section>`;
}
function leadDetail(lead) {
  if (!lead) return `<div class="empty-state"><h3>Select a request</h3><p>Choose a student from the queue to review their details.</p></div>`;
  const notes=(lead.notes||[]).map(n=>`<div class="note">${esc(n.text)}<small>${esc(n.author)} · ${dateTime(n.at)}</small></div>`).join("");
  const history=(lead.history||[]).map(h=>`<div class="note">${esc(h.event)}<small>${dateTime(h.at)}</small></div>`).join("");
  return `<section class="panel"><div class="panel-head"><div><span class="tag demo">DEMO LEAD</span><h3 style="margin-top:9px">${esc(lead.name)} · ${esc(lead.reference)}</h3></div><button class="small-btn" data-action="close-lead">Close detail</button></div>
    <div class="detail-layout"><div>
      <div class="detail-kv">
        <div><small>Email</small><strong>${esc(lead.email||"Not provided")}</strong></div><div><small>Phone</small><strong>${esc(lead.phone||"Not provided")}</strong></div>
        <div><small>Residence</small><strong>${esc(lead.residence||"Not provided")}</strong></div><div><small>Preferred channel</small><strong>${esc(lead.preferredChannel||"Not provided")}</strong></div>
        <div><small>Funding</small><strong>${esc(labelFunding(lead.funding))}</strong></div><div><small>Financial readiness</small><strong>${lead.financiallyReady?"Confirmed":"Not financially ready"}</strong></div>
        <div><small>Study plan</small><strong>${labelLevel(lead.level)} · ${esc(lead.subject)}</strong></div><div><small>Destinations</small><strong>${esc((lead.destinations||[]).join(", "))}</strong></div>
        <div><small>Annual budget</small><strong>${money(lead.budgetAmount,lead.budgetCurrency)}</strong></div><div><small>Passport</small><strong>${esc(lead.passport||"Not provided")}</strong></div>
        <div><small>Service contact consent</small><strong>${lead.serviceConsent?.accepted ? "Accepted" : "Not recorded"}</strong></div><div><small>Marketing consent</small><strong>${lead.marketingConsent?.accepted ? "Accepted" : "Not accepted"}</strong></div>
      </div>
      <div class="divider"></div><h3 style="font-size:15px">Update status</h3><div class="field-grid" style="margin-top:12px">
        ${field("New status","next-status",lead.status,{scope:"none",select:LEAD_STATUSES.map(x=>({value:x,label:x}))})}
        ${field("Reason (required to close or reopen)","status-reason",state.statusReason,{scope:"none",placeholder:"Enter a reason"})}
      </div><button class="btn btn-primary" data-action="update-status" data-id="${lead.id}">Save status</button>
      <div class="divider"></div><h3 style="font-size:15px">Assignment</h3><div class="field" style="margin-top:12px"><label for="assigned">Assigned counsellor</label><select id="assigned"><option ${lead.assigned==="Unassigned"?"selected":""}>Unassigned</option><option ${lead.assigned==="Maya — Demo Counsellor"?"selected":""}>Maya — Demo Counsellor</option><option ${lead.assigned==="Leo — Demo Counsellor"?"selected":""}>Leo — Demo Counsellor</option></select></div><button class="btn btn-secondary" data-action="assign" data-id="${lead.id}">Save assignment</button>
    </div><div><h3 style="font-size:15px">Counsellor notes</h3><div class="note-list" style="margin-top:12px">${notes||`<p class="muted" style="font-size:12px">No notes added.</p>`}</div><div class="admin-form"><input id="note-input" placeholder="Add a timestamped note" value="${esc(state.noteDraft)}"><button class="small-btn" data-action="add-note" data-id="${lead.id}">Add</button></div><div class="divider"></div><h3 style="font-size:15px">Activity history</h3><div class="note-list" style="margin-top:12px">${history}</div></div></div>
  </section>`;
}
function adminDetailView() {
  const lead=state.leads.find(l=>l.id===state.selectedLead);
  return `${adminHeader("Request details","Review student information, assignment, lifecycle status and activity history.")}${leadDetail(lead)}`;
}
function adminView() {
  let content=state.adminTab==="overview"?adminOverview():state.adminTab==="requests"?adminRequests():state.adminTab==="data"?adminData():state.adminTab==="reports"?adminReports():adminSettings();
  if(state.selectedLead && state.adminTab==="requests") content=adminDetailView();
  return `${header()}<div class="admin-shell">${adminSidebar()}<main class="admin-main">${content}</main></div>${footer()}`;
}

const recommendationQuestions = [
  { key:"work", title:"Would you like to work while you study?", choices:[["prefer","I would prefer to"],["helpful","It would be helpful"],["any","No preference"]], note:"Work permissions depend on each destination’s current immigration rules and your visa conditions. This demo does not verify them." },
  { key:"postStudy", title:"Would a post-study work option matter to you?", choices:[["prefer","Strongly prefer it"],["helpful","Good to have"],["any","No preference"]], note:"Post-study options vary by country, qualification and policy date. Check current official rules before relying on them." },
  { key:"residency", title:"Is a possible route to permanent residency important to you?", choices:[["prefer","Important to me"],["helpful","Good to have"],["any","No preference"]], note:"Study does not guarantee residence. Immigration eligibility and rules must be checked with official authorities." },
  { key:"accommodation", title:"What accommodation would you prefer?", choices:[["campus","On-campus"],["offcampus","Off-campus"],["any","No preference"]], note:"Accommodation availability and costs are not verified in this demonstration inventory." },
  { key:"campus", title:"What kind of university setting do you prefer?", choices:[["city","City based"],["campus","Campus based"],["any","No preference"]], note:"The demo inventory does not contain verified campus-setting data; your preference is saved for review." }
];
const recommendationSubjects = ["Computer Science & IT","Business & Management","Engineering","Health & Life Sciences","Arts & Social Sciences","Education","Law","Undecided"];
function recommendationCount() {
  if(!explicitDemoMode)return 0;
  const r=state.recommendation;
  return DEMO_COURSES.filter(x=>x.demo && x.status==="active" && (!r.level || x.level===r.level) && (!r.subject || r.subject==="Undecided" || x.subject===r.subject) && (!r.destinations.length || r.destinations.includes(x.country))).length;
}
function recChoice(key,value,label,help="") {
  const r=state.recommendation;
  return `<button type="button" class="rec-choice ${r[key]===value?"is-selected":""}" data-rec-choice="${key}" data-rec-value="${value}" aria-pressed="${r[key]===value}"><span class="rec-radio"></span><span>${label}</span></button>`;
}
function recommendationStepBody() {
  const r=state.recommendation;
  if(state.recommendationStep===0) return `<div class="rec-welcome"><div class="rec-kicker">AsterPath · Study matcher</div><h2>Find study options that fit your goals, preferences and tuition budget.</h2><div class="rec-orbit" aria-hidden="true"><span>✦</span><span>${explicitDemoMode?"12 synthetic demo records":"Source-checked records only"}</span></div><ul class="rec-benefits"><li><b>✓</b> Match by study level, subject and destination</li><li><b>✓</b> Keep your preferences in this browser as you go</li><li><b>✓</b> See the source and last-check date on each available record</li></ul></div>`;
  if(state.recommendationStep===1) return `<h2>First, what should we call you?</h2><label class="rec-label" for="rec-name">First name</label><input class="rec-input" id="rec-name" data-rec-field="name" autocomplete="given-name" maxlength="60" value="${esc(r.name)}" placeholder="Your first name">`;
  if(state.recommendationStep===2) return `<h2>Hi${r.name?` ${esc(r.name)}`:""}! What course would you like to study?</h2><label class="rec-label" for="rec-subject">Search or choose a subject</label><input class="rec-input" id="rec-subject-search" placeholder="Filter subjects" aria-label="Filter subjects"><div class="rec-subject-list">${recommendationSubjects.map(s=>`<button type="button" class="rec-subject ${r.subject===s?"is-selected":""}" data-rec-choice="subject" data-rec-value="${esc(s)}"><span>${esc(s)}</span><small>${explicitDemoMode?`${DEMO_COURSES.filter(x=>x.subject===s).length} demo examples`:"Choose subject"}</small></button>`).join("")}</div>`;
  if(state.recommendationStep===3) return `<h2>Which level of study are you applying for?</h2>${explicitDemoMode?`<div class="rec-summary">${recommendationCount()} matching synthetic examples for ${esc(r.subject||"your selected subject")}</div>`:`<p class="rec-question-note">We’ll check the connected, source-approved catalogue after you choose your preferences.</p>`}<div class="rec-options">${[["foundation","Foundation / pathway"],["bachelors","Undergraduate"],["masters","Postgraduate"],["phd","Doctoral"]].map(([v,l])=>recChoice("level",v,l,explicitDemoMode?`${DEMO_COURSES.filter(x=>x.level===v && (!r.subject||r.subject==="Undecided"||x.subject===r.subject)).length} examples`:"")).join("")}</div>`;
  if(state.recommendationStep===4) return `<div class="rec-intro"><span class="rec-intro-mark">✦</span><h2>Let’s personalize your study destinations.</h2><p>We’ll ask about a few preferences and your tuition budget, then check the available catalogue for options matching your subject, study level and destination choices.</p>${explicitDemoMode?`<p class="rec-note">Demo preview only: 12 synthetic course records across six destinations. These are not verified university or immigration data.</p>`:`<p class="rec-note">Only source-approved records from a connected provider feed can appear. No synthetic university data will be substituted.</p>`}</div>`;
  if(state.recommendationStep>=5 && state.recommendationStep<=9) {
    const q=recommendationQuestions[state.recommendationStep-5];
    return `<div class="rec-progress-copy"><span>MY PREFERENCES</span>${explicitDemoMode?`<b>${recommendationCount()} matching demo examples</b>`:""}</div><div class="rec-progress"><span style="width:${Math.round((state.recommendationStep-4)/8*100)}%"></span></div><h2>${q.title}</h2><div class="rec-options">${q.choices.map(([v,l])=>recChoice(q.key,v,l)).join("")}</div><details class="rec-explainer"><summary>Why we ask</summary><p>${q.note}</p></details>`;
  }
  if(state.recommendationStep===10) return `<div class="rec-progress-copy"><span>MY PREFERENCES</span>${explicitDemoMode?`<b>${recommendationCount()} matching demo examples</b>`:""}</div><div class="rec-progress"><span style="width:75%"></span></div><h2>Which study destinations would you consider?</h2><p class="rec-question-note">Choose at least one supported destination. Options are checked against the connected catalogue when you submit.</p><div class="rec-destinations">${DESTINATION_META.map(d=>`<label class="rec-destination"><input type="checkbox" data-rec-destination="${d.country}" ${r.destinations.includes(d.country)?"checked":""}><span>${d.flag} ${d.country}</span></label>`).join("")}</div>`;
  if(state.recommendationStep===11) return `<div class="rec-progress-copy"><span>MY PREFERENCES</span>${explicitDemoMode?`<b>${recommendationCount()} matching demo examples</b>`:""}</div><div class="rec-progress"><span style="width:87.5%"></span></div><h2>What is your estimated annual tuition budget?</h2><p class="rec-question-note">Enter a maximum tuition amount. Comparisons only use approved annual international tuition in the same currency; no exchange rate is guessed.</p><div class="rec-budget-row"><label class="rec-label" for="rec-currency">Currency<select class="rec-input" data-rec-field="budgetCurrency" id="rec-currency">${CURRENCIES.map(c=>`<option ${r.budgetCurrency===c?"selected":""}>${c}</option>`).join("")}</select></label><label class="rec-label" for="rec-budget">Maximum annual tuition<input class="rec-input" id="rec-budget" data-rec-field="budgetAmount" type="number" min="1" step="1" value="${esc(r.budgetAmount)}" placeholder="e.g. 2600000"></label></div><p class="rec-note">If the source has no comparable, verified annual international fee, it will not be scored against your budget.</p>`;
  return `<div class="rec-complete"><div class="rec-complete-icon">✦</div><h2>Ready to check current matches${r.name?`, ${esc(r.name)}`:""}?</h2><p>${explicitDemoMode?`The demo inventory currently has ${recommendationCount()} matching synthetic examples.`:"AsterPath will check the configured feed and show only records with current source evidence."}</p><div class="rec-review-grid"><div><small>Course</small><strong>${esc(r.subject||"Not selected")}</strong></div><div><small>Study level</small><strong>${esc(labelLevel(r.level)||"Not selected")}</strong></div><div><small>Destinations</small><strong>${esc(r.destinations.join(", ")||"Not selected")}</strong></div><div><small>Annual tuition budget</small><strong>${r.budgetAmount?money(r.budgetAmount,r.budgetCurrency):"Not set"}</strong></div><div><small>Work, stay and campus preferences</small><strong>Saved for review; not scored without verified data</strong></div></div><p class="rec-note">Matches are not admission decisions. Source records with expired or incomplete evidence are excluded.</p></div>`;
}
function recommendationDrawer() {
  const intro=state.recommendationStep===0;
  const last=state.recommendationStep===12;
  const back=state.recommendationStep>0;
  return `<div class="rec-overlay" data-action="rec-overlay"><aside class="rec-drawer" role="dialog" aria-modal="true" aria-labelledby="rec-title"><header class="rec-header"><div>${back?`<button class="rec-back-icon" data-action="rec-back" aria-label="Go back">‹</button>`:""}<h1 id="rec-title">Get university recommendations</h1></div><button class="rec-close" data-action="rec-close" aria-label="Close recommendations">×</button></header><main class="rec-body">${recommendationStepBody()}</main><footer class="rec-footer"><button class="rec-primary" data-action="${intro?"rec-next":last?"rec-results":"rec-next"}">${intro?"Let’s get started":last?explicitDemoMode?`See ${recommendationCount()} demo matches`:"Check live matches":"Next"}</button></footer></aside></div>`;
}
function openRecommendationDrawer(){ state.recommendationOpen=true;state.recommendationStep=0;render();document.body.classList.add("rec-open"); }
function closeRecommendationDrawer(){ state.recommendationOpen=false;render();document.body.classList.remove("rec-open"); }
function recommendationNext(){
  const r=state.recommendation;let error="";
  if(state.recommendationStep===1&&!r.name.trim())error="Enter your first name to continue.";
  if(state.recommendationStep===2&&!r.subject)error="Choose a course to continue.";
  if(state.recommendationStep===3&&!r.level)error="Choose a study level to continue.";
  if(state.recommendationStep===10&&!r.destinations.length)error="Choose at least one supported destination.";
  if(state.recommendationStep===11&&!(Number(r.budgetAmount)>0))error="Enter a valid annual tuition budget.";
  if(error){toast(error);return;}
  if(state.recommendationStep<12){state.recommendationStep++;persistRecommendation();render();}
}
function persistRecommendation(){localStorage.setItem(STORE.recommendation,JSON.stringify(state.recommendation));}
async function showLiveRecommendations(profile=state.profile){
  state.recommendationOpen=false;document.body.classList.remove("rec-open");state.results=[];state.resultsError="";state.resultsLoading=true;state.resultsMode="live";state.catalogueMeta=null;state.resultFilter="all";state.resultSort="fit";
  if(new URLSearchParams(location.search).get("demo")==="1"){
    state.results=matchCandidates(profile,DEMO_COURSES);state.resultsMode="demo";state.resultsLoading=false;setView("results");return;
  }
  setView("results");
  const params=new URLSearchParams({subject:profile.subject||"Undecided",level:profile.level||"",destinations:(profile.destinations||[]).join(","),budgetAmount:String(profile.budgetAmount||""),budgetCurrency:profile.budgetCurrency||"KES"});
  try{
    const response=await fetch(`/api/catalogue/recommendations?${params.toString()}`,{headers:{accept:"application/json"},cache:"no-store"});
    const payload=await response.json();
    if(!response.ok){state.catalogueMeta=payload.status||null;throw new Error(payload.message||"The configured university catalogue is unavailable.");}
    state.results=Array.isArray(payload.results)?payload.results:[];state.catalogueMeta={provider:payload.provider,licence:payload.licence,lastFetchedAt:payload.lastFetchedAt,generatedAt:payload.generatedAt,verifiedRecordCount:payload.verifiedRecordCount};
  }catch(error){state.results=[];state.resultsError=error instanceof Error?error.message:"Could not load current university records.";}
  finally{state.resultsLoading=false;render();}
}
function showRecommendationResults(){
  const r=state.recommendation;
  state.profile.subject=r.subject;state.profile.level=r.level;state.profile.destinations=[...r.destinations];
  if(r.budgetAmount){state.profile.budgetAmount=r.budgetAmount;state.profile.budgetCurrency=r.budgetCurrency;}
  eventLog("recommendation_preferences_completed",{level:r.level,subject:r.subject,destinations:r.destinations});showLiveRecommendations(state.profile);
}

function render() {
  persist();
  const views = {
    home:homeView, matcher:matcherView, results:resultsView, ready:readyView, contact:contactView,
    preview:previewView, confirmation:confirmationView, saved:savedView, compare:compareView, admin:adminView
  };
  app.innerHTML = (views[state.view] || homeView)() + (state.recommendationOpen ? recommendationDrawer() : "");
  renderToast();
  if(state.view==="admin" && state.adminTab==="data") loadCatalogueStatus();
}
async function loadCatalogueStatus(){
  const host=document.getElementById("live-catalogue-status");if(!host)return;
  try{
    const response=await fetch("/api/catalogue/status",{headers:{accept:"application/json"},cache:"no-store"});
    const status=await response.json();
    const badge=status.connected?"Connected and checked":status.configured?"Feed configured · records not approved":"Not connected";
    host.innerHTML=`<div class="panel-head"><h3>Official source access</h3><span class="status ${status.connected?"qualified":"notready"}">${esc(badge)}</span></div><div class="metric-grid">${metric("Approved live records",status.totalVerifiedRecords,"Passed evidence and expiry checks")}${metric("Feed provider",status.provider||"Not configured",status.lastFetchedAt?`Checked ${status.lastFetchedAt.slice(0,10)}`:"No live fetch yet")}${metric("Feed status",status.error?"Needs attention":status.connected?"Current":"Unavailable",status.error||"Synthetic records are not used in live results")}${metric("Licence",status.licence?.name||"Not configured","Provider attribution required")}</div>${status.error?`<div class="notice warning">${esc(status.error)}</div>`:""}<div class="table-wrap"><table><thead><tr><th>Destination</th><th>Official discovery / register</th><th>Feed access status</th><th>Approved records</th><th>Coverage notes</th></tr></thead><tbody>${(status.sources||CATALOGUE_SOURCES).map(s=>`<tr><td>${esc(s.country)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a><br><small>${esc(s.access)}</small></td><td>${esc(s.status)}</td><td>${Number(status.byCountry?.[s.country]||0)}</td><td>${esc(s.coverage)}</td></tr>`).join("")}</tbody></table></div><p class="help">A country is considered connected only when a trusted feed supplies approved course, fee, intake and recognition evidence with a valid expiry date. Configure the feed on the server; do not paste API secrets into the browser.</p>`;
  }catch{
    host.innerHTML=`<div class="panel-head"><h3>Official source access</h3><span class="status notready">API unavailable</span></div><div class="notice warning">The local catalogue status endpoint could not be reached. No live recommendations will be shown. Start the app with <code>node server.mjs</code> and check its server configuration.</div><ul>${CATALOGUE_SOURCES.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.country)} · ${esc(s.name)}</a> — ${esc(s.status)}</li>`).join("")}</ul>`;
  }
}
function setView(view) {
  state.view=view;
  state.selectedDetail=null;
  window.scrollTo({top:0,behavior:"instant"});
  render();
}
function validateStep() {
  const p=state.profile;
  if(state.step===0 && !p.funding) return "Choose how your studies will be funded.";
  if(state.step===0 && requiresScholarship(p.funding) && !state.scholarshipAck) return "Please acknowledge the scholarship information before continuing.";
  if(state.step===1 && !p.level) return "Choose a study level.";
  if(state.step===2 && !p.subject) return "Choose a subject.";
  if(state.step===3) {
    if(p.level==="masters" && !p.bachelorTitle.trim()) return "Enter your bachelor’s degree title.";
    if(p.level==="phd" && !p.highestPostgrad.trim()) return "Enter your highest postgraduate qualification.";
    if(p.level==="foundation" && !p.secondaryGrade.trim()) return "Enter your secondary qualification result.";
    if(p.level==="bachelors" && !p.qualificationResult.trim()) return "Enter your qualification result.";
  }
  if(state.step===4 && !p.destinations.length) return "Choose at least one supported destination.";
  if(state.step===6 && !(Number(p.budgetAmount)>0)) return "Enter a valid annual tuition budget.";
  return "";
}
function nextStep() {
  const error=validateStep();
  if(error){toast(error);return;}
  if(state.step<stepNames.length-1){state.step++;render();return;}
  eventLog("matcher_submitted",{level:state.profile.level, funding:state.profile.funding});
  showLiveRecommendations(state.profile);
}
function backStep(){ if(state.step>0){state.step--;render();} }
function toggleSaved(id) {
  state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];
  eventLog(state.saved.includes(id)?"option_saved":"option_unsaved",{courseId:id});
  persist();render();
}
function toggleCompare(id) {
  if(state.compare.includes(id)) state.compare=state.compare.filter(x=>x!==id);
  else if(state.compare.length>=4) toast("Compare up to four options at a time.");
  else state.compare.push(id);
  render();
}
function openAdmin(tab="overview") { state.adminTab=tab;state.selectedLead=null;setView("admin"); }
function updateLead(id, updater) {
  state.leads=state.leads.map(l=>l.id===id?updater({...l}):l);
  persist();render();
}
function exportCSV() {
  const headers=["reference","name","email","phone","residence","funding","level","subject","destinations","budget","currency","status","assigned","createdAt"];
  const rows=state.leads.map(l=>headers.map(h=>h==="destinations"?(l.destinations||[]).join("; "):h==="budget"?l.budgetAmount:l[h]??""));
  const csv=[headers.join(","),...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="asterpath-demo-requests.csv";a.click();URL.revokeObjectURL(url);
}
function submitLead() {
  if(!state.contact.name.trim() || !state.contact.email.trim() || !state.contact.phone.trim() || !state.contact.residence) {toast("Complete your name, email, phone and residence.");return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact.email)){toast("Enter a valid email address.");return;}
  if(!/^\+?[0-9\s()-]{8,20}$/.test(state.contact.phone)){toast("Enter a valid phone number in international format.");return;}
  if(!state.serviceConsent){toast("Service contact consent is required.");return;}
  if(!isFinanciallyReady(state.profile.funding,true)){toast("This funding route is not eligible for a financially ready request.");return;}
  const idempotency=state.reference || makeReference();
  const existing=state.leads.find(l=>l.reference===idempotency);
  if(existing){state.reference=existing.reference;setView("confirmation");return;}
  const lead={
    id:`L-${Date.now().toString().slice(-7)}`,reference:idempotency,name:state.contact.name.trim(),email:state.contact.email.trim(),
    phone:state.contact.phone.trim(),residence:state.contact.residence,preferredChannel:state.contact.preferredChannel,
    funding:state.profile.funding,level:state.profile.level,subject:state.profile.subject,destinations:[...state.profile.destinations],
    budgetAmount:Number(state.profile.budgetAmount),budgetCurrency:state.profile.budgetCurrency,status:"New",assigned:"Unassigned",
    createdAt:new Date().toISOString(),financiallyReady:true,passport:state.profile.passport,demo:true,
    serviceConsent:{accepted:true,noticeVersion:"DEMO-1.0",at:new Date().toISOString()},
    marketingConsent:{accepted:state.marketingConsent,at:state.marketingConsent?new Date().toISOString():null},
    notes:[],history:[{at:new Date().toISOString(),event:"Demo request submitted"}]
  };
  state.leads.unshift(lead);state.reference=idempotency;eventLog("ready_request_submitted",{reference:idempotency});
  persist();setView("confirmation");
}

app.addEventListener("click", e => {
  const recChoice=e.target.closest("[data-rec-choice]");
  if(recChoice){
    state.recommendation[recChoice.dataset.recChoice]=recChoice.dataset.recValue;
    persistRecommendation();render();return;
  }
  const choice=e.target.closest("[data-choice]");
  if(choice) {
    const v=choice.dataset.choice;
    if(state.step===0){state.profile.funding=v;state.scholarshipAck=false;}
    if(state.step===1)state.profile.level=v;
    if(state.step===2)state.profile.subject=v;
    if(state.step===5)state.profile.intakeType=v;
    persist();render();return;
  }
  const nav=e.target.closest("[data-action]");
  if(nav){
    const action=nav.dataset.action;
    // Presentation-only navigation improvement: close the responsive menu after selection.
    nav.closest(".mobile-menu")?.removeAttribute("open");
    if(action==="home")setView("home");
    else if(action==="start"){openRecommendationDrawer();}
    else if(action==="matcher"){state.step=0;setView("matcher");}
    else if(action==="rec-next")recommendationNext();
    else if(action==="rec-back"){if(state.recommendationStep>0){state.recommendationStep--;render();}}
    else if(action==="rec-close"){closeRecommendationDrawer();}
    else if(action==="rec-overlay" && e.target.classList.contains("rec-overlay")){closeRecommendationDrawer();}
    else if(action==="rec-results")showRecommendationResults();
    else if(action==="next")nextStep();
    else if(action==="back")backStep();
    else if(action==="destinations"){
      if(state.view!=="home")setView("home");
      document.getElementById("destinations")?.scrollIntoView({behavior:"smooth"});
    }
    else if(action==="how"){
      if(state.view!=="home")setView("home");
      document.getElementById("how")?.scrollIntoView({behavior:"smooth"});
    }
    else if(action==="admin")openAdmin();
    else if(action==="saved")setView("saved");
    else if(action==="results")setView("results");
    else if(action==="compare-view")setView("compare");
    else if(action==="save")toggleSaved(nav.dataset.id);
    else if(action==="compare")toggleCompare(nav.dataset.id);
    else if(action==="details"){state.selectedDetail=DEMO_COURSES.find(x=>x.id===nav.dataset.id);render();}
    else if(action==="close-detail"||action==="close-modal"){state.selectedDetail=null;render();}
    else if(action==="unsupported"){state.modal="unsupported";renderModal();}
    else if(action==="ready"){state.budgetAccepted=false;setView("ready");}
    else if(action==="back-results")setView("results");
    else if(action==="contact"){if(state.budgetAccepted)setView("contact");}
    else if(action==="back-ready")setView("ready");
    else if(action==="edit-contact")setView("contact");
    else if(action==="submit-request")submitLead();
    else if(action==="export")exportCSV();
    else if(action==="close-lead"){state.selectedLead=null;render();}
    else if(action==="update-status"){
      const id=nav.dataset.id;const lead=state.leads.find(l=>l.id===id);const next=document.getElementById("next-status")?.value;const reason=document.getElementById("status-reason")?.value||"";
      const result=transitionLeadStatus(lead.status,next,reason);
      if(!result.ok){toast(result.error);return;}
      updateLead(id,l=>({...l,status:next,history:[...(l.history||[]),{at:new Date().toISOString(),event:`Status changed from ${lead.status} to ${next}${reason?` · ${reason}`:""}`}]}));
      state.statusReason="";
    }
    else if(action==="assign"){
      const id=nav.dataset.id;const assigned=document.getElementById("assigned")?.value||"Unassigned";
      updateLead(id,l=>({...l,assigned,history:[...(l.history||[]),{at:new Date().toISOString(),event:`Assigned to ${assigned}`}]}));
    }
    else if(action==="add-note"){
      const id=nav.dataset.id;const value=document.getElementById("note-input")?.value.trim();
      if(!value){toast("Enter a note first.");return;}
      updateLead(id,l=>({...l,notes:[...(l.notes||[]),{text:value,author:state.role,at:new Date().toISOString()}],history:[...(l.history||[]),{at:new Date().toISOString(),event:"Counsellor note added"}]}));
    }
  }
  const tab=e.target.closest("[data-admin-tab]");
  if(tab){state.adminTab=tab.dataset.adminTab;state.selectedLead=null;render();return;}
  const row=e.target.closest("[data-open-lead]");
  if(row){state.selectedLead=row.dataset.openLead;render();return;}
});

app.addEventListener("change", e => {
  const el=e.target;
  if(el.dataset.recField){state.recommendation[el.dataset.recField]=el.value;persistRecommendation();}
  if(el.dataset.recDestination){const country=el.dataset.recDestination;state.recommendation.destinations=el.checked?[...new Set([...state.recommendation.destinations,country])]:state.recommendation.destinations.filter(x=>x!==country);persistRecommendation();render();return;}
  if(el.dataset.profile){state.profile[el.dataset.profile]=el.value;persist();}
  if(el.dataset.academic){state.profile[el.dataset.academic]=el.value;persist();}
  if(el.dataset.contact){state.contact[el.dataset.contact]=el.value;}
  if(el.dataset.destination){
    const country=el.dataset.destination;
    state.profile.destinations=el.checked?[...new Set([...state.profile.destinations,country])]:state.profile.destinations.filter(x=>x!==country);
    persist();
  }
  if(el.id==="scholarship-ack"){state.scholarshipAck=el.checked;}
  if(el.id==="budget-accept"){state.budgetAccepted=el.checked;render();}
  if(el.id==="service-consent")state.serviceConsent=el.checked;
  if(el.id==="marketing-consent")state.marketingConsent=el.checked;
  if(el.id==="resultFilter"){state.resultFilter=el.value;render();}
  if(el.id==="resultSort"){state.resultSort=el.value;render();}
  if(el.id==="lead-status-filter"){state.leadStatusFilter=el.value;render();}
  if(el.id==="role-select"){state.role=el.value;render();}
});
app.addEventListener("input", e => {
  const el=e.target;
  if(el.dataset.recField){state.recommendation[el.dataset.recField]=el.value;persistRecommendation();}
  if(el.id==="rec-subject-search"){
    const query=el.value.trim().toLowerCase();
    document.querySelectorAll(".rec-subject").forEach(node=>{node.hidden=!node.textContent.toLowerCase().includes(query);});
  }
  if(el.dataset.profile){state.profile[el.dataset.profile]=el.value;persist();}
  if(el.dataset.academic){state.profile[el.dataset.academic]=el.value;persist();}
  if(el.dataset.contact){state.contact[el.dataset.contact]=el.value;}
  if(el.id==="lead-search"){state.leadSearch=el.value;const pos=el.selectionStart;render();const next=document.getElementById("lead-search");next?.focus();next?.setSelectionRange(pos,pos);}
  if(el.id==="status-reason")state.statusReason=el.value;
  if(el.id==="note-input")state.noteDraft=el.value;
});
app.addEventListener("submit", e => {
  if(e.target.id==="contact-form"){e.preventDefault();setView("preview");}
});
document.addEventListener("keydown", e => {
  if(e.key==="Escape" && state.recommendationOpen) closeRecommendationDrawer();
});
function renderModal(){
  const old=document.getElementById("modal-host");old?.remove();
  const host=document.createElement("div");host.id="modal-host";
  host.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="eyebrow">Unsupported destination</div><h2>That destination is not currently supported.</h2><p>We currently support Spain, Ireland, the United Kingdom, Germany, Hungary and the Netherlands. ${esc(state.unsupportedCountry||"Other destinations")} is not in the active inventory.</p><div class="notice">You can request optional administrator review. This does not promise that matching universities or verified tuition will be available.</div><div class="field" style="margin-top:15px"><label for="unsupported-country">Destination</label><select id="unsupported-country"><option>United States</option><option>Canada</option><option>Australia</option><option>Other</option></select></div><div style="display:flex;justify-content:flex-end;gap:9px;margin-top:18px"><button class="btn btn-secondary" id="modal-close">Return to supported countries</button><button class="btn btn-primary" id="modal-review">Request manual review</button></div></section></div>`;
  document.body.append(host);
  host.querySelector("#modal-close").onclick=()=>host.remove();
  host.querySelector("#modal-review").onclick=()=>{state.unsupportedCountry=host.querySelector("#unsupported-country").value;host.remove();toast(`Manual review noted for ${state.unsupportedCountry}. No options are promised.`);eventLog("unsupported_destination_review_requested",{country:state.unsupportedCountry});};
}
function boot(){
  if(state.view==="matcher")state.step=0;
  render();
}
boot();
