# Build status ledger

| Area | Status | Evidence | Next action |
|---|---|---|---|
| Brand and responsive landing | Done for demo | `index.html`, `styles.css` | External trademark/domain screening |
| Student matcher journey | Done for demo | `src/app.mjs` | Add production API and persistence |
| Funding and scholarship gate | Done for demo | `src/core.mjs`, UI acknowledgement | Verify with product/legal review |
| Matching and demo results | Done for demo | `src/core.mjs`, `src/demo-data.mjs` | Load verified institution inventory |
| Saved and comparison views | Done for demo | Browser local storage | Add account-backed sync if required |
| Ready request and consent | Done for demo | Contact, preview and confirmation views | Implement consent service and server idempotency |
| Staff queue and operations | Done for demo | Admin workspace UI | Authentication, MFA and RBAC enforcement |
| Data administration | In progress | Empty verified inventory state | Source registry and review workflow |
| PostgreSQL foundation | Drafted | `database/schema.sql` | Review and implement migrations |
| Tests | Done for core rules | `tests/core.test.mjs` | Add browser/E2E/accessibility/security tests |
| Deployment | Blocked | Local Node server only | Select managed hosting and provision credentials |
| Verified data, FX, email | Blocked | Explicit unavailable states | Approve sources and connect providers |
