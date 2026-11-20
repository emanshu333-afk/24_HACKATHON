# VeriMark — Frontend Partner Instructions (for your OpenCode agent)

Copy and send this entire file to your frontend partner. Their OpenCode agent should read it first, then read the referenced docs in the repository.

---

## 1. What we are building

**VeriMark — Tamper-Proof Exam Result Ledger** (Hackathon H8)

Problem: Exam marks can be changed after publication, leaving students unable to prove their original marks.

Solution: A result publishing system where every published result is cryptographically committed to an append-only hash-chain ledger. Every result receives:
- A SHA-256 commitment and Ed25519 signature
- A position in a signed, checkpointed ledger
- A printable marksheet with a QR code that links to independently verifiable evidence
- Two-signature corrections that preserve the original result as verifiable history
- Detection of direct database tampering that bypasses the API

**Your job (frontend):** React + Vite application that consumes the backend HTTP API, lets users log in, publish/view results, scan QR codes, propose and approve corrections, and independently verify cryptographic evidence — without trusting a server `verified: true` Boolean alone.

**My job (backend):** Node/Express + PostgreSQL/Prisma API, cryptographic ledger, verification, corrections, audits. I own `backend/h8-core`. You own `frontend`.

---

## 2. Repository and branches

- Repository: `git@github.com:emanshu333-afk/24_HACKATHON.git`
- Backend branch: `backend/h8-core` (mine — do not push to or modify)
- Frontend branch: `frontend` (yours — create from main if it does not exist)

**Git workflow between us:**
```powershell
# Clone once
git clone git@github.com:emanshu333-afk/24_HACKATHON.git
cd 24_HACKATHON

# Your branch (create it from main; never touch backend/h8-core)
git checkout -b frontend

# Before you start working each session, pull my latest backend docs:
git pull origin backend/h8-core

# Push your frontend work:
git push origin frontend
```

Rules:
- Never force-push or rewrite shared history.
- Do not modify or merge `backend/h8-core`.
- I will not push to your `frontend` branch; you will not push to my `backend/h8-core` branch.
- Pull each other's branches before starting work to stay in sync.

---

## 3. What the backend has already done (verified)

Branch `backend/h8-core` is pushed to GitHub. The backend is complete and tested:

- **Authentication:** JWT login (HS256, 1-hour expiry), scrypt password hashing, role-based authorization (ADMIN, STUDENT, APPROVER, AUDITOR), student ownership enforcement.
- **Publishing:** Admin publishes results; each result gets a SHA-256 commitment, signed Ed25519 ledger event, signed checkpoint, and receipt.
- **Ledger:** Append-only SHA-256 hash chain from genesis. Every append verified before commit. Global advisory lock prevents concurrent history forks.
- **Corrections:** Proposal + exactly two distinct approver Ed25519 signatures bound to the exact proposal digest. Original result preserved as `VALID_HISTORICAL`; corrected result is `VALID_CURRENT`.
- **Verification:** Public `/verify` returns full evidence (`events` + `checkpoint`) plus structured status. Frontend must independently verify against a pinned institution public key.
- **QR marksheets:** Printable HTML with QR PNG encoding `/verify?receipt=<base64url(receipt)>`. QR contains no student names.
- **Audit:** Detects direct SQL tampering (marks, studentId, examId, commitments, signatures, linkages, deletions, checkpoints) and reports field-level expected vs actual.
- **Tests:** 104 passing, 0 failed. Includes real SQL tampering on disposable databases, QR pixel decoding, correction races, and browser/WebCrypto verifier agreement.
- **API contract:** `docs/API.md`, `docs/openapi.json` (19 operations).
- **Frontend types:** `docs/frontend-contract/api.types.ts` (TypeScript, compiles under strict).
- **Fixtures:** `fixtures/proof-vectors.json` (synthetic signed evidence for testing), `fixtures/frontend.json` (UI shapes only).

---

## 4. Where to start (read these files first)

After cloning and checking out `frontend`, read:

