# Backend Structural Audit — VeriMark

Generated from the actual repository on branch `backend/h8-core`. This describes the code that exists today, not intended behavior.

## 1. Directory tree (tracked project files only)

```
verimark-backend/
├── AGENTS.md                   Repository engineering rules (one-page)
├── CLAUDE.md                   Session handoff pointer
├── README.md                   Setup, demo, tests, troubleshooting
├── package.json                Node ESM project; Express 5, Prisma 6.19.3, Zod 4, JWT, QRCode
├── package-lock.json
├── .env.example                Required variable names and safe placeholders
├── .gitignore                  Ignores node_modules, .env, .local/, coverage, logs
├── prisma/
│   ├── schema.prisma           DB models (User, Student, Exam, Result, ResultVersion,
│   │                            LedgerEvent, CorrectionProposal, Approval, Checkpoint)
│   └── migrations/
│       └── 20261120152304_initial_ledger/
│           └── migration.sql   Committed initial migration
├── src/
│   ├── server.js               Entry point: connects DB, validates runtime config,
│   │                            loads keys + optional witness, starts Express on 127.0.0.1
│   ├── app.js                  Express application: middleware, routes, error handler
│   ├── auth.js                 Password hashing (scrypt), JWT issue/verify, role middleware
│   ├── config.js               File key loader, approver registry validation,
│   │                            optional witness loader + runtime config validator
│   ├── crypto.js               Canonical encoding, domain-separated SHA-256, Ed25519,
│   │                            full-chain independent verifier, receipt/checkpoint logic
│   ├── service.js              LedgerService: publication, corrections, receipts,
│   │                            verification evidence, full DB audit, advisory-lock writes
│   └── validation.js           Strict Zod schemas for publication, corrections, login, approval
├── shared/
│   ├── canonical.js            Exact verimark-v1 canonical bytes (Node + browser identical)
│   └── browser-verifier.js     WebCrypto implementation of verifyEvidence/checkApprovals
├── scripts/
│   ├── dev-setup.js            Bootstrap isolated PostgreSQL cluster (not the system service)
│   ├── seed.js                 Idempotent synthetic users/student/exam + signed approver registry
│   ├── demo.js                 Older real-HTTP smoke demo against seeded development DB
│   ├── judge-demo.js           Six-journey real HTTP + disposable-SQL security demo
│   ├── judge-workflow.js       The six-journey verifier shared by judge-demo and tests
│   ├── check-witness.js        Validates an obtained checkpoint signature/header only
│   ├── export-checkpoint.js    Exports signed checkpoint to a new file for external publication
│   ├── sign-proposal.js        Local approver signing CLI (private key never sent to server)
│   ├── verify-file.js          Standalone offline verifier using institution public key
│   ├── attack-demo.js          Re-exported to judge-demo (disposable schema, no dev data mutation)
│   └── lib/disposable.js       Creates random PostgreSQL schema, migrates, drops after test
├── test/
│   ├── crypto.test.js          Pure crypto/Ed25519/protocol tests (no database)
│   ├── integration.test.js     Real-PostgreSQL security tests on disposable schema
│   ├── audit-regressions.test.js Audit blind-spot regression tests on disposable schema
│   ├── security.test.js        Auth/RBAC/input/rollback/HTTP tests on disposable schema
│   └── browser-verifier.test.js Node WebCrypto proof-vs-proof agreement tests
├── fixtures/
│   └── frontend.json           Synthetic UI shapes only, not cryptographic evidence
├── docs/
│   ├── API.md                  Endpoint contract (method, role, request, responses, examples)
│   ├── openapi.json            OpenAPI 3.1 route/request/response definitions
│   ├── PROOF_SPEC.md           Exact byte encoding, hash/signature protocol, trust model
│   ├── ARCHITECTURE.md         System architecture and trust/deployment tradeoffs
│   ├── PROGRESS.md             Completed/remaining features, commands, state
│   ├── HANDOFF.md              Next-AI instructions and open actions
│   ├── SECURITY_TESTS.md       Threat model, executed tests, pass/fail, outstanding risks
│   └── BACKEND_STRUCTURE.md    This file
└── node_modules/               Installed dependencies (not tracked)
```

