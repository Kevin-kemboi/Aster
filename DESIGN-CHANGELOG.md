# AsterPath Premium UI/UX refresh

This is the original AsterPath MVP updated for a premium, coherent local UI/UX experience. **The demo remains non-production.**

## Presentation improvements

- Added `premium.css` as a separate, override-only design system using editorial typography, warm-paper backgrounds, Bauhaus-inspired geometry, navy, cobalt, yellow and coral.
- Rebuilt the visual treatment of the landing page hero, study-plan illustration, destination cards, steps and conversion section.
- Improved global navigation appearance and added an accessible mobile menu.
- Added a small navigation-only correction so **Destinations** and **How it works** are reachable from another screen.
- Styled the nine-step matching wizard, fields, choice cards, progress indicators and validation notices.
- Polished results, university details, saved options, comparisons and counsellor request screens.
- Updated the staff workspace with a new sidebar, summary metric design, clean tables, status styles and clearer information hierarchy.
- Added dedicated desktop/mobile responsiveness, keyboard focus states and reduced-motion support.
- Replaced old static preview screenshots with new premium preview screenshots.
- Updated the Windows launcher to execute Node directly, avoiding PowerShell npm execution-policy problems.

## Intentionally unchanged

- `src/core.mjs`: matching, funding qualification, scoring, budget handling and status transitions.
- `src/demo-data.mjs`: synthetic course and lead data.
- `server.mjs`: local server and demo health endpoint.
- `tests/core.test.mjs`: core regression tests.
- Existing browser-based storage keys, demo submission and source/freshness disclosures.

No new backend, university data source, authentication, verified currency conversion or real application processing has been introduced.

## Validation

- Six built-in Node logic tests passed.
- Browser presentation checks passed for home (desktop/mobile), wizard, results and administrative dashboard, with no script errors or horizontal overflow in checked viewports.
- Mobile menu and core form progression were exercised, and saved-option interaction was checked in the results screen.

## Restrictions

External operational services and production infrastructure remain unimplemented. This is a locally runnable demonstration package, not a deployed service.
# Student experience redesign

The main student-facing experience has been rebuilt with React and Vite around a focused study-planning journey. The visual direction uses editorial typography, forest green and soft lime accents, full-bleed destination photography, and a consistent Lucide icon set. It removes emoji and decorative Unicode symbols from navigation and calls to action.

The page structure now moves from an image-led introduction to destination selection, a three-step explanation, source standards, and a direct planning call to action. The planner asks only for subject, study level, destinations, and annual tuition budget before showing a review step. Result cards show evidence links and record dates, while an unconnected feed produces a clear unavailable state. The existing staff workspace remains available at `/?screen=admin`.

The React interface uses responsive layouts and reduced-motion support. Photos are served from Unsplash image URLs. Font loading uses Manrope and DM Sans with local system fallbacks. The compiled frontend is included in `dist/`; editing the source requires `npm install` and `npm run build`.

Verification performed: production build completed; all seven existing logic tests passed; local API smoke check returned the built homepage and bundle successfully and confirmed no feed means zero live records and zero recommendations.

