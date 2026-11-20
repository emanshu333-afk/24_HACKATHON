# Operational handoff

## Current state
Full backend suite: 104 passed, 0 failed, 0 skipped (31 baseline + 73 new). Three real SQL audit blind spots reproduced then fixed. Shared browser WebCrypto verifier and TypeScript frontend contract added. Safe disposable six-journey demo works. `npm audit`: 0 vulnerabilities. Prisma validate/migrate status OK.

Branch: `backend/h8-core`. All work local; no push authorized. Frontend branch `frontend` untouched.

## Read first
AGENTS.md, docs/PROGRESS.md, then this file. Do not infer completion from code existence; trust test results.

## Environment
Windows, PostgreSQL 18 binaries at C:/Program Files/PostgreSQL/18/bin, Node 24. Isolated cluster on 127.0.0.1:55432 (not the existing system service). `.env` and `.local/` are Git-ignored and contain dev keys/credentials.

## Commands
`npm run dev:setup` (if DB stopped), `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm test`, `npm start`.
Demo: `npm run demo -- --export-fixtures` (disposable schema, never mutates dev data).
Credentials: `.local/demo-credentials.json` — never print or commit.

## Files recently changed
docs/BACKEND_STRUCTURE.md, SYSTEM_ARCHITECTURE_FOR_FRONTEND.md, FRONTEND_INTEGRATION_PACKET.md, TEST_REPORT.md, SECURITY_AUDIT_REPORT.md, DEMO_RUNBOOK.md, PROGRESS.md, HANDOFF.md, shared/canonical.js, shared/browser-verifier.js, docs/frontend-contract/api.types.ts, src/service.js, src/crypto.js, src/auth.js, src/app.js, src/config.js, src/server.js, src/validation.js, scripts/lib/disposable.js, scripts/lib/judge-workflow.js, scripts/judge-demo.js, scripts/check-witness.js, scripts/attack-demo.js, test/security.test.js, test/audit-regressions.test.js, test/browser-verifier.test.js, docs/API.md, docs/openapi.json.

## Decisions not to reverse without justification
- Full-chain genesis proof; exact domain-separated verimark-v1 bytes.
- Global transaction advisory lock for all writes.
- Externally pinned institution trust root; approver certificates outside DB.
- No hidden self-trust in DB validity flags.
- Do not change proof format or routes without explicit version coordination.

## Exact next step
Commit remaining docs and code on backend/h8-core. Then coordinate frontend integration using docs/API.md + docs/FRONTEND_INTEGRATION_PACKET.md. Optionally configure a real external checkpoint channel with permission. Do not push without approval.

## Known failures
None in automated suite.

## Limitations
No browser UI test harness, no remote witness, no production custody/TLS, no physical QR test. User action later: choose independently controlled checkpoint channel and reachable API deployment; permission required before any Git push.

## Commits
e1ea24b foundation, f070c83 HTTP/security integration, 7e9b945 documentation. Working tree has uncommitted audit work; commit before handoff.
