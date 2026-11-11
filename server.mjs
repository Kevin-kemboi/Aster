import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE_SOURCES } from "./src/catalogue-sources.mjs";
import { matchVerifiedCandidates, SUPPORTED_DESTINATIONS, CURRENCIES } from "./src/core.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = existsSync(path.join(root,"dist")) ? path.join(root,"dist") : root;
// Node 20.6+ supports this built-in loader, so no dotenv dependency is needed.
if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(path.join(root, ".env")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
const port = Number(process.env.PORT || 4173);
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };
const refreshMs = Math.max(60_000, Number(process.env.CATALOGUE_REFRESH_MS || 900_000));
const cache = { loadedAt:0, generatedAt:null, provider:null, licence:null, records:[], error:null };

const json = (res, status, value) => {
  res.writeHead(status, { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" });
  res.end(JSON.stringify(value));
};
const httpsUrl = value => {
  try { const u=new URL(value); return u.protocol==="https:"; } catch { return false; }
};
const hasString = (x,min=1,max=500) => typeof x==="string" && x.trim().length>=min && x.trim().length<=max;
function validateRecord(x, now = new Date()) {
  if (!x || typeof x!=="object") return false;
  const requiredStrings=["id","institution","course","country","city","level","subject","duration","intake","academicYear","provider","sourceRecordId","reviewedBy"];
  if (requiredStrings.some(k=>!hasString(x[k]))) return false;
  if (!SUPPORTED_DESTINATIONS.includes(x.country) || !["foundation","bachelors","masters","phd"].includes(x.level)) return false;
  if (!["Computer Science & IT","Business & Management","Engineering","Health & Life Sciences","Arts & Social Sciences","Education","Law","Undecided"].includes(x.subject)) return false;
  if (x.status!=="active" || x.intakeOpen!==true || x.reviewStatus!=="approved" || x.catalogueStatus!=="verified" || x.officialRecognitionStatus!=="verified") return false;
  if (x.tuitionPeriod!=="annual" || x.feeType!=="international" || x.tuitionVerified!==true) return false;
  if (!Number.isFinite(Number(x.tuitionAmount)) || Number(x.tuitionAmount)<=0 || !CURRENCIES.includes(x.tuitionCurrency)) return false;
  if (!["courseUrl","institutionUrl","feeSourceUrl","recognitionSourceUrl"].every(k=>httpsUrl(x[k]))) return false;
  const verified=Date.parse(x.lastVerifiedAt), expires=Date.parse(x.validUntil), current=now.getTime();
  if (!Number.isFinite(verified) || verified>current || !Number.isFinite(expires) || expires<=current) return false;
  if (expires-verified>366*24*60*60*1000) return false;
  if (!hasString(x.sourceAttribution,3,1000) || !hasString(x.licence,3,300)) return false;
  return true;
}
function catalogueStatus() {
  const configured=Boolean(process.env.ASTERPATH_CATALOGUE_FEED_URL);
  return {
    mode:cache.records.length?"live":"unavailable",
    configured,
    connected:cache.records.length>0,
    provider:cache.provider,
    licence:cache.licence,
    generatedAt:cache.generatedAt,
    lastFetchedAt:cache.loadedAt?new Date(cache.loadedAt).toISOString():null,
    totalVerifiedRecords:cache.records.length,
    byCountry:Object.fromEntries(SUPPORTED_DESTINATIONS.map(c=>[c,cache.records.filter(x=>x.country===c).length])),
    error:cache.error,
    sources:CATALOGUE_SOURCES
  };
}
async function refreshCatalogue(force=false) {
  const feedUrl=process.env.ASTERPATH_CATALOGUE_FEED_URL;
  if (!feedUrl) { cache.error=null;cache.records=[];return false; }
  if (!httpsUrl(feedUrl)) { cache.records=[];cache.error="Catalogue feed URL must use HTTPS.";return false; }
  const allowedHosts=(process.env.ASTERPATH_CATALOGUE_FEED_HOSTS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const feedHost=new URL(feedUrl).hostname.toLowerCase();
  if (!allowedHosts.length || !allowedHosts.includes(feedHost)) { cache.records=[];cache.error="Feed host is not allowlisted. Set ASTERPATH_CATALOGUE_FEED_HOSTS to the approved provider hostname.";return false; }
  if (!force && cache.loadedAt && Date.now()-cache.loadedAt<refreshMs) return cache.records.length>0;
  try {
    const headers={"accept":"application/json"};
    if(process.env.ASTERPATH_CATALOGUE_FEED_TOKEN) headers.authorization=`Bearer ${process.env.ASTERPATH_CATALOGUE_FEED_TOKEN}`;
    const response=await fetch(feedUrl,{headers,signal:AbortSignal.timeout(12_000),redirect:"error"});
    if(!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
    if(!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("Provider response must use application/json.");
    const declaredSize=Number(response.headers.get("content-length")||0);
    if(declaredSize>20*1024*1024) throw new Error("Provider feed exceeds the 20 MB safety limit.");
    const raw=await response.text();
    if(raw.length>20*1024*1024) throw new Error("Provider feed exceeds the 20 MB safety limit.");
    const payload=JSON.parse(raw);
    const generated=Date.parse(payload?.generatedAt);
    if(!hasString(payload?.provider,2,200) || !hasString(payload?.licence?.name,2,300) || !httpsUrl(payload?.licence?.url) || !Number.isFinite(generated) || generated>Date.now() || Date.now()-generated>48*60*60*1000 || !Array.isArray(payload.records)) {
      throw new Error("Feed metadata is incomplete or older than 48 hours.");
    }
    const valid=payload.records.filter(x=>validateRecord(x));
    const ids=new Set();
    const unique=valid.filter(x=>{if(ids.has(x.id))return false;ids.add(x.id);return true;});
    cache.records=unique;cache.generatedAt=new Date(generated).toISOString();cache.provider=payload.provider;cache.licence=payload.licence;cache.loadedAt=Date.now();
    cache.error=unique.length?null:"Feed fetched, but it contained no records that passed source, freshness and review checks.";
    return unique.length>0;
  } catch(error) {
    cache.records=[];cache.provider=null;cache.licence=null;cache.generatedAt=null;cache.loadedAt=Date.now();
    cache.error=error instanceof Error?error.message:"Catalogue feed could not be read.";
    return false;
  }
}
function studentFromQuery(url) {
  return {
    subject:url.searchParams.get("subject")||"Undecided",
    level:url.searchParams.get("level")||"",
    destinations:(url.searchParams.get("destinations")||"").split(",").map(x=>x.trim()).filter(x=>SUPPORTED_DESTINATIONS.includes(x)),
    budgetAmount:Number(url.searchParams.get("budgetAmount")||0),
    budgetCurrency:url.searchParams.get("budgetCurrency")||"KES",
    intakeType:"next"
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") {
    json(res,200,{ok:true,mode:"live-catalogue-required",persistence:"browser-local-storage-for-preferences",productionReady:false});return;
  }
  if (url.pathname === "/api/catalogue/status") {
    await refreshCatalogue();json(res,200,catalogueStatus());return;
  }
  if (url.pathname === "/api/catalogue/recommendations") {
    await refreshCatalogue();
    if (!cache.records.length) { json(res,503,{error:"live_catalogue_unavailable",message:"No current, approved university feed is connected. Synthetic demo records are not used in live recommendations.",status:catalogueStatus()});return; }
    const student=studentFromQuery(url);
    if(!student.level || !student.destinations.length || !(student.budgetAmount>0) || !CURRENCIES.includes(student.budgetCurrency)) { json(res,400,{error:"invalid_preferences",message:"Choose a study level, destination and positive annual budget using a supported currency."});return; }
    const results=matchVerifiedCandidates(student,cache.records);
    json(res,200,{mode:"live",generatedAt:cache.generatedAt,lastFetchedAt:new Date(cache.loadedAt).toISOString(),provider:cache.provider,licence:cache.licence,verifiedRecordCount:cache.records.length,results});return;
  }
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const resolved = path.resolve(staticRoot, `.${pathname}`);
  if (!resolved.startsWith(staticRoot + path.sep) && resolved !== staticRoot) { res.writeHead(403);res.end("Forbidden");return; }
  try {
    const info = await stat(resolved);if(!info.isFile())throw new Error("Not a file");
    const body=await readFile(resolved);res.writeHead(200,{"content-type":types[path.extname(resolved)]||"application/octet-stream","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(body);
  } catch { res.writeHead(404,{"content-type":"text/plain; charset=utf-8"});res.end("Not found"); }
});
server.listen(port,()=>console.log(`AsterPath running at http://localhost:${port}; live catalogue: ${process.env.ASTERPATH_CATALOGUE_FEED_URL?"configured":"not connected"}`));
