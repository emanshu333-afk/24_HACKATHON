# VeriMark — Every Mark Has Proof

React + TypeScript frontend for exam publication, marksheets, public evidence checks, and integrity review.

## Run locally

Requires Node.js 22.12+ and npm. From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. To configure locally, copy `.env.example` to `.env.local` and restart Vite. `VITE_MOCK_MODE=true` (default) displays synthetic records. Demo publications and correction proposals only persist while navigating the staff workspace; leaving it or reloading resets them. Set `VITE_MOCK_MODE=false` to hide synthetic records and disable the demo workspace. `VITE_API_BASE_URL` is reserved for the live adapter; changing it does not activate any endpoint. `VITE_` variables are public build-time configuration, never secrets.

## Demo walkthrough

1. Open **Student portal → Semester II Finals** to inspect the marksheet, then print to A4 or follow its QR link. For a phone scanning a printed sample, serve the frontend on a host reachable from the phone; a localhost URL only works on the same device.
2. Open **Verify a result** and try `VM-SP26-017-V1`, or upload an image of the QR. The browser reads images locally; the example deliberately reports **Verification unavailable**.
3. Open **Staff workspace → Tamper Detection Lab** and compare published 85 against snapshot 95. Follow the audit and correction links to see the sample field finding and a separate two-review example.
4. Open **Publish results** and select Avery Patel / Summer Assessment to try a new sample publication. Confirm it and inspect the staff publication history. It does not generate a public receipt.

## Build and test

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome instead of downloading Chromium. The browser suite starts Vite on local ports 4173 and 4174. Production output is `dist/`; configure the host to serve `index.html` for application deep links, including `/verify?ref=…`. Serve production over HTTPS.

See [Integration notes](INTEGRATION_NOTES.md) for backend requirements, [Progress](FRONTEND_PROGRESS.md) for coverage, and [Handoff](FRONTEND_HANDOFF.md) for resuming work.
