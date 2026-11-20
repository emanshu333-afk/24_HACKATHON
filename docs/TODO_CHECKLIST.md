# VeriMark — Numbered Pointer Checklist (Frontend + Backend)

Use this document to track progress pointer-by-pointer. Check off each item as you complete it.

---

## Phase 0: Setup & Repository (Both)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 0.1 | Clone repository: `git clone git@github.com:emanshu333-afk/24_HACKATHON.git` | Both | |
| 0.2 | Checkout correct branch — Backend: `backend/h8-core`, Frontend: `frontend` | Both | |
| 0.3 | Pull latest docs before each session: `git pull origin backend/h8-core` | Frontend | |
| 0.4 | Install Node 24+ and npm | Both | |
| 0.5 | Read `docs/FRONTEND_INTEGRATION_PACKET.md` (full contract) | Frontend | |
| 0.6 | Read `docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md` | Frontend | |
| 0.7 | Read `docs/API.md` and `docs/openapi.json` | Both | |
| 0.8 | Read `docs/PROOF_SPEC.md` (cryptographic byte encoding) | Frontend | |
| 0.9 | Copy `docs/frontend-contract/api.types.ts` into frontend project | Frontend | |
| 0.10 | Set `VITE_API_BASE_URL=http://localhost:3000` (or deployed URL) | Frontend | |
| 0.11 | Set `FRONTEND_ORIGIN=http://localhost:5173` (or your dev origin) | Backend | |
| 0.12 | Share frontend dev origin with backend engineer | Frontend | |

---

## Phase 1: Backend Infrastructure (Backend Only)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Bootstrap isolated PostgreSQL: `npm run dev:setup` | Backend | |
| 1.2 | Generate Prisma client: `npm run db:generate` | Backend | |
| 1.3 | Apply migration: `npm run db:migrate` | Backend | |
| 1.4 | Seed synthetic data: `npm run db:seed` | Backend | |
| 1.5 | Verify `.env` and `.local/` are Git-ignored (no secrets committed) | Backend | |
| 1.6 | Verify `npm audit` reports 0 vulnerabilities | Backend | |
| 1.7 | Start API: `npm start` (listens on 127.0.0.1:3000) | Backend | |
| 1.8 | Health check: `GET /health` returns `{status:"ok"}` | Backend | |

---

## Phase 2: Backend Cryptography & Ledger (Backend Only)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | Canonical encoding (`shared/canonical.js`) — verified | Backend | |
| 2.2 | Domain-separated SHA-256 (`docs/PROOF_SPEC.md`) — verified | Backend | |
| 2.3 | Ed25519 signing & verification (`src/crypto.js`) — verified | Backend | |
| 2.4 | Hash-chain ledger events with previousHash linkage — verified | Backend | |
| 2.5 | Signed checkpoints after every append — verified | Backend | |
| 2.6 | Independent offline verifier (`scripts/verify-file.js`) — verified | Backend | |
| 2.7 | Browser-compatible verifier (`shared/browser-verifier.js`) — implemented | Backend | |
| 2.8 | Global transaction advisory lock for concurrent writes — verified | Backend | |
| 2.9 | Full-chain verification returns VALID_CURRENT / VALID_HISTORICAL / INVALID / INCOMPLETE | Backend | |

---

## Phase 3: Backend API Routes (Backend Only)

| # | Task | Endpoint | Role | Status |
|---|------|----------|------|--------|
| 3.1 | Health check | GET /health | Public | |
| 3.2 | Login | POST /auth/login | Public | |
| 3.3 | Current user | GET /me | Any | |
| 3.4 | List students | GET /students | Staff | |
| 3.5 | List exams | GET /exams | Any | |
| 3.6 | Publish result | POST /results | ADMIN | |
| 3.7 | List results | GET /results | Any | |
| 3.8 | Result detail | GET /results/:id | Any + ownership | |
| 3.9 | Result history | GET /results/:id/history | Any + ownership | |
| 3.10 | Receipt + QR URL | GET /results/:id/receipt/:version | Any + ownership | |
| 3.11 | Printable marksheet | GET /results/:id/marksheet/:version | Any + ownership | |
| 3.12 | Public verification | GET /verify | Public | |
| 3.13 | Public verification (body) | POST /verify | Public | |
| 3.14 | Correction proposal | POST /results/:id/corrections | ADMIN | |
| 3.15 | List corrections | GET /corrections | Staff | |
| 3.16 | Correction detail | GET /corrections/:id | Staff | |
| 3.17 | Add approval signature | POST /corrections/:id/approvals | APPROVER | |
| 3.18 | Latest checkpoint | GET /checkpoints/latest | Public | |
| 3.19 | Integrity audit | POST /audits | ADMIN/AUDITOR | |
| 3.20 | Ledger events | GET /ledger/events | Staff | |

---

## Phase 4: Frontend — Authentication & Pages (Frontend Only)

