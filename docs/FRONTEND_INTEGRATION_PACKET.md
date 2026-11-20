# Frontend Integration Packet — VeriMark

Copy and send Section 6 directly to the React developer on branch `frontend`. This packet describes the backend that actually exists on `backend/h8-core`. It contains no private keys, credentials, or secrets.

## Metadata

- Repository: `git@github.com:emanshu333-afk/24_HACKATHON.git`
- Backend branch: `backend/h8-core`
- Frontend branch: `frontend` (untouched; do not merge or modify without coordination)
- Backend API base (local dev): `http://localhost:3000`
- Frontend origin (local dev): `http://localhost:5173`
- API contract: `docs/API.md`, `docs/openapi.json`
- Proof protocol: `docs/PROOF_SPEC.md`
- TypeScript types: `docs/frontend-contract/api.types.ts`
- Synthetic fixtures: `fixtures/frontend.json`, `fixtures/proof-vectors.json`
- Architecture overview: `docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md`

## Section A — Complete API inventory

Every implemented endpoint below is tested and real. No endpoints are invented.

| # | Method | Path | Auth | Role | Purpose |
|---|---|---|---|---|---|
| 1 | GET | `/health` | None | — | SQL-backed health |
| 2 | POST | `/auth/login` | None | — | Login, returns JWT |
| 3 | GET | `/me` | Bearer | Any | Current user |
| 4 | GET | `/students` | Bearer | Staff | List students |
| 5 | GET | `/exams` | Bearer | Any | List exams |
| 6 | POST | `/results` | Bearer | ADMIN | Publish result |
| 7 | GET | `/results` | Bearer | Any | List results (students own only) |
| 8 | GET | `/results/:id` | Bearer | Any + ownership | Result detail |
| 9 | GET | `/results/:id/history` | Bearer | Any + ownership | Version history |
| 10 | GET | `/results/:id/receipt/:version` | Bearer | Any + ownership | Signed receipt + verify URL |
| 11 | GET | `/results/:id/marksheet/:version` | Bearer | Any + ownership | Printable HTML with QR |
| 12 | GET | `/verify` | None | — | Public receipt verification (query) |
| 13 | POST | `/verify` | None | — | Public receipt verification (body) |
| 14 | POST | `/results/:id/corrections` | Bearer | ADMIN | Propose correction |
| 15 | GET | `/corrections` | Bearer | Staff | List proposals |
| 16 | GET | `/corrections/:id` | Bearer | Staff | Proposal detail + approvals |
| 17 | POST | `/corrections/:id/approvals` | Bearer | APPROVER | Add approval signature |
| 18 | GET | `/checkpoints/latest` | None | — | Latest signed checkpoint |
| 19 | POST | `/audits` | Bearer | ADMIN/AUDITOR | Integrity audit |
| 20 | GET | `/ledger/events` | Bearer | Staff | Paginated ledger events |

### Detailed entries

**1. GET /health**
- Request: none
- Success 200: `{ "status": "ok" }`
- Failure 503: `{ "error": "DATABASE_UNAVAILABLE" }`

**2. POST /auth/login**
- Request: `{ "email": "admin@verimark.test", "password": "<from .local/demo-credentials.json>" }`
- Success 200: `{ "token": "<JWT>", "expiresIn": 3600, "user": { "id": "...", "role": "ADMIN", "email": "..." } }`
- Failures: 400 validation, 401 invalid credentials, 429 rate limit (21/min/IP)

**3. GET /me**
- Success 200: `{ "id": "...", "email": "...", "role": "ADMIN", "studentId": null|UUID }`

**4. GET /students**
- Success 200: `[{ "id": "...", "code": "UNI2026001", "name": "Avery Example" }]`

**5. GET /exams**
- Success 200: `[{ "id": "...", "code": "CS-SEM1-2026", "title": "Computer Science — Semester 1, 2026" }]`

**6. POST /results**
- Request: `{ "studentId": "<UUID>", "examId": "<UUID>", "marks": [{ "subject": "CS101", "score": 86, "max": 100 }] }`
- Success 201: `{ "resultId": "...", "version": 1, "receipt": {...}, "checkpoint": {...} }`
- Failures: 400 validation/unknown reference, 409 ALREADY_PUBLISHED

**7. GET /results**
- Success 200: `[{ "id": "...", "studentId": "...", "examId": "...", "currentVersion": 1, "marks": [...], "exam": { "id": "...", "code": "...", "title": "..." } }]`

