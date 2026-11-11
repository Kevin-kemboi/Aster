# Target monorepo map

```text
apps/
  web/       Student-facing React/Next.js experience (preview currently at repo root)
  admin/     Staff workspace (preview currently integrated into the same UI)
  api/       Typed Node API (BLOCKED pending managed database and production credentials)
packages/
  ui/        Shared design system (currently root styles.css)
  contracts/ Shared TypeScript contracts
  config/    Shared destinations, currencies, weights and feature flags
  testing/   Shared test fixtures and browser test utilities
database/
  schema.sql PostgreSQL foundation schema draft
src/
  app.mjs    Runnable zero-dependency preview
  core.mjs   Matching and qualification rules
  demo-data.mjs Synthetic-only fixtures
```

The preview keeps the first deliverable runnable without external dependencies. The intended production architecture remains a React/Next.js frontend, typed Node API, managed PostgreSQL, managed object storage and transactional email provider. The API/database/authentication integrations remain explicitly blocked rather than simulated as production services.