Note: `.env`, `.local/`, `.local/pgdata`, `.local/keys`, `.local/demo-credentials.json`, and any generated `.local/*.json` evidence are Git-ignored and are **not** part of the repository.

## 2. File responsibilities

| File/module | Responsibility |
|---|---|
| `src/server.js` | Process entry: config validation, Prisma connect, key/witness load, Express listen, graceful shutdown |
| `src/app.js` | Express app: CORS, JSON parsing, security headers, route registration, global error mapping |
| `src/auth.js` | `hashPassword`/`checkPassword` (scrypt), `tokenFor` (HS256 JWT, 1 h), `auth` middleware (DB lookup + role check) |
| `src/config.js` | `loadKeys` (institution keypair + signed approver registry, registry validated at startup), `loadWitness`, `runtimeConfig` |
| `src/crypto.js` | `canonical`, `bytes`, `digest`, `signValue`, `verifyValue`, `keyId`, `signed`, `checkApprovals`, `verifyEvidence` |
| `src/service.js` | `LedgerService`: advisory-lock transaction, publication, correction proposal, two-approval application, receipts, verification evidence, full audit |
| `src/validation.js` | Zod schemas: marks, publication, correction proposal, login, approval signature |
| `shared/canonical.js` | Canonical byte encoding shared by Node (`src/crypto.js`) and browser (`shared/browser-verifier.js`) |
| `shared/browser-verifier.js` | WebCrypto implementation of `verifyEvidence`, `checkApprovals`, key derivation for frontend-independent proof checking |
| `scripts/dev-setup.js` | Isolated PostgreSQL cluster on 127.0.0.1:55432, dev keys, JWT secret, `.env`, restricted ACLs (Windows) |
| `scripts/seed.js` | Idempotent seeding of admin, student, two approvers, auditor; signed approver registry |
| `scripts/demo.js` | Real HTTP smoke demo against seeded development DB |
| `scripts/judge-demo.js` | Full six-journey HTTP + disposable-database security demo (never mutates dev data) |
| `scripts/judge-workflow.js` | Six-journey verifier used by judge demo |
| `scripts/check-witness.js` | Validates an obtained checkpoint signature and sequence only |
| `scripts/export-checkpoint.js` | Exports signed checkpoint to a new file for external publication |
| `scripts/sign-proposal.js` | Local approver signing CLI; outputs public signature only |
| `scripts/verify-file.js` | Standalone offline verifier (evidence + trusted institution key + optional receipt/witness) |
| `scripts/lib/disposable.js` | Random disposable PostgreSQL schema helper for tests; drops schema on completion |
| `test/crypto.test.js` | Protocol and signature tests requiring no database |
| `test/integration.test.js` | Real-PostgreSQL publication/correction/SQL-tamper/rollback/concurrency tests |
| `test/audit-regressions.test.js` | Audit blind-spot regressions (array/object substitution, null injection, deleted correction records) |
| `test/security.test.js` | Auth/RBAC/JWT/input/CORS/HTTP/rollback/throttling tests |
| `test/browser-verifier.test.js` | Node WebCrypto vs Node crypto agreement on real signed fixtures plus mutation coverage |
| `fixtures/proof-vectors.json` | Signed public fixtures generated by judge demo for verifier agreement testing |
| `fixtures/frontend.json` | Synthetic UI example shapes only; explicitly not authentic proof |

## 3. Database models and relationships

| Model | Key fields | Relationships |
|---|---|---|
| `User` | id UUID, email unique, passwordHash, role enum, publicKey optional | Student (1:1 optional), Approvals many |
| `Student` | id UUID, code unique, name, userId unique optional | User optional, Results many |
| `Exam` | id UUID, code unique, title | Results many |
| `Result` | id UUID, studentId, examId, currentVersion, marks JSON | Student, Exam; ResultVersion many; CorrectionProposal many; unique(studentId, examId) |
| `ResultVersion` | id UUID, resultId, version, data JSON, commitment | Result; LedgerEvent optional; unique(resultId, version) |
| `LedgerEvent` | id UUID, sequence unique, versionId unique, body JSON, hash unique, signature | ResultVersion; versionId references ResultVersion |
| `CorrectionProposal` | id UUID, resultId, baseVersion, body JSON, digest unique, applied boolean | Result; Approvals many |
| `Approval` | id UUID, proposalId, userId, signature | CorrectionProposal, User; unique(proposalId, userId) |
| `Checkpoint` | sequence id, body JSON, signature | One per ledger sequence |

