# Progress

## Phase 0
- Cloned SSH origin git@github.com:emanshu333-afk/24_HACKATHON.git; default main; initial README only.
- Active branch backend/h8-core; no push authorized.
- Git 2.55, Node 24.19, npm 11.17 available. Docker unavailable.
- Installed PostgreSQL 18 service runs; existing credentials unavailable. Preparing separate local cluster, no changes to existing service.
- Implementation and tests not yet complete.

## Phase 1 / 2
- Isolated PostgreSQL 18 initialized on 127.0.0.1:55432 with SCRAM password, ignored data and user-only ACLs. Existing PostgreSQL service untouched.
- Prisma 6.19.3 installed (Node 24 compatible), initial migration generated/applied and client generated.
- Synthetic users/student/exam seeded; unique approver keys and institution-signed registry outside database.
- Implemented canonical protocol, Ed25519 operations, full-chain verifier, witness comparisons and initial service code. `npm run test:crypto`: 12 passed, 0 failed.
- Initial bootstrap hit a subprocess pipe timeout; fixed pg_ctl inherited output handles and restarted only isolated cluster.

Foundation commit: e1ea24b — Establish PostgreSQL schema and signed ledger proof primitives.

## Phases 3–5
- Implemented authenticated HTTP routes, role/ownership checks, publication, immutable historical versions, signed receipts and checkpoint evidence.
- Two registered Ed25519 approver keys sign exact proposals. Duplicate/replayed/stale approvals rejected; correction application atomic.
- Printable HTML with real QR PNG; public GET/POST verification returns evidence and structured status; standalone Node verifier and signer CLI.
- PostgreSQL audit compares authentic signed data to actual mutable/historical rows; inspects event integrity, checkpoints and proposal/approval state.
- Witness checkpoint export and caller-provided external-file verification implemented. Independent witness service NOT configured.

## Phase 6 — actual checks
- Final `npm test` after receipt identity hardening: 31 passed, 0 failed, 0 skipped. Includes fresh-schema migration, real SQL attacks, publication/correction races and decoding QR pixels.
- `npm run attack:demo`: SQL changed synthetic score 75→99; audit pinpointed result/version/field and expected/actual. Original mutable marks restored. Synthetic publication remains as demo data.
- Proof benchmark: 15 events, 17,622 bytes, 3.75 ms verification in final run.
- docs/API.md matches implemented routes; fixture frontend shapes available. README/architecture/proof/security documentation written.

## Remaining / integration
- Actual independently controlled checkpoint publication and authenticated retrieval; no operational rollback-protection claim.
- React/browser independent verifier and teammate integration, physical QR scan on reachable endpoint.
- Production key custody/rotation, TLS/deployment, least-privilege DB role, privacy-scalable proofs and large-load testing.
- Live API smoke check (`npm run demo`) passed; saved .local/demo-marksheet.html, demo-evidence.json and demo-receipt.json. Seeded student now has a genuine published result. API stopped intentionally; restart with npm start. PostgreSQL remains running.
- Migration status is up to date; offline CLI verification and checkpoint export passed, including caller-pinned file witness.
- OpenAPI JSON parsed: 19 operations, 37 resolved references. Dependency audit: initial 4 high transitive issues resolved by tested overrides, final 0 vulnerabilities.
- Branch backend/h8-core; all commits local, no push authorized. No known failing automated tests.

Highest priority after final checks: deliver stable API contract to frontend and wire independently pinned verification into its result screen.
