# Integration test report — Nov 20, 2026

Target: `https://exports-focusing-cited-feof.trycloudflare.com`. Browser origin: `http://localhost:5173`. Backend contract reviewed at `a95b39b`. The URL is temporary.

| Scope | Status | Observation |
| --- | --- | --- |
| `GET /health` | PASS | `200`, status `ok`, correct CORS origin; also confirmed in Chrome. |
| `OPTIONS /auth/login` | PASS | `204`, permits the frontend origin and `Content-Type`. No login submitted. |
| `GET /checkpoints/latest` | PASS (HTTP) | `200`, signed checkpoint envelope returned. Fetching it is not verification. |
| `GET /verify` without a receipt | PASS | Expected `400 INVALID_RECEIPT_ENCODING`. |
| `GET /me` without authentication | PASS | Expected `401 UNAUTHORIZED`. |
| Live checkpoint signature and valid receipt flow | BLOCKED | Supplied key was malformed (43 decoded bytes; Ed25519 SPKI needs 44). Request the exact public PEM separately and match the current checkpoint signer fingerprint `275aa496dc9f57a71cab635640effc9d57c91cac605999502bd2446bff904587`. Never trust a pin copied from a proof response. |
| Login, publication, student access, two signatures, audit | MANUAL REQUIRED | Live authenticated requests were not executed. |
| Browser verification with signed synthetic proof vectors | PASS | Current, historical, corrected and tampered evidence; modified displayed marks and receipt signature, missing proof, foreign QR, role navigation and expiry. |

`npm.cmd run build` passed with existing Zod dependency warnings. `npm.cmd test` passed 17/17. Chrome `npm.cmd run test:e2e` with `VERIMARK_PUBLIC_SMOKE_URL` set passed 23, skipped the live signed-checkpoint check, and had no final failures. Earlier failures exposed the malformed SPKI, local live config leaking into unit tests, and an intermediate test syntax error; final build and suites passed after isolating unit config and correcting the test.

## Manual checklist (use disposable synthetic data)

1. Have the backend owner rotate the demo account access. Once they provide a complete public PEM, set the trusted pin in ignored `.env.local`. Run `npm.cmd run dev` from `frontend/`, then open `http://localhost:5173/login` in your own browser.
2. **Admin:** Sign in directly in the form. Publish a new result for an unused synthetic student/exam pair. Open history and verify its signed receipt as current. Sign out.
3. **Student:** Sign in to the account that owns the result, confirm the correct marks and version, and open the printable marksheet. Check A4 preview and open its QR verification link. Use a reachable frontend address for a physical phone, not its localhost. Sign out.
4. **Admin, then Approver A and Approver B:** As admin, propose a correction with a reason. In separate sessions, each approver downloads the exact proposal, signs it with the institution's offline process, and submits only the detached signature. Check that the first approval leaves the result unchanged, the second creates the corrected version, and the original verifies as historical. Sign out between roles.
5. **Auditor:** Run a clean audit and inspect ledger/correction history. Only if the backend owner prepares the disposable 75 → 99 demonstration, rerun the audit and verify the result ID, field, expected 75 and observed 99. The frontend does not change the database directly.
6. Report only pass/fail, the HTTP status, and any redacted error code. Do not share passwords, session data, receipt URLs, or signing keys in reports.
