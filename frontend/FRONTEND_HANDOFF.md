# Frontend handoff

**Objective:** Keep verification evidence-driven while connecting the frontend to the backend’s actual protocol. Application milestone: `d565311` on `frontend`.

## Resume

```sh
git switch frontend
git fetch --prune origin
git branch -r
cd frontend
npm ci
npm run dev
```

**Exact next step:** When `origin/backend/h8-core` appears, list its documentation with `git ls-tree -r --name-only origin/backend/h8-core`. Read available files using `git show origin/backend/h8-core:<path>` without switching branches. Confirm the public evidence endpoint and protocol against a running backend and obtain proof test vectors before changing `verifyReference`.

## Code map

- `src/app.tsx`: routes and shared page structure. `src/styles.css`: design tokens, responsive layout and A4 print rules.
- `src/services/api.ts`: mock/live boundary and QR URL parsing. `model.ts` holds UI types, **not** backend wire schemas. `demo.ts` and `workspace.tsx` contain synthetic records and transient staff operations.
- `src/pages/Verify.tsx` and `Student.tsx`: public result evidence, local image reader, student portal and marksheet.
- `src/pages/Workflows.tsx` and `Audit.tsx`: staff forms, correction views, fixture-based lab, audit and ledger screens.
- `src/test/` and `e2e/`: Vitest / Testing Library and Playwright coverage. Use the README commands.

Backend docs, staging URL, role/session rules, trusted keys, and real signed proof fixtures were unavailable. Follow [Integration notes](INTEGRATION_NOTES.md). Keep mock mode separate and retain the fail-closed path.

## Branch integration (once both milestones are ready)

From a clean checkout, fetch both branches and create a new integration branch from `origin/main`. Merge the reviewed backend reference and the local `frontend` branch there, then run backend tests and `npm run build`, `npm test`, and `npm run test:e2e` in `frontend/`. Repeat the demo against real staging data with mock mode disabled before proposing a merge. Do not merge unfinished backend work into `frontend` or push without approval.

```sh
git switch -c integration/verimark origin/main
git merge --no-ff origin/backend/h8-core
git merge --no-ff frontend
```
