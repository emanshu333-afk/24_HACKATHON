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

Next: run crypto tests and commit foundation; HTTP, integration and attack tests still outstanding.
