# Backend integration notes

Contract source: `origin/backend/h8-core` at `21e766c` (`docs/API.md`, `docs/PROOF_SPEC.md`, frontend types, `shared/browser-verifier.js`, `shared/canonical.js`). Frontend dev/CORS origin: **`http://localhost:5173`**. Local API: `http://localhost:3000`. The frontend branch does not merge backend code.

## Connected API

| Area | Operations used |
| --- | --- |
| Sessions | `POST /auth/login`, `GET /me`; memory-only bearer, 401/expiry re-login |
| Directories, results | `GET /students`, `/exams`, `/results`, `/results/:id/history`; live detail uses the history envelope |
| Publication | `POST /results`; client validates subject code, uniqueness, mark range and count |
| Print and proof | `GET /results/:id/receipt/:version`, `GET /verify?receipt=…`; React renders verified marks directly, with a frontend `/verify` link in the QR. The reader also accepts receipt URLs from the backend marksheet; it extracts the token and requests only the configured API. The React page does not embed the API's printable HTML. |
| Corrections | `GET /corrections`, `POST /results/:id/corrections`, `POST /corrections/:id/approvals`; inherited status is described as recorded until checked via the corrected signed receipt |
| Audit | `GET /ledger/events?after=&limit=`, `POST /audits`; field, expected/observed and category shown when provided |

**Contract mismatch:** `docs/openapi.json` at `21e766c` omits `GET /ledger/events`; `docs/API.md` and `src/app.js` both include it. Add that GET operation to OpenAPI when updating the backend spec. The integration packet summarizes login rate and health responses differently from `docs/API.md`; the UI handles the status generically and does not assume a rate or health failure code.

## Trust and privacy

- The verifier uses the backend's canonical encoding, signed checkpoint and Ed25519 rules. It independently checks the original receipt, commitments, full chain, approval certificates/signatures and signed checkpoint with `VITE_INSTITUTION_PUBLIC_KEY`. It compares the displayed server payload to signed data before showing marks. Missing proof, unsupported browser crypto, missing trust key or inconsistent status produces unavailable.
- Current means current **within the offered checkpoint**. No independent witness is configured in this UI. Full-chain history exposes pseudonymous marks; do not log or share receipt capability URLs indiscriminately.
- Send only a detached signature to the approval endpoint. A stale proposal needs a new base/version and new signatures. The React application does not ingest private signing keys.

## Repeat live smoke

Start a **fresh, seeded disposable** backend with `FRONTEND_ORIGIN=http://localhost:5173` and no existing publication for the seed pair. Set the following environment variables before running `npm run test:e2e -- --grep 'real API'` in `frontend/` (the test publishes a result):

| Variable | Value |
| --- | --- |
| `VERIMARK_SMOKE_BACKEND` | `http://localhost:3000` |
| `VERIMARK_SMOKE_CREDENTIALS_FILE` | Absolute path to backend `.local/demo-credentials.json` |
| `VERIMARK_SMOKE_PUBLIC_KEY_FILE` | Absolute path to independently obtained `.local/keys/institution.public.pem` |
| `VERIMARK_SMOKE_SIGNER` | Optional absolute path to backend `scripts/sign-proposal.js`; enables the two-approver journey with disposable keys adjacent to the test public key |

The signed-vector suite reads only the selected vector fields from the committed backend fixture; it does not use runtime signing secrets. Keep backend test credentials and private keys outside the frontend workspace and Git.
