# System Architecture for Frontend — VeriMark

This document is written for the React frontend developer on branch `frontend`. It describes the backend that exists today, using real file paths and routes. Do not connect the frontend directly to PostgreSQL; use only the HTTP API.

## 1. Repository and branches

- Repository: `git@github.com:emanshu333-afk/24_HACKATHON.git`
- Backend branch: `backend/h8-core` (this side owns the API, database, ledger, and verification)
- Frontend branch: `frontend` (your side; do not modify without coordination)

Backend documentation in this repository:
- `docs/API.md` — endpoint contract with examples and failure codes
- `docs/openapi.json` — OpenAPI 3.1 machine-readable definitions
- `docs/PROOF_SPEC.md` — exact byte encoding and cryptographic protocol
- `docs/frontend-contract/api.types.ts` — TypeScript interfaces you can copy into the frontend
- `fixtures/frontend.json` — synthetic UI example shapes (not authentic proof)

## 2. High-level architecture

```
React frontend (Vite)
   │ HTTP JSON over fetch
   ▼
Express backend (Node 24, single process on 127.0.0.1:3000)
   ├─ JWT authentication + role authorization
   ├─ LedgerService: publication, corrections, receipts, verification, audit
   ├─ Canonical encoding + SHA-256 + Ed25519 signatures
   └─ Prisma ORM → PostgreSQL 18 (isolated local dev cluster on 55432)
```

The backend never trusts its own database `verified` or `isValid` columns. Every published result is a signed ledger event chained to genesis. Public verification returns full evidence (`events`, `checkpoint`) plus a structured status. The frontend must independently verify that evidence against a pinned institution public key — never treat `verified: true` from the server as proof.

## 3. Cryptographic protocol (frontend must implement this)

Source of truth: `docs/PROOF_SPEC.md` and `shared/canonical.js`.

- Canonical bytes: `VERIMARK/v1/<domain>\0<canonical JSON>`
- Hash: SHA-256
- Signature: Ed25519, base64url, 86 characters
- Trusted key: institution SPKI PEM Ed25519 public key, pinned by you out of band. Never accept a key from the API response.
- QR code content: `${API_BASE}/verify?receipt=<base64url(JSON signed receipt)>`
- A receipt alone proves one published version. The full evidence (`events` + `checkpoint`) proves chain position and historical/superseded status.

A browser-compatible verifier exists at `shared/browser-verifier.js`:
- `verifyEvidence(evidence, independentlyPinnedPublicKey, {receipt, witness})`
- `checkApprovals(correction, institutionKey)`
- `canonical(value)`, `compareDisplayedResult(verification, displayed)`

It is tested via Node WebCrypto against the same signed fixtures the backend produces. Port it into the frontend and add your own tests on the shared fixtures.

## 4. Request flow for a typical page

```
Browser fetch
   → Express CORS (only configured FRONTEND_ORIGIN)
   → Route handler
   → Auth middleware: Bearer JWT + role + DB user lookup
   → LedgerService business logic inside advisory-lock transaction
   → Prisma → PostgreSQL
   → JSON / HTML response
```

Protected endpoints require `Authorization: Bearer <token>`. Login returns a 1-hour HS256 JWT. There are no refresh tokens; logout is client-side token deletion.

## 5. Page-to-endpoint mapping

| Frontend page | Endpoint | Role | Implemented | Notes |
|---|---|---|---|---|
| Login | `POST /auth/login` | Public | Yes | Returns JWT, expiresIn, user |
| My account | `GET /me` | Any authenticated | Yes | id, email, role, studentId |
| Administrator dashboard | `GET /results` + `GET /students` + `GET /exams` | ADMIN | Yes | Students/exams lists; results list |
| Student dashboard | `GET /results` (filtered) + `GET /me` | STUDENT | Yes | Own results only |
| Publish results | `POST /results` | ADMIN | Yes | `{studentId, examId, marks}` |
| Result listing | `GET /results` | Any | Yes | Students see own rows only |
| Result details | `GET /results/:id` | Any + ownership | Yes | Current mutable projection |
| Result history | `GET /results/:id/history` | Any + ownership | Yes | All versions ascending |
| Printable marksheet | `GET /results/:id/marksheet/:version` | Any + ownership | Yes | HTML with QR PNG |
| QR scan / public verification | `GET /verify?receipt=...` | Public | Yes | Returns evidence + status |
| Correction proposal | `POST /results/:id/corrections` | ADMIN | Yes | `{baseVersion, marks, reason}` |
| Correction detail | `GET /corrections/:id` | Staff | Yes | Proposal + approvals |
| First approval | `POST /corrections/:id/approvals` | APPROVER | Yes | `{signature}` from own key |
| Second approval | `POST /corrections/:id/approvals` | APPROVER | Yes | Same endpoint; second signature applies |
| Correction timeline | `GET /corrections` + `/corrections/:id` | Staff | Yes | All proposals |
| Ledger explorer | `GET /ledger/events?after=&limit=` | Staff | Yes | Paginated events |
| Integrity audit | `POST /audits` | ADMIN/AUDITOR | Yes | `{status, findings}` |
| Tamper detection | Same audit + public `/verify` | Public/Auditor | Yes | Detects direct SQL edits |
| User registration | — | — | MISSING | No register endpoint; accounts seeded locally |
| Password reset | — | — | MISSING | Not implemented |
| Refresh token | — | — | MISSING | JWT lasts 1 hour; re-login after expiry |

