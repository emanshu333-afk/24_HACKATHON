# Backend integration notes

Contract source: `origin/backend/h8-core` at `21e766c` (`docs/API.md`, `docs/PROOF_SPEC.md`, frontend types, `shared/browser-verifier.js`, `shared/canonical.js`). Frontend dev/CORS origin: **`http://localhost:5173`**. Local API: `http://localhost:3000`. The frontend branch does not merge backend code.

The adapter and historical live smoke evidence predate the frontend-only hardening pass. That pass made no live requests and did not change endpoint or signed-byte semantics. Reconfirm the target contract, API origin, and out-of-band SPKI key, then repeat full-stack testing only with explicit authorization.

## Connected API

| Area | Operations used |
| --- | --- |
| Sessions | `POST /auth/login`, `GET /me`; memory-only bearer, 401/expiry re-login |
| Directories, results | `GET /students`, `/exams`, `/results`, `/results/:id/history`; live detail uses the history envelope |
| Publication | `POST /results`; client validates subject code, uniqueness, mark range and count |
| Print and proof | `GET /results/:id/receipt/:version`, `GET /verify?receipt=…`; React renders verified marks with a frontend verify QR. The reader accepts exact configured API verify URLs and extracts the token without following the scanned URL. Confirm that printed QR origins match the frontend or API configuration; the React page does not embed the API's printable HTML. |
| Corrections | `GET /corrections`, `POST /results/:id/corrections`, `POST /corrections/:id/approvals`; inherited status is described as recorded until checked via the corrected signed receipt |
| Audit | `GET /ledger/events?after=&limit=`, `POST /audits`; field, expected/observed and category shown when provided |

**Contract update:** `a95b39b` adds `GET /ledger/events` to OpenAPI, resolving the previous mismatch. The reviewed proof spec and TypeScript contract did not change between `21e766c` and `a95b39b`.

## Trust and privacy

- The verifier uses the backend's canonical encoding, signed checkpoint and Ed25519 rules. It independently checks the original receipt, commitments, full chain, approval certificates/signatures and signed checkpoint with `VITE_INSTITUTION_PUBLIC_KEY`. It compares the displayed server payload to signed data before showing marks. Missing proof, unsupported browser crypto, missing trust key or inconsistent status produces unavailable.
- Current means current **within the offered checkpoint**. No independent witness is configured in this UI. Full-chain history exposes pseudonymous marks; do not log or share receipt capability URLs indiscriminately.
- Send only a detached signature to the approval endpoint. A stale proposal needs a new base/version and new signatures. The React application does not ingest private signing keys.

## Repeat public smoke

Set `VERIMARK_PUBLIC_SMOKE_URL` to the authorized API base before running `npm run test:e2e -- --grep 'public tunnel'`. Optionally provide the out-of-band **public** PEM as `VERIMARK_PUBLIC_SMOKE_KEY` to check the live signed checkpoint. These tests use only unauthenticated GETs. The authenticated test is manual; see [Integration Test Report](INTEGRATION_TEST_REPORT.md).
