# VeriMark — Every Mark Has Proof

React + TypeScript frontend for exam publication, marksheets, public evidence checks, and integrity review.

## Run locally

Requires Node.js 22.12+ and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Copy `.env.example` to `.env.local` and restart Vite after changing configuration. `VITE_MOCK_MODE=true` (default) displays synthetic records. Demo publications and correction proposals last only while navigating the staff workspace.

For an **authorized** integration session, set `VITE_MOCK_MODE=false`, `VITE_API_BASE_URL=http://localhost:3000`, and `VITE_INSTITUTION_PUBLIC_KEY` to the **independently supplied SPKI PEM public key** (literal `\n` separators are accepted). Set backend `FRONTEND_ORIGIN=http://localhost:5173`. Use seeded credentials directly in the login form; on refresh, sign in again. All `VITE_` variables are public: never set a private key, password or token there.

The live marksheet renders only after the browser independently checks the receipt and evidence. Corrections use downloaded proposal JSON, the institution's offline signer (`node scripts/sign-proposal.js proposal.json own-private.pem` in the backend checkout), and detached signatures pasted under each approver's account. Private keys stay with the signer.

## Demo walkthrough

1. Open **Student portal → Semester II Finals** to inspect the marksheet, then print to A4 or follow its QR link. For a phone scanning a printed sample, serve the frontend on a host reachable from the phone; a localhost URL only works on the same device.
2. Open **Verify a result** and try `VM-SP26-017-V1`, or upload an image of the QR. The browser reads images locally; the example deliberately reports **Verification unavailable**.
3. Open **Staff workspace → Tamper Detection Lab** and compare published 85 against snapshot 95. Switch to the unchanged or missing-evidence examples to see why a comparison is not proof. Follow the audit and correction links for a separate two-review example.
4. Open **Publish results** and select Avery Patel / Summer Assessment to try a new sample publication. Confirm it and inspect the staff publication history. It does not generate a public receipt.

## Build and test

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome. The browser suite starts local frontend servers on ports 4173–4175. Fetch the backend ref or point `VERIMARK_PROOF_VECTORS` at its `fixtures/proof-vectors.json` to exercise the signed browser vectors. Optional public tunnel checks are described in [Integration notes](INTEGRATION_NOTES.md); authenticated checks are [manual](INTEGRATION_TEST_REPORT.md).

Production output is `dist/`; serve over HTTPS with SPA fallback for `/verify?receipt=…` and other deep links. Use a frontend origin reachable by the phone that scans a printed QR; localhost works only on the machine serving it. The QR reader accepts links on the frontend verify route or the configured API verify route. Pasted or scanned receipts stay in memory, but incoming deep links themselves grant access to proof data and should not be logged or shared indiscriminately.

See [Integration notes](INTEGRATION_NOTES.md) for backend requirements, [Progress](FRONTEND_PROGRESS.md) for coverage, and [Handoff](FRONTEND_HANDOFF.md) for resuming work.