| File | Purpose |
|---|---|
| `docs/FRONTEND_INTEGRATION_PACKET.md` | Complete integration contract (read this first) |
| `docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md` | High-level architecture and page-to-endpoint mapping |
| `docs/API.md` | Endpoint details, examples, failure codes |
| `docs/openapi.json` | Machine-readable OpenAPI 3.1 definitions |
| `docs/PROOF_SPEC.md` | Exact byte encoding, hash/signature protocol, trust model |
| `docs/frontend-contract/api.types.ts` | TypeScript interfaces to copy into your frontend |
| `fixtures/proof-vectors.json` | Signed synthetic fixtures for verifier testing |
| `fixtures/frontend.json` | Example UI data shapes (not cryptographic proof) |

---

## 5. API base and environment

Local backend runs at:
```
VITE_API_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173
```

If your React app runs on another laptop, `localhost` means that laptop. Use your backend machine's LAN IP for cross-device testing. Never connect the browser directly to PostgreSQL (PostgreSQL is at `127.0.0.1:55432` on the backend machine only).

To run the backend locally if needed:
```powershell
npm ci
npm run dev:setup
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm start
```

Demo credentials are in `.local/demo-credentials.json` (Git-ignored; ask me privately if you need them).

---

## 6. Authentication integration

1. `POST /auth/login` with `{email, password}` → returns `{token, expiresIn: 3600, user:{id,role,email}}`.
2. Store the JWT in memory. Send `Authorization: Bearer <token>` on protected requests.
3. JWT expires in 1 hour. No refresh token; re-login after expiry.
4. Role comes from the server database, not from JWT claims. Client-supplied role claims are ignored.
5. Students can only access their own results (`result.studentId === user.student.id`).
6. CORS allows only one configured `FRONTEND_ORIGIN`. Set it to your dev origin.
7. Logout = delete the token. No server-side session.

---

## 7. Public verification flow (critical — do not skip)

The QR code on a marksheet encodes:
```
http://localhost:3000/verify?receipt=<base64url(JSON signed receipt)>
```

When verifying:
1. GET `/verify?receipt=<token>` → returns `{verification, evidence}`.
2. Independently run `verifyEvidence(evidence, PINNED_INSTITUTION_PUBLIC_KEY, {receipt})`.
3. Port the verifier from `shared/browser-verifier.js` into your React app.
4. Pin the institution SPKI Ed25519 public key out of band. Never accept a key from the API response.
5. Check `status` and `failures`:
   - `VALID_CURRENT` + empty failures → verified current result
   - `VALID_HISTORICAL` + empty failures → verified historical/superseded result
   - `INVALID` → not verified; never display as authentic
   - `INCOMPLETE` → verification unavailable; do not display as invalid marks
6. Compare displayed marks against `verification.result` using `compareDisplayedResult(verification, displayed)`.

Never trust `verified: true` from the server alone.

---

## 8. Page-to-endpoint mapping

| Frontend page | Endpoint | Role | Implemented |
|---|---|---|---|
| Login | POST /auth/login | Public | Yes |
| My account | GET /me | Any | Yes |
| Admin dashboard | GET /results, /students, /exams | ADMIN | Yes |
| Student dashboard | GET /results (own), GET /me | STUDENT | Yes |
| Publish results | POST /results | ADMIN | Yes |
| Result listing | GET /results | Any | Yes |
| Result details | GET /results/:id | Any + ownership | Yes |
| Result history | GET /results/:id/history | Any + ownership | Yes |
| Printable marksheet | GET /results/:id/marksheet/:version | Any + ownership | Yes |
| QR / public verification | GET /verify?receipt= | Public | Yes |
| Correction proposal | POST /results/:id/corrections | ADMIN | Yes |
| Correction detail | GET /corrections/:id | Staff | Yes |
| First approval | POST /corrections/:id/approvals | APPROVER | Yes |
| Second approval | POST /corrections/:id/approvals | APPROVER | Yes |
| Correction timeline | GET /corrections | Staff | Yes |
| Ledger explorer | GET /ledger/events?after=&limit= | Staff | Yes |
| Integrity audit | POST /audits | ADMIN/AUDITOR | Yes |
| User registration | — | — | MISSING (not implemented) |
| Password reset | — | — | MISSING (not implemented) |
| Refresh token | — | — | MISSING (not implemented) |

