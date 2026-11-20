# Frontend progress

**Branch:** `frontend`, based on `origin/main` (`da6706d`). **Implementation milestone:** `d565311` — Build VeriMark demo frontend and verification workflows. Handoff documentation follows as a separate commit. No push.

| Area | Current state |
| --- | --- |
| Public | Landing, reference lookup, sample QR deep link, local QR image decoding, evidence checklist with four outcome renderings. Both runtime adapters return unavailable until real proof is wired. |
| Student | Synthetic profile, exam history, individual marks, totals/grades, sample publication reference and correction history, A4 marksheet. No signed receipt. |
| Staff | Overview, searchable/filterable/paginated directories and result tables, history, validated publication form and confirmation. Manual demo entries are staff-session-only. No CSV import. |
| Corrections | Validated session-only proposals and original/proposed comparison; pending, illustrated approved and rejected fixtures; two approval slots, no simulated signing. |
| Integrity / auditor | Mock 85 → 95 field comparison, event history, audit categories, example correction, checkpoint placeholders. No live detection or verification failure feed. |

## Verification performed

- `npm.cmd run build` passed; Rollup emits non-blocking dependency annotation warnings in Zod.
- `npm.cmd test` passed: six tests, including rendering states, invalid input, loading/error, and cross-origin QR rejection.
- `$env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e` passed: seven browser tests; all 15 routes/fallback at 1440 and 360 px, table, publication/confirmation, corrections, lab, QR round trip and one-page A4 output, and disconnected mode.
- Real integration: no requests executed. `origin/backend/h8-core` and API/proof docs were absent when fetched. The live-mode test checks that the UI fails closed without a configured service; transport failure is tested with an injected rejection.

## Remaining

Agree proof and authentication contracts, wire the live public verifier and signed marksheet receipt, connect authenticated reads and publication/import, connect real correction signing and audit findings. Cross-browser print, real-device camera scanning, and assistive technology review remain untested. QR image upload is supported; an embedded live camera reader is not implemented. Status feedback is inline; no global toast queue.
