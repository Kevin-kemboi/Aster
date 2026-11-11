# Architecture decision record — preview baseline

## Decision
Use a single Node.js static server and browser-native ES modules for the first clickable preview. Keep matching rules in a small pure module, fixtures separate from UI, and the initial PostgreSQL model in SQL.

## Why
The supplied specification prioritises a simple, low-cost managed architecture and warns against premature microservices, Kubernetes, search clusters and separate warehouses. A no-dependency preview makes the core journey testable immediately without pretending that external credentials, verified inventory or legal approvals are already available.

## Current boundary
- Browser UI: `index.html`, `styles.css`, `src/app.mjs`
- Domain rules: `src/core.mjs`
- Synthetic fixture data: `src/demo-data.mjs`
- Local server: `server.mjs`
- PostgreSQL model draft: `database/schema.sql`
- Automated domain tests: `tests/core.test.mjs`

## Production target
A React/Next.js web client, typed Node API, managed PostgreSQL, managed object storage and transactional email provider remain the recommended production direction. Add those only after the preview flows and data governance are approved.

## Security and data posture
The current browser queue uses local storage and is not secure for personal or production data. The staff workspace is a visual workflow preview, not an authenticated admin product. Production requires MFA, secure sessions, server-side role authorization, rate limiting, audit events, consent records, data retention controls, privacy review and security testing.
