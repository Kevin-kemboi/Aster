# Live university catalogue setup

## Current state

The package does not currently have an institutional data agreement, licensed aggregator feed, API credentials, or approved records. It therefore returns **no live recommendations by default**. The 12 local sample courses are shown only when the URL explicitly includes `?demo=1`; they are synthetic and must not be presented as real universities.

The application can consume one HTTPS JSON feed that your organisation or approved data provider operates. It does not scrape official portals. Several national portals are search products or registries, and their existence does not grant API access or permission to automate downloads.

## Official source routes to arrange

| Country | Source to start with | Access / coverage caveat |
|---|---|---|
| United Kingdom | HESA Discover Uni dataset | Public CSV/XML ZIP, updated weekly as required and licensed CC BY 4.0. Coverage focuses on comparable full-time and part-time undergraduate course information; use university pages for live tuition, application dates, and entry rules. |
| Ireland | QQI Irish Register of Qualifications / data.gov.ie | The register covers qualifications, programmes and quality-assured providers. Obtain resource-level licence details. Study visa eligibility is checked separately against current Irish Immigration Service Delivery lists. |
| Germany | Hochschulkompass (HRK) | Programme search uses data from state and state-recognised institutions. Ask HRK for approved machine-readable access; confirm reuse terms. |
| Spain | RUCT and QEDU / SIIU | RUCT is the official degree and institution register; QEDU supports discovery. Neither should be treated as a current fee, intake, or application-deadline feed. Ask the ministry about machine-readable access, and verify course details with institutions. |
| Netherlands | Study in NL / Studyfinder | English-taught programme discovery. Studiekeuze123 describes professional REST/OData access under its product terms; request access and confirm data scope/licence. |
| Hungary | Tempus Public Foundation Study Finder | Public programme discovery portal. Request an approved feed and reuse terms from Tempus; verify requirements, tuition and intakes with each institution. |

For all countries, immigration/work permissions must be supplied by separately approved government sources and reviewed on their own validity schedule. A study programme is not a promise of a work permit, post-study permit, or permanent residence.

## Feed environment variables

Copy `.env.example` to `.env` beside `server.mjs`, then set these values there (or in the server environment). Keep `.env` private and out of version control:

```text
ASTERPATH_CATALOGUE_FEED_URL=https://your-approved-provider.example/asterpath/catalogue.json
ASTERPATH_CATALOGUE_FEED_TOKEN=your-secret-token
ASTERPATH_CATALOGUE_FEED_HOSTS=your-approved-provider.example
CATALOGUE_REFRESH_MS=900000
```

`ASTERPATH_CATALOGUE_FEED_HOSTS` is required and must include the exact approved provider hostname. This allowlist prevents accidental connections to unrelated or private network hosts. `ASTERPATH_CATALOGUE_FEED_TOKEN` is optional only when the provider intentionally exposes a public HTTPS feed. The server fetches the feed at most once every 15 minutes by default. It rejects non-HTTPS feed URLs, unapproved hosts, redirects, non-JSON responses, responses above 20 MB, stale feed manifests (older than 48 hours), duplicate record IDs, unsupported countries/currencies, expired evidence, missing source URLs, and records that are not approved and source-verified.

The feed top level must include:

```json
{
  "provider": "Approved data provider name",
  "generatedAt": "2026-11-11T00:00:00Z",
  "licence": {
    "name": "Licence name",
    "url": "https://provider.example/licence"
  },
  "records": []
}
```

Each record must provide these fields:

- `id`, `sourceRecordId`, `provider`, `institution`, `course`, `country`, `city`, `level`, `subject`, `duration`, `intake`, `academicYear`
- `status: "active"`, `intakeOpen: true`, `catalogueStatus: "verified"`, `reviewStatus: "approved"`, `officialRecognitionStatus: "verified"`
- `tuitionAmount`, `tuitionCurrency`, `tuitionPeriod: "annual"`, `feeType: "international"`, `tuitionVerified: true`
- `courseUrl`, `institutionUrl`, `feeSourceUrl`, `recognitionSourceUrl` using HTTPS
- `lastVerifiedAt`, `validUntil`, `reviewedBy`, `licence`, and `sourceAttribution`

The feed publisher must ensure the source evidence actually supports the record. The app checks the required fields and expiry; it cannot independently certify the provider’s underlying research. The review process should retain evidence and audit history outside the recommendation UI.

Example record shape (illustrative placeholders, not a real course):

```json
{
  "id": "provider-record-id",
  "sourceRecordId": "official-source-id",
  "provider": "Approved data provider name",
  "institution": "Verified institution name",
  "course": "Verified programme name",
  "country": "Ireland",
  "city": "Dublin",
  "level": "masters",
  "subject": "Computer Science & IT",
  "duration": "2 years",
  "intake": "September 2027",
  "intakeOpen": true,
  "status": "active",
  "academicYear": "2027/28",
  "tuitionAmount": 12000,
  "tuitionCurrency": "EUR",
  "tuitionPeriod": "annual",
  "feeType": "international",
  "tuitionVerified": true,
  "catalogueStatus": "verified",
  "reviewStatus": "approved",
  "officialRecognitionStatus": "verified",
  "courseUrl": "https://institution.example/course",
  "institutionUrl": "https://institution.example/",
  "feeSourceUrl": "https://institution.example/course/fees",
  "recognitionSourceUrl": "https://official-register.example/record",
  "lastVerifiedAt": "2026-11-11T00:00:00Z",
  "validUntil": "2027-06-30T23:59:59Z",
  "reviewedBy": "Data reviewer ID",
  "licence": "Provider data licence",
  "sourceAttribution": "Source and licence attribution"
}
```

The example is only a schema illustration. Do not copy its sample fee or institution into the live feed.

## Matching behavior

Live results require an approved, unexpired record; a supported destination; exact course level; compatible subject (unless the student selects “Undecided”); selected destination; and an open intake. Results are not admissions decisions. Academic grades are not used to infer admission probability. Work, post-study, residence, accommodation and campus preferences remain visible as saved preferences but are not scored until an approved feed provides current, comparable evidence for them.

Budget ranking compares only verified annual international tuition in the same currency. The app does not estimate exchange rates. Records with missing, expired, or unapproved evidence are excluded from live results.

## Local verification

1. Start the server with `npm start`.
2. Open `/api/catalogue/status` to inspect connection state and country counts.
3. Open the recommendation flow and complete the questions. With no feed configured, the app must show an unavailable message and no synthetic result cards.
4. Use `?demo=1` only to inspect the clearly labelled synthetic preview.
5. Re-run `npm test` after any feed-adapter or scoring change.