Missing APIs are not stubbed. If you need them, propose the API and we coordinate before implementation.

---

## 9. Correction approval integration (your side needs care)

1. Admin creates proposal via `POST /results/:id/corrections` → returns proposal with `digest`.
2. Each approver reviews the proposal body, then signs `{proposalDigest}` locally with their own Ed25519 private key.
3. Frontend POSTs `{signature}` to `/corrections/:id/approvals` under that approver's JWT.
4. First approval: `applied:false`. Second distinct valid approver: `applied:true` and result advances.
5. Never send private keys to the API. Never treat two database approval flags as equivalent to two digital signatures.
6. On 409 stale base, fetch current history and create a new proposal (never silently rebase signatures).

---

## 10. TypeScript types and fixtures

Copy `docs/frontend-contract/api.types.ts` into your frontend package. It covers `User`, `LoginRequest/Response`, `Student`, `Examination`, `Mark`, `ResultRecord`, `PublishedData`, `ResultReceipt`, `Verification`, `VerificationResponse`, `CorrectionProposal`, `ApprovalRequest`, `IntegrityAudit`, `ApiError`, `VerifyOptions`, `BrowserVerifier`, and more.

Test your verifier against `fixtures/proof-vectors.json`, which contains signed synthetic evidence for current, historical, corrected, and tampered results.

All fixture data is synthetic and marked as such.

---

## 11. How to test your frontend against the backend

1. Ensure my `backend/h8-core` branch is pulled: `git pull origin backend/h8-core`.
2. Start the backend (see section 5) or use a deployed URL if we set one up.
3. Set `VITE_API_BASE_URL` to the backend URL.
4. Log in with a demo account.
5. Publish a result, get a receipt, generate/verify QR.
6. Run independent verification on the evidence.
7. Propose a correction, collect two approver signatures, finalize.
8. Verify original stays `VALID_HISTORICAL` and corrected is `VALID_CURRENT`.
9. Tamper with marks directly in the database (on a disposable schema) and confirm the audit detects it.

---

## 12. What I still need from you / coordination items

- Confirm your frontend dev origin so I can set `FRONTEND_ORIGIN` correctly.
- Let me know if you need any missing endpoints (registration, password reset, etc.) — propose first, I implement.
- If you want a deployed/backend URL instead of localhost, tell me and we arrange it (requires your permission for any external deployment).
- Report any API contract mismatches immediately so we record breaking changes in `docs/API.md`.

---

## 13. Honest limitations (read before demoing)

- No independently operated witness service yet; local checkpoint files are not operational rollback protection.
- Browser verifier module exists but is tested via Node WebCrypto, not yet in a real React UI.
- Physical printed/phone QR scan not tested.
- No TLS/deployment; API binds loopback in development.
- Full-chain proofs expose pseudonymous marks for all events; not privacy-scalable at large scale.

---

## 14. Quick start checklist for your OpenCode agent

- [ ] Clone repo, checkout `frontend` branch from `main`
- [ ] Pull `backend/h8-core` to get latest docs
- [ ] Read `docs/FRONTEND_INTEGRATION_PACKET.md` and `docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md`
- [ ] Copy `docs/frontend-contract/api.types.ts` into frontend
- [ ] Set `VITE_API_BASE_URL` and `FRONTEND_ORIGIN`
- [ ] Implement API client matching `docs/API.md`
- [ ] Port `shared/browser-verifier.js` verification into React
- [ ] Pin institution public key (get it from me out of band)
- [ ] Test against `fixtures/proof-vectors.json`
- [ ] Build login, publish, view, QR verify, correction, and audit pages
- [ ] Push to `origin frontend`; pull `origin backend/h8-core` before each session

---

End of instructions. If anything is unclear, ask me before writing code that depends on an unverified assumption.