| # | Task | Endpoint | Status |
|---|------|----------|--------|
| 4.1 | Login page (POST /auth/login) | /auth/login | |
| 4.2 | Store JWT in memory, send Bearer header on protected requests | All protected | |
| 4.3 | Handle JWT expiry (1 hour), re-login flow | /auth/login | |
| 4.4 | My account page (GET /me) | /me | |
| 4.5 | Student dashboard — own results only | /results | |
| 4.6 | Admin dashboard — students, exams, results lists | /students, /exams, /results | |
| 4.7 | Role-based UI (hide admin-only pages from students) | — | |
| 4.8 | Logout = delete token | — | |

---

## Phase 5: Frontend — Result Publication & Viewing (Frontend Only)

| # | Task | Endpoint | Status |
|---|------|----------|--------|
| 5.1 | Publish result form (POST /results) | /results | |
| 5.2 | Validate marks client-side (subject, score 0-100, max=100) | — | |
| 5.3 | Result listing page | GET /results | |
| 5.4 | Individual result detail | GET /results/:id | |
| 5.5 | Result history page (all versions) | GET /results/:id/history | |
| 5.6 | Student ownership enforcement (students see own results only) | — | |

---

## Phase 6: Frontend — QR & Verification (CRITICAL)

| # | Task | Endpoint | Status |
|---|------|----------|--------|
| 6.1 | Printable marksheet page with QR image | GET /results/:id/marksheet/:version | |
| 6.2 | QR encodes `/verify?receipt=<base64url(receipt)>` | — | |
| 6.3 | Public verification page (GET /verify?receipt=) | /verify | |
| 6.4 | Port `shared/browser-verifier.js` into React | — | |
| 6.5 | Pin institution public key (out of band, never from API) | — | |
| 6.6 | Independently verify `evidence` — never trust `verified: true` alone | /verify | |
| 6.7 | Display VALID_CURRENT / VALID_HISTORICAL / INVALID / INCOMPLETE | /verify | |
| 6.8 | Compare displayed marks vs `verification.result` via `compareDisplayedResult` | /verify | |

---

## Phase 7: Frontend — Corrections (Frontend Only)

| # | Task | Endpoint | Status |
|---|------|----------|--------|
| 7.1 | Correction proposal form (POST /results/:id/corrections) | /results/:id/corrections | |
| 7.2 | Display proposal body for approver review | GET /corrections/:id | |
| 7.3 | Approver signs `{proposalDigest}` locally with own Ed25519 key | — | |
| 7.4 | Submit approval signature (POST /corrections/:id/approvals) | /corrections/:id/approvals | |
| 7.5 | First approval shows `applied:false` | — | |
| 7.6 | Second distinct approver shows `applied:true`, result advances | — | |
| 7.7 | Handle 409 stale base — fetch history, create new proposal | — | |
| 7.8 | Never send private keys to the API | — | |

---

## Phase 8: Frontend — Audit & Tamper Detection (Frontend Only)

| # | Task | Endpoint | Status |
|---|------|----------|--------|
| 8.1 | Integrity audit page | POST /audits | |
| 8.2 | Display field-level findings (expected vs actual) | /audits | |
| 8.3 | Ledger explorer (paginated events) | GET /ledger/events | |
| 8.4 | Show tamper detection results to user | /audits, /verify | |

---

## Phase 9: Testing (Both)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 9.1 | Backend: `npm test` — 104 passed, 0 failed | Backend | |
| 9.2 | Backend: `npm run demo` — six journeys pass | Backend | |
| 9.3 | Backend: `npm run attack:demo` — SQL tamper detected | Backend | |
| 9.4 | Frontend: Test verifier against `fixtures/proof-vectors.json` | Frontend | |
| 9.5 | Frontend: End-to-end login → publish → verify → correct → verify | Frontend | |
| 9.6 | Frontend: QR pixel decode and verify URL resolves | Frontend | |
| 9.7 | Frontend: Browser verifier agrees with offline verifier | Frontend | |
| 9.8 | Sync: `git pull origin backend/h8-core` before each session | Both | |
| 9.9 | Sync: `git push origin frontend` after each session | Frontend | |

---

## Phase 10: Git & Coordination (Both)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 10.1 | Backend: Never push to `frontend` branch | Backend | |
| 10.2 | Frontend: Never push to `backend/h8-core` branch | Frontend | |
| 10.3 | No force-push or history rewrite | Both | |
| 10.4 | Report API contract mismatches immediately | Both | |
| 10.5 | Coordinate missing endpoints before implementing | Both | |
| 10.6 | Push final demo-ready code | Both | |

---

## Quick Status Summary

- **Backend:** 100% complete, tested, pushed to `backend/h8-core`
- **Frontend:** Not started — waiting for you to clone and begin
- **Shared contract:** `docs/API.md`, `docs/openapi.json`, `docs/frontend-contract/api.types.ts`
- **Fixtures:** `fixtures/proof-vectors.json`, `fixtures/frontend.json`
- **PDF prompt:** `Frontend_Partner_Prompt.pdf` (6 pages, ready to send)

---

## Next Immediate Action

1. **Send** `Frontend_Partner_Prompt.pdf` to your frontend partner.
2. **Tell them** their branch is `frontend` and to pull `backend/h8-core` for docs.
3. **Share** your frontend dev origin (e.g., `http://localhost:5173`) so backend can set `FRONTEND_ORIGIN`.
4. **Start** at Pointer 0.1 and work down the list.