Historical publication commitments are never overwritten by corrections: `ResultVersion` rows are append-only by application discipline, and `Result.currentVersion` points to the latest published version.

## 4. Routes and controllers

All routes live in `src/app.js`. There is no separate router/controller directory. The application is a modular monolith inside one Express app.

Public routes:
- `GET /health` — SQL-backed health check
- `POST /auth/login` — public; returns JWT and public user fields only
- `GET /verify` / `POST /verify` — public capability URL; verifies a signed receipt
- `GET /checkpoints/latest` — public signed checkpoint envelope

Authenticated roles:
- `GET /me`, `GET /exams` — all roles
- `GET /students` — ADMIN, APPROVER, AUDITOR
- `GET /results` — all roles; students see only their own results
- `GET /results/:id`, `/history`, `/receipt/:version`, `/marksheet/:version` — all roles; students enforce ownership
- `POST /results` — ADMIN only
- `POST /results/:id/corrections` — ADMIN only
- `GET /corrections`, `GET /corrections/:id` — ADMIN, APPROVER, AUDITOR
- `POST /corrections/:id/approvals` — APPROVER only
- `POST /audits` — ADMIN or AUDITOR
- `GET /ledger/events` — staff; paginated, bounded

## 5. Service layer

`LedgerService` (`src/service.js`) owns all state-changing business logic:
- `locked(fn)` — wraps work in a Prisma transaction holding `pg_advisory_xact_lock(78421309)`; serializes all writers
- `publish(input)` — deduplicates by (student, exam), creates Result + ResultVersion, appends signed PUBLISH event + checkpoint
- `propose(resultId, input)` — validates base version, creates immutable proposal body + digest
- `approve(id, userId, signature)` — verifies unregistered approver, duplicate, stale, tampered, signature; applies only when two distinct valid signatures verify, then atomically appends CORRECT event + checkpoint and advances projection
- `verify(receipt)` — Repeatable Read; returns independent verification evidence + structured status
- `getReceipt(resultId, version)` — returns stored event receipt only if full ledger currently verifies
- `audit()` — compares mutable SQL rows to authenticated signed event copies; reports field-level findings
- `evidence(db)` — returns all ledger events + latest checkpoint as envelopes

## 6. Cryptographic modules

- Canonical JSON: sorted object keys, ordered arrays, safe integers only, no floats/undefined, UTF-8
- `bytes(domain, x) = UTF8("VERIMARK/v1/" + domain + NUL + canonical(x))`
- `digest = SHA-256(bytes)`; `signValue = Ed25519.sign(bytes)` base64url
- Domains: result, event, event-signature, proposal, approval, checkpoint, receipt, approver-certificate
- Key ID = SHA-256(SPKI DER public key)
- Trust root: institution SPKI PEM Ed25519 public key obtained independently, never supplied by untrusted HTTP response
- Approver certificates are institution-signed; registry lives outside PostgreSQL
- Same shared canonical module is used by `src/crypto.js` (Node) and `shared/browser-verifier.js` (WebCrypto)

## 7. Verification modules

- `verifyEvidence(evidence, institutionKey, {witness, receipt})` — checks checkpoint signature/head, every event hash/signature/link, commitments, version monotonicity, correction certificate + two signatures, proposal binding; returns `VALID_CURRENT`, `VALID_HISTORICAL`, `INVALID`, or `INCOMPLETE`
- Witness: caller-supplied externally obtained checkpoint; rejects chains shorter than witness sequence or forked heads
- Receipt: verifies signature + fields match its event; QR URL encodes signed receipt only, no names/marks
- HTTP `/verify` returns evidence, not just a Boolean

## 8. Checkpoint and witness modules

- Every append writes a signed checkpoint `{format, sequence, headHash, signer, issuedAt}` in the same transaction
- `GET /checkpoints/latest` returns the latest stored checkpoint
- `scripts/export-checkpoint.js` writes a checkpoint JSON to a new file
- `loadWitness()` reads `WITNESS_FILE` if configured
- **Current limitation**: no independently operated witness service is configured; local file is not operational independent rollback protection (documented in SECURITY_TESTS.md and ARCHITECTURE.md)

