# AsterPath — Student Journey Preview

A React study-abroad discovery experience with a separate existing staff workspace and an optional verified-catalogue integration. Live recommendations are disabled until an approved provider feed is configured. Synthetic records appear only when the URL explicitly includes `?demo=1`.

## Run locally

Requires Node.js 20 or later. The ZIP includes the compiled frontend, so previewing it requires no npm install. On Windows, extract the ZIP and double-click `run-windows.bat`. To modify the React source and rebuild, run `npm install` followed by `npm run build`.

```bash
npm start
```

Open **http://localhost:4173**. You can also run `node server.mjs` directly in PowerShell, CMD, Terminal or a shell. See `START-HERE.txt` for quick instructions.

Run the built-in logic tests:

```bash
npm test
```

## Recommendation data modes

- **Live mode (default):** the server fetches the configured HTTPS JSON provider feed, validates provider freshness and record-level evidence, then returns only approved, current records. No feed is included in this ZIP, so live recommendations will correctly remain unavailable until you arrange approved provider access and configure it. See [docs/LIVE-DATA-SETUP.md](docs/LIVE-DATA-SETUP.md).
- **Demo mode:** add `?demo=1` to the URL to see synthetic example records. They are labelled as synthetic and are never used as fallback recommendations.
- The source portals listed in the data setup guide are not themselves connected APIs. Access, usage rights, and source coverage must be confirmed with each provider. The live-feed publisher remains responsible for validating that each cited record is accurately supported by source evidence.

## What is implemented in this preview

### Student experience
- A redesigned React student journey with destination photography, a restrained editorial type system, a mobile-first layout and a consistent Lucide icon set.
- A focused five-step study plan for subject, study level, destinations and annual tuition budget, followed by a review step.
- Source-aware live results with course, fee and recognition evidence, freshness dates, a destination filter, sorting and a local saved-options list.
- A truthful empty state when there is no verified feed. Synthetic fixtures appear only in explicit `?demo=1` mode and are labelled as examples.
- Six supported destinations: Spain, Ireland, United Kingdom, Germany, Hungary and the Netherlands.

### Staff experience
- The existing demo staff workspace and its request queue remain available at `/?screen=admin`.
- Search, status filter, request detail, assignment, status transitions, close/reopen reason, timestamped notes, activity history, CSV export, data inventory, reports and configuration views remain in that workspace.
- It is a local demonstration, not a secured staff system.

### Foundation artifacts
- Matching logic and funding qualification rules in `src/core.mjs`.
- React frontend in `src/main.jsx`, built with Vite; iconography uses Lucide React.
- Synthetic inventory and sample lead fixtures in `src/demo-data.mjs`.
- Draft PostgreSQL schema in `database/schema.sql`.
- Node built-in tests in `tests/core.test.mjs`.
- Local server and validated live-feed API in `server.mjs` (`/api/catalogue/status` and `/api/catalogue/recommendations`).

## Important preview limitations

This is a **front-end and local-demo MVP**, not a production launch.

- The included institution/course/tuition fixtures are synthetic. They are not represented as real universities, real fees or verified intakes. Do not use demo mode for decisions.
- The new focused study-plan flow does not ask for immigration, accommodation or campus-style preferences because there is no verified comparable dataset for those criteria.
- No university feed, FX rate service, email provider, managed database, authentication service or counsellor notification service is configured in the included ZIP. This project is prepared to consume a normalized provider feed but is not itself a live university database.
- Browser local storage is used for the demo queue, saved options and draft progress. Data is not shared across devices or browsers.
- The staff workspace has no real sign-in, MFA or server-side role enforcement. The role selector only previews the interface.
- No live admission eligibility decision, application submission, payment, visa advice, accommodation booking or scholarship service is provided.
- The response window is deliberately shown as **not configured**.
- The brand name AsterPath is a working name and has not been trademark or domain screened.

Use fictional contact details when testing. Do not enter sensitive or real student information into this preview.

## Production blockers before launch

1. Implement managed PostgreSQL migrations, transactional lead creation and server-side idempotency.
2. Add staff authentication, MFA, secure sessions, role-based authorization, rate limiting, CSRF/XSS protections and audit logging.
3. Connect approved official institution/course/fee/intake/requirement sources; require provenance, freshness checks and admin approval.
4. Add dated, approved FX rates before cross-currency budget comparison.
5. Implement counsellor assignment rules, configured response SLAs and transactional notifications.
6. Complete privacy, retention, consent, accessibility, security, backup/restore, monitoring and load testing.
7. Deploy preview/staging/production environments and run end-to-end acceptance tests.

See `database/schema.sql` for the initial data model direction. It is a draft and requires engineering/security review before use. Current feed setup requirements and source caveats are in [docs/LIVE-DATA-SETUP.md](docs/LIVE-DATA-SETUP.md).

## UI/UX redesign notes

See [`DESIGN-CHANGELOG.md`](DESIGN-CHANGELOG.md) for design updates, preserved business rules and verification details. New screenshots are stored in `previews/*.png`.
"# Aster" 
