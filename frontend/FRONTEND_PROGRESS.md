# Frontend progress

**Branch:** `frontend`, based on `origin/main`. Demo baseline `d565311`, first handoff `c8c5320`. The integration milestone consumes backend `21e766c`; see `git log -3 --oneline` for the current frontend commits.

## Tunnel handoff

- Backend `a95b39b` confirmed the OpenAPI ledger operation. The temporary tunnel passed health, login preflight, checkpoint retrieval, and unauthenticated error checks. The live proof check is blocked until a complete Ed25519 SPKI public key is obtained. The [integration test report](INTEGRATION_TEST_REPORT.md) lists observed statuses and manual checks.
- Final tunnel-session results: build passed, Vitest 17/17, Playwright 23 passed and 1 skipped. The real login automation was replaced by public-only checks and manual role testing.

## Frontend-only hardening pass (based on `41ee9db`)

| Priority | Finding | Resolution |
| --- | --- | --- |
| P0 | Receipt-links accepted arbitrary origins and loose `/verify` suffixes; manual receipts entered browser history. | One bounded parser checks origin, exact route, query shape, credentials and scheme. Manually entered or scanned receipts stay in memory. Initial shared deep links remain capability URLs. |
| P0 | Stale verification and session responses could confuse retry or expiry; QR decoding could leave a busy indicator. | Attempts own cancellable requests, QR work is cancelable and tied to the navigation entry, and session expiry targets only the session that initiated the request. |
| P1 | Evidence stages and technical trust assumptions were hard to inspect. | Added expandable inspector, human explanations, verified-only metadata, and explicit unavailable stages. Invalid evidence does not render result marks. |
| P1 | Mobile staff navigation was a horizontal strip; dialogs and errors lacked explicit focus/description handling. | Added a keyboard-friendly mobile menu, Escape and focus restoration, associated field errors, and keyboard-focusable overflow tables. Demo publication and proposal insertion now also guard against duplicates in the workspace state. |
| P1 | The tamper demo covered only one mismatch. | Added matched, exam mismatch, and missing-evidence scenarios, plainly labeled as fixtures. |
| P2 | Staff workflow code was eager; route render errors could blank the app. | Deferred staff workflow bundles and added a route-level recovery view. Entry bundle fell from ~463.81 kB to ~433.53 kB minified (147.27 to 136.56 kB gzip). This is a build measurement, not a page-speed benchmark. |

Baseline: build passed, Vitest 6/6, frontend-only Chrome 13/13, `npm audit` reported zero known issues. Final: strict TypeScript + Vite build passed, Vitest 17/17, Chrome 17/17 (real API smoke excluded). An intermediate Chrome run had two strict-locator failures because accessible status text duplicated substrings; exact labels preserved the original assertions and the final run passed. The build still produces nonblocking Zod annotation warnings. There is no standalone lint script. Tested widths: 360, 390, 768, 1024 and 1440 px. One-page A4 output and sample QR decoding were verified in Chrome.

No backend was started or called in this pass. The section below records the **previous** authorized integration session. Current checks use synthetic data and browser-intercepted fixture responses only.

## Prior integration milestone (`41ee9db`)

- **Live:** Login and role-aware pages, in-memory bearer expiry/logout, roster/exam/result reads, publication and version history, evidence-checked React marksheet, receipt QR/URL/image verification, correction proposals and two detached signatures, cursor-based ledger and integrity audit reports.
- **Demo:** Synthetic fixture views, standalone A4 marksheet and fixed 85 → 95 field comparison remain available with mock mode enabled.
- **Checks:** Build passed (existing Zod annotation warnings), Vitest 6 passed, Chrome Playwright 14 passed. Playwright included four backend signed vectors, displayed-result mismatch, 401 expiry/no browser token storage, and a real HTTP/Express/PostgreSQL smoke test covering publication, student marksheet/verification, both distinct approvers, historical verification and auditor report. Backend test database was freshly seeded in a detached temporary worktree.
- **Remaining:** Obtain the target institution's out-of-band public key for its deployment. Live audit smoke covered a clean report; direct database modification was not exercised by the frontend suite. Physical printing/phone scan, cross-browser assistive technology checks, and external witness operation remain untested. CSV import, rejection, registration, password reset, and refresh are not available in this contract. No embedded camera reader; QR image upload works.