## 9. Correction workflow

1. ADMIN POST `/results/:id/corrections` with `{baseVersion, marks, reason}` → proposal with digest
2. APPROVER reviews proposal body; signs `{proposalDigest}` locally with own Ed25519 key
3. POST `/corrections/:id/approvals` with `{signature}` under each approver's own JWT
4. First approval returns `applied:false`; result unchanged
5. Second distinct valid signature → atomic append CORRECT event + checkpoint, `Result.currentVersion` advances, proposal marked applied
6. Duplicate signer, reused signature, changed proposal, stale base, invalid signature all rejected before any write

## 10. QR and marksheet generation

- `GET /results/:id/marksheet/:version` returns printable HTML with result marks and a QR PNG
- QR encodes `${publicBaseUrl}/verify?receipt=<base64url(JSON receipt)>`
- HTML shows result ID, version, exam, subject/score/max table, verification status as of checkpoint
- QR carries no student names or personal information; receipt contains pseudonymous IDs only

## 11. Audit system

`service.audit()` runs in Repeatable Read and checks:
- Full-chain proof validity (checkpoint, links, signatures, commitments, corrections)
- Mutable `Result` vs authentic event `data` for marks, studentId, examId, currentVersion
- `ResultVersion` vs event body for data, commitment, identity fields
- Uncommitted versions (version row without event)
- Stored checkpoint consistency
- Correction proposal digest/tampering
- Stored approval signatures against external registry
- Missing correction records referenced by events
- Malformed event rows
- Returns `{status, findings}` where each finding includes code, resultId, version, field, expected, actual

## 12. Test infrastructure

| File | Database | Key coverage |
|---|---|---|
| `test/crypto.test.js` | None | canonical, Ed25519, verification mutations, approvals |
| `test/integration.test.js` | Real disposable schema | publication races, SQL tampering, signatures, rollback, QR pixels |
| `test/audit-regressions.test.js` | Real disposable schema | array/object substitution, null injection, deleted corrections |
| `test/security.test.js` | Real disposable schema | auth, RBAC, JWT variants, input safety, CORS, throttle, DB unavailability |
| `test/browser-verifier.test.js` | None | WebCrypto vs Node agreement, mutation coverage, wrong key, witness |

Tests use `LOCAL_ATTACK_TESTS=1` guard and only run against `127.0.0.1:55432/verimark` with a random disposable schema dropped after completion.

## 13. Scripts

| Script | Purpose |
|---|---|
| `npm start` | Start API on 127.0.0.1:3000 |
| `npm run dev:setup` | Bootstrap isolated dev cluster, keys, `.env` |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply migration |
| `npm run db:seed` | Seed synthetic data |
| `npm test` | Full test suite |
| `npm run test:crypto` | Crypto-only tests |
| `npm run demo` | Six-journey disposable-database demo + fixtures export |
| `npm run demo:existing` | Older smoke demo against seeded development DB |
| `npm run attack:demo` | Same as judge demo (disposable SQL tamper + correction journey) |
| `npm run typecheck` | TypeScript strict check of frontend contract types |

## 14. Request flow

```
Frontend browser
   → HTTPS/HTTP request to http://localhost:3000 (or deployed base URL)
   → Express CORS middleware (configured FRONTEND_ORIGIN only)
   → JSON body parser (64 KB limit)
   → Route in src/app.js
   → Auth middleware (Bearer JWT + role + DB user lookup)
   → LedgerService business logic (advisory-lock transaction)
   → Canonical encoding + SHA-256 + Ed25519 in src/crypto.js / shared/canonical.js
   → Prisma Client → PostgreSQL 18 (isolated local cluster)
   → JSON response to frontend
Public verification flows bypass trust in the server: frontend independently runs verifyEvidence against a pinned institution public key.
```

## 15. What is intentionally missing

- User registration endpoint (not implemented; accounts seeded locally)
- Password reset / provisioning
- Refresh tokens
- Independent witness service
- Production TLS/deployment
- Browser UI test harness (verifier module exists, tested via Node WebCrypto)
- Physical printer/phone scan testing
- Merkle/tree proofs (full-chain O(n) proof only)