**8. GET /results/:id**
- Success 200: current result record

**9. GET /results/:id/history**
- Success 200: `[{ "id": "...", "resultId": "...", "version": 1, "data": {...}, "commitment": "...", "event": {...} }]`

**10. GET /results/:id/receipt/:version**
- Success 200: `{ "receipt": { "body": {...}, "signature": "..." }, "verificationUrl": "http://localhost:3000/verify?receipt=..." }`

**11. GET /results/:id/marksheet/:version**
- Success 200: `text/html` printable marksheet with QR PNG data URL

**12. GET /verify?receipt=TOKEN**
- Success 200: `{ "verification": {...}, "evidence": { "events": [...], "checkpoint": {...} } }`
- Failure 400: malformed or forged receipt

**13. POST /verify**
- Request: `{ "receipt": { "body": {...}, "signature": "..." } }`
- Success 200: same as GET /verify

**14. POST /results/:id/corrections**
- Request: `{ "baseVersion": 1, "marks": [...], "reason": "Recount confirmed..." }`
- Success 201: proposal `{ "id": "...", "baseVersion": 1, "body": {...}, "digest": "...", "applied": false }`

**15. GET /corrections**
- Success 200: `[{ ...proposal, "approvals": [...] }]`

**16. GET /corrections/:id**
- Success 200: proposal with approvals

**17. POST /corrections/:id/approvals**
- Request: `{ "signature": "<86-char base64url Ed25519>" }`
- Success 200 first: `{ "proposalId": "...", "approvalCount": 1, "applied": false }`
- Success 200 second: publication response plus `{ "proposalId": "...", "approvalCount": 2, "applied": true }`
- Failures: 400 invalid signature/proposal, 403 unregistered approver, 409 duplicate/stale/applied

**18. GET /checkpoints/latest**
- Success 200: `{ "body": {...}, "signature": "..." }`

**19. POST /audits**
- Success 200: `{ "status": "VALID", "findings": [], "freshness": "...", "checkpointSequence": N }`
- Failure: `{ "status": "INVALID", "findings": [...] }`

**20. GET /ledger/events?after=0&limit=25**
- Success 200: `{ "events": [{ "body": {...}, "hash": "...", "signature": "..." }], "nextAfter": 1 }`

### Verification statuses

| Status | Meaning | Frontend should display |
|---|---|---|
| `VALID_CURRENT` | Latest version within signed checkpoint | Verified current result |
| `VALID_HISTORICAL` | Valid original, superseded by authorized correction | Verified historical result |
| `INVALID` | Tampered/forged evidence | Not verified |
| `INCOMPLETE` | Missing evidence / WebCrypto unavailable | Verification unavailable |

Never display `verified: true` alone. Always check `failures` is empty and run independent verification against the pinned institution public key.

## Section B — Frontend page to API mapping

| Frontend page | Required endpoint | Role | Implemented | Integration notes |
|---|---|---|---|---|
| Login | POST /auth/login | Public | Yes | Store JWT in memory |
| Administrator dashboard | GET /results, GET /students, GET /exams | ADMIN | Yes | Use lists to pick IDs for publication |
| Student dashboard | GET /results (own), GET /me | STUDENT | Yes | studentId from /me filters results |
| Result publication | POST /results | ADMIN | Yes | Validate marks client-side too; server rejects invalid |
| Result listing | GET /results | Any | Yes | Students see own rows only |
| Individual result details | GET /results/:id | Any + ownership | Yes | Current projection, not proof |
| Printable marksheet | GET /results/:id/marksheet/:version | Any + ownership | Yes | Render HTML in controlled window/Blob |
| QR verification | GET /verify?receipt=... | Public | Yes | Independently verify evidence |
| Public verification | POST /verify | Public | Yes | For receipts not from QR |
| Correction proposal | POST /results/:id/corrections | ADMIN | Yes | Returns proposal digest to sign |
| First approval | POST /corrections/:id/approvals | APPROVER | Yes | Sign locally, submit own JWT |
| Second approval | POST /corrections/:id/approvals | APPROVER | Yes | Same endpoint; second applies |
| Correction timeline | GET /corrections, GET /corrections/:id | Staff | Yes | Shows applied state and approvals |
| Ledger explorer | GET /ledger/events | Staff | Yes | Paginated, bounded |
| Integrity audit | POST /audits | ADMIN/AUDITOR | Yes | Returns field-level tamper findings |
| Tamper detection lab | POST /audits + GET /verify | Auditor/Public | Yes | SQL tampering detected by audit/proof |
| User registration | — | — | MISSING | No endpoint; accounts seeded locally |
| Password reset | — | — | MISSING | Not implemented |
| Refresh token | — | — | MISSING | JWT 1-hour expiry; re-login |

