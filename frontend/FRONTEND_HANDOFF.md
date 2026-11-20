# Frontend handoff

**Objective:** Prepare the integrated application for the shared demo. Frontend starts from demo commit `d565311` and handoff `c8c5320`; the live integration targets `origin/backend/h8-core` at `21e766c`.

## Resume

```sh
git switch frontend
git fetch --prune origin
git branch -r
cd frontend
npm ci
npm run dev
```

**Exact next step:** Obtain the complete institution public key out of band, set `VITE_INSTITUTION_PUBLIC_KEY` in the ignored `.env.local`, and restart Vite. The active tunnel passed browser HTTP/CORS checks; the supplied key was malformed. Follow the [manual role checklist](INTEGRATION_TEST_REPORT.md) using rotated account access in your own browser. Confirm physical QR reachability and CORS before the shared demo.

## Code map

- `src/app.tsx`: routes and shared page structure. `src/styles.css`: design tokens, responsive layout and A4 print rules.
- `src/services/http.ts`, `wire.ts`, `session.tsx`: typed HTTP, wire shapes, and memory-only JWT. `src/services/proof/`: pinned-key independent verifier. `api.ts`, `demo.ts`, `workspace.tsx`: mock data and QR input handling.
- `src/pages/Verify.tsx` and `Student.tsx`: public result evidence, local image reader, student portal and marksheet.
- `src/services/verification-input.ts` owns bounded reference/receipt parsing. `src/components/EvidenceInspector.tsx` owns expandable outcome details and trust explanations.
- `src/pages/LiveAccount.tsx`, `LiveResults.tsx` and `LiveWorkflows.tsx`: real account, result history, proof-backed printing, publication, externally signed approvals, ledger and audit routes.
- `src/test/` and `e2e/`: Vitest / Testing Library and Playwright coverage. Use the README commands.

An earlier milestone used a disposable local backend. The current workstation is configured in ignored `.env.local` for the temporary HTTPS tunnel; the trusted public key is deliberately blank pending replacement. No live authenticated requests were tested on the tunnel.

## Branch integration (once both milestones are ready)

From a clean checkout, fetch both branches and create a new integration branch from `origin/main`. Merge the reviewed backend reference and the local `frontend` branch there, then run backend tests and `npm run build`, `npm test`, and `npm run test:e2e` in `frontend/`. Repeat the demo against real staging data with mock mode disabled before proposing a merge. Do not merge unfinished backend work into `frontend` or push without approval.

```sh
git switch -c integration/verimark origin/main
git merge --no-ff origin/backend/h8-core
git merge --no-ff frontend
```