## 6. Authentication integration

1. Frontend POSTs `{email, password}` to `/auth/login`.
2. Backend returns `{token, expiresIn: 3600, user: {id, role, email}}`.
3. Frontend stores token in memory (not localStorage recommended) and sends `Authorization: Bearer <token>` on protected requests.
4. JWT is signed HS256, issuer/audience `verimark`, expires in 1 hour.
5. Role is checked on every request against the database user row. Client-supplied role claims in JWT are ignored; the server looks up the real user.
6. Student users can only read their own results (`result.studentId === user.student.id`).
7. CORS allows only one configured `FRONTEND_ORIGIN` (default `http://localhost:5173`). Arbitrary origins receive no `Access-Control-Allow-Origin`.
8. Login is rate limited at 21 attempts per minute per IP.
9. No refresh token exists. After expiry, the user logs in again.

## 7. Verification flow (critical)

When the user scans a QR or pastes a receipt token:

1. Frontend GETs `/verify?receipt=<token>` or POSTs `{receipt}` to `/verify`.
2. Backend returns `{verification, evidence}`.
3. Frontend **must** run independent verification:
   - Use `verifyEvidence(evidence, PINNED_INSTITUTION_PUBLIC_KEY, {receipt})`.
   - Do not trust `verification.status` alone; check `failures` is empty.
4. Status meanings:
   - `VALID_CURRENT` — this is the latest version within the signed checkpoint
   - `VALID_HISTORICAL` — valid original publication, superseded by an authorized correction in the chain
   - `INVALID` — tampered or forged; never display as verified
   - `INCOMPLETE` — missing evidence or WebCrypto unavailable; display as unavailable, not invalid
5. Compare the displayed marks against `verification.result` using `compareDisplayedResult(verification, displayed)`. A mutable server projection must match the signed result.

## 8. Correction approval integration

1. Admin creates proposal via `POST /results/:id/corrections`.
2. Frontend displays proposal body for approver review.
3. Each approver signs `{proposalDigest}` locally with their own Ed25519 private key using the browser-compatible `signValue` equivalent.
4. Frontend POSTs `{signature}` to `/corrections/:id/approvals` under that approver's JWT.
5. First approval: `applied:false`. Second distinct valid approver: `applied:true` and result advances.
6. Never send private keys to the API. Never accept two database approval flags as equivalent to two digital signatures.

## 9. TypeScript types

Copy `docs/frontend-contract/api.types.ts` into your frontend package. It covers:
- `User`, `Me`, `LoginRequest/Response`
- `Student`, `Examination`, `Mark`, `Marks`
- `ResultRecord`, `ResultListItem`
- `PublishedData`, `ResultReceipt`
- `Verification`, `VerificationResponse`, `VerificationStatus`
- `CorrectionRequest`, `ApprovalRequest`, `CorrectionProposal`, `CorrectionDetails`
- `IntegrityAudit`, `IntegrityAuditFinding`
- `ApiError`, `LedgerPage`
- `VerifyOptions`, `BrowserVerifier`

Types compile under `tsc --strict --lib ES2022,DOM`. They describe runtime shapes only; always verify untrusted JSON cryptographically.

## 10. Sample fixtures

Generated by `npm run demo -- --export-fixtures` into `fixtures/proof-vectors.json`. Synthetic only. Includes:
- `receipt` / `correctedReceipt`
- `current.evidence`, `historical.evidence`, `corrected.evidence`
- `tampered.evidence` with expected `INVALID`
- `rollback.witness` for checkpoint testing
- `publicKey` (institution public key for test use only; production key obtained out of band)

## 11. Local integration setup

1. Clone the repository and checkout `backend/h8-core`.
2. Do not touch branch `frontend`.
3. Backend setup (only if you need to run the API locally):
   ```powershell
   npm ci
   npm run dev:setup
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm test
   npm start
   ```
4. Read `.local/demo-credentials.json` privately for login passwords (ignored by Git).
5. Set `VITE_API_BASE_URL=http://localhost:3000` for local development.
6. If the frontend runs on another laptop, `localhost` means that laptop. Use your machine's LAN IP and update `PUBLIC_BASE_URL`/`FRONTEND_ORIGIN` accordingly; do not expose PostgreSQL to the browser.
7. Make a real test request:
   ```js
   const r = await fetch(`${VITE_API_BASE_URL}/auth/login`, {
     method: 'POST', headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({email: 'admin@verimark.test', password: '<from .local/demo-credentials.json>'})
   })
   ```
8. Verify a sample result by calling `/verify` with a receipt token and independently checking `evidence`.
9. CORS: ensure your dev origin matches `FRONTEND_ORIGIN` or set it to your origin before starting the backend.

## 12. What the frontend must not do

- Do not trust a server Boolean `verified: true`.
- Do not accept an institution public key from an HTTP response; pin it out of band.
- Do not send private keys, passwords, or database credentials to the API.
- Do not connect the browser directly to PostgreSQL.
- Do not inject untrusted marksheet HTML into application content; render it in a controlled Blob/new window.
- Do not silently rebase correction signatures after a 409 stale base; fetch current history and create a new proposal.

## 13. Missing APIs (honest gaps)

- User registration, password reset, refresh tokens
- HTTP endpoint to reject a correction
- Independent witness service / remote checkpoint publication
- Browser UI test harness (verifier module exists)
- Physical QR scan on a real device

These are documented limitations, not missing implementations hidden behind stubs.