Missing pages are not stubbed; if you need them, propose the API and we coordinate before implementation.

## Section C — Frontend data types

See `docs/frontend-contract/api.types.ts`. It compiles under `tsc --strict --lib ES2022,DOM`. Key interfaces:

- `LoginRequest`, `LoginResponse`, `User`, `Me`
- `Student`, `Examination`
- `Mark`, `Marks`
- `PublishRequest`, `ResultRecord`, `ResultListItem`
- `PublishedData` (the signed canonical shape: `format`, `resultId`, `studentId`, `examId`, `version`, `marks`)
- `ResultReceipt` = `{ body: ReceiptBody, signature }`
- `Verification`, `VerificationResponse`
- `CorrectionRequest`, `ApprovalRequest`, `CorrectionProposal`, `CorrectionDetails`
- `IntegrityAudit`, `IntegrityAuditFinding`
- `ApiError`
- `VerifyOptions`, `BrowserVerifier`

Copy this file into your frontend package. Do not put private keys or credentials here.

## Section D — Authentication integration

1. Call `POST /auth/login` with `{email, password}`.
2. Save `token` in memory. Send `Authorization: Bearer <token>` on protected requests.
3. JWT expires in 3600 seconds. No refresh token; re-login after expiry.
4. Role comes from server DB lookup, not from JWT claims.
5. Student users can only access their own results.
6. CORS is restricted to one `FRONTEND_ORIGIN`; configure it to your dev origin.
7. Logout = delete the token. No server-side session to invalidate.
8. Login failures return generic `INVALID_CREDENTIALS`; no user enumeration or password details.

## Section E — Real cryptographic verification (critical)

### What the QR code contains

The QR PNG on the marksheet encodes:
`http://localhost:3000/verify?receipt=<base64url(JSON signed receipt)>`

The receipt body contains: `format`, `resultId`, `version`, `commitment`, `eventHash`, `signer`. It contains **no student names or personal information**.

### How the frontend obtains receipt/proof

- From `GET /results/:id/receipt/:version` → `{ receipt, verificationUrl }`
- From QR scan → parse the `receipt` query parameter from the verification URL
- Call `GET /verify?receipt=<token>` → `{ verification, evidence }`

### Exact canonical bytes signed

Source: `docs/PROOF_SPEC.md`, `shared/canonical.js`.

- Canonical JSON: sorted object keys, ordered arrays, safe integers only, no floats/undefined, UTF-8
- `bytes(domain, x) = UTF8("VERIMARK/v1/" + domain + NUL + canonical(x))`
- Event signature signs `{ hash: eventHash }` in `event-signature` domain
- Approval signature signs `{ proposalDigest: SHA-256(proposal) }` in `approval` domain
- Receipt signs its body directly in `receipt` domain

### Message domain

Domains: `result`, `event`, `event-signature`, `proposal`, `approval`, `checkpoint`, `receipt`, `approver-certificate`.

### Hash and signature algorithms

- Hash: SHA-256
- Signature: Ed25519, base64url (86 chars)

### Trusted public key

Obtain the institution SPKI PEM Ed25519 public key out of band and pin it in the frontend. Never accept a key from the API. Test public key is in `fixtures/proof-vectors.json` (synthetic only).

### How ledger proof is checked

Use `verifyEvidence(evidence, pinnedKey, {receipt})` from `shared/browser-verifier.js`:
- Checkpoint signature and head hash
- Every event hash, signature, sequence, previous hash
- Commitment matches canonical result data
- Version monotonicity per result
- Correction certificates and exactly two valid signatures
- Proposal binding to result and base version

### How checkpoint is validated

Checkpoint is part of evidence: `{ body: {format, sequence, headHash, signer, issuedAt}, signature }`. Verify signature against pinned key and that `headHash` matches the last event hash in the offered chain.

### Current vs superseded

- `VALID_CURRENT`: offered receipt's event is the latest event for that result in the chain
- `VALID_HISTORICAL`: receipt event is valid but a later authorized correction event exists for the same result

### Invalid evidence

- `status: INVALID` with non-empty `failures` → display as not verified
- `status: INCOMPLETE` → display as unavailable, never as invalid marks

### Witness guarantees

A locally retained checkpoint file gives `AT_LEAST_WITNESSED_CHECKPOINT` freshness. It is **not** an independently operated witness. Do not claim rollback protection unless a real external witness is configured.

### Example test vectors

`fixtures/proof-vectors.json` contains synthetic signed evidence:
- `receipt`, `correctedReceipt`
- `current.evidence` → `VALID_CURRENT`
- `historical.evidence` → `VALID_HISTORICAL`
- `corrected.evidence` → `VALID_CURRENT`
- `tampered.evidence` → `INVALID`
- `rollback.witness` for checkpoint tests
- `publicKey` (synthetic test key only)

Browser verifier and Node offline verifier agree on all fixtures (tested).

## Section F — Sample frontend fixtures

Synthetic sample responses conforming to the actual API schema:

### Valid current result
```json
{ "status": "VALID_CURRENT", "failures": [], "result": { "format": "verimark-v1", "resultId": "...", "studentId": "...", "examId": "...", "version": 1, "marks": [{ "subject": "CS101", "score": 75, "max": 100 }] }, "latestVersion": 1 }
```

### Valid historical/superseded result
```json
{ "status": "VALID_HISTORICAL", "failures": [], "result": { ... version 1 ... score: 75 ... }, "latestVersion": 2 }
```

### Invalid/tampered result
```json
{ "status": "INVALID", "failures": [{ "code": "DATABASE_FIELD_MISMATCH", "field": "result.marks.0.score", "expected": 75, "actual": 99 }] }
```

### Missing result
HTTP 404 `{ "error": "RESULT_NOT_FOUND" }`

### Integrity audit finding
```json
{ "code": "DATABASE_FIELD_MISMATCH", "resultId": "...", "version": 1, "field": "result.marks.0.score", "expected": 75, "actual": 99 }
```

All fixtures are synthetic and marked as such in `fixtures/proof-vectors.json`.

## Section G — Local integration setup

### 1. Clone / fetch
```powershell
git clone git@github.com:emanshu333-afk/24_HACKATHON.git
cd 24_HACKATHON
git checkout backend/h8-core
```
Do not checkout or modify `frontend`.

### 2. Obtain backend documentation
Read `docs/API.md`, `docs/openapi.json`, `docs/FRONTEND_INTEGRATION_PACKET.md`, `docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md`, `docs/frontend-contract/api.types.ts`.

### 3. Run backend locally (optional; only if you need a local API)
```powershell
npm ci
npm run dev:setup
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm start
```
API listens on `http://localhost:3000`.

### 4. Configure VITE_API_BASE_URL
```env
VITE_API_BASE_URL=http://localhost:3000
```
If frontend and backend are on different machines, use the backend machine's LAN IP, not `localhost`.

### 5. Authenticate
Read `.local/demo-credentials.json` privately (Git-ignored). Login:
```js
await fetch(`${VITE_API_BASE_URL}/auth/login`, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ email: 'admin@verimark.test', password: '...' })
})
```
Send `Authorization: Bearer <token>` on protected requests.

### 6. Make a real test request
```js
const r = await fetch(`${VITE_API_BASE_URL}/exams`, { headers: { Authorization: `Bearer ${token}` } })
```

### 7. Verify a sample result
```js
const proof = await fetch(`${VITE_API_BASE_URL}/verify?receipt=${token}`).then(r => r.json())
// Then independently verify:
import { verifyEvidence } from './verifier.js' // ported from shared/browser-verifier.js
const checked = await verifyEvidence(proof.evidence, PINNED_INSTITUTION_PUBLIC_KEY, { receipt: proof.verification.result ? ... : undefined })
```
Check `checked.status` and `checked.failures`.

### 8. Connect React frontend
Copy `docs/frontend-contract/api.types.ts` into your frontend. Implement API client functions matching the inventory. Port `shared/browser-verifier.js` for independent proof verification.

### 9. Troubleshoot CORS/network
- CORS allows only configured `FRONTEND_ORIGIN`. Set it to your dev origin in backend `.env`.
- `localhost` on another laptop means that laptop. Use LAN IP for cross-machine testing.
- Never connect the browser directly to PostgreSQL; PostgreSQL is at `127.0.0.1:55432` on the backend machine only.

## Section H — Important warnings

- Do not trust server `verified: true` alone.
- Do not accept institution public key from HTTP; pin it out of band.
- Do not send private keys/passwords to the API.
- Do not connect browser to PostgreSQL.
- Do not inject untrusted HTML into application content.
- Do not silently rebase correction signatures after 409 stale base.
