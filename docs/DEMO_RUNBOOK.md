# VeriMark Judge Demo Runbook

Reproducible live demonstration of tamper detection, correction, and verification. All destructive steps run on a **disposable PostgreSQL schema** that is dropped automatically. Existing development publications, keys, and Git history are untouched.

## Prerequisites

- Repository on branch `backend/h8-core`
- Isolated PostgreSQL cluster running on `127.0.0.1:55432` (created by `npm run dev:setup`)
- `.env` present with `DATABASE_URL`, `JWT_SECRET`, `KEY_DIRECTORY`, `LOCAL_ATTACK_TESTS=1`
- Node 24, npm installed

## Prepare

```powershell
npm ci
npm run dev:setup        # only if the cluster is not running
npm run db:generate
npm run db:migrate
npm run db:seed
npm test                 # confirm green before demo: 104 passed, 0 failed
```

Read `.local/demo-credentials.json` privately for account passwords. Do not print or paste it.

## Run the demo

```powershell
npm run demo -- --export-fixtures
```

This starts the API, executes six real HTTP journeys against a disposable schema, independently verifies evidence, performs direct SQL tampering, runs two-signature correction, decodes a QR image, tests rollback against a checkpoint, then drops the disposable schema and stops the API.

Expected summary output:

```json
{
  "journeys": 6,
  "sqlTamper": { "code": "DATABASE_FIELD_MISMATCH", "field": "result.marks.0.score", "expected": 75, "actual": 99 },
  "forgedApproval": "REJECTED",
  "firstApprovalApplied": false,
  "secondApprovalApplied": true,
  "original": "VALID_HISTORICAL",
  "corrected": "VALID_CURRENT",
  "qrDecoded": true,
  "rollbackWithWitness": "INVALID",
  "rollbackWithoutWitness": "VALID_CURRENT",
  "finalAudit": "VALID",
  "disposableSchema": "vmtest_..."
}
```

Artifacts:
- `.local/judge-evidence.json` — machine-readable demo evidence (synthetic)
- `.local/judge-marksheet.html` — printable marksheet HTML with QR
- `fixtures/proof-vectors.json` — signed fixtures for verifier agreement testing (when `--export-fixtures` is used)

## Demo presentation flow

| Step | Action | Expected output |
|---|---|---|
| 1 | Show student result with 75 marks | Result record returned |
| 2 | Publish and obtain signed evidence | `VALID_CURRENT`, receipt + checkpoint |
| 3 | Verify original result | Independent verifier: `VALID_CURRENT` |
| 4 | Tamper marks directly in disposable PostgreSQL: 75 → 99 | SQL update succeeds (bypasses API) |
| 5 | Run independent verification + integrity audit | Verification still `VALID_CURRENT` for signed proof; audit `INVALID` with finding `expected:75, actual:99` |
| 6 | Show exact failure | `result.marks.0.score` mismatch reported |
| 7 | Reset disposable data | Schema dropped automatically; no manual cleanup |
| 8 | Propose legitimate correction with reason | Proposal returned with digest |
| 9 | Show one signature is insufficient | First approval: `applied: false`, version unchanged |
| 10 | Submit second distinct valid signature | Second approval: `applied: true`, version 2 |
| 11 | Verify corrected result | `VALID_CURRENT`, marks 80 |
| 12 | Verify historical original | `VALID_HISTORICAL`, original marks 75 preserved |
| 13 | Demonstrate QR verification | QR PNG decodes to `/verify?receipt=...`; endpoint returns verifiable evidence |

## Manual demo steps (if running piece by piece)

```powershell
# Start API in one terminal
npm start

# In another terminal, run the six-journey demo
npm run demo -- --export-fixtures

# Offline verify saved evidence
node scripts/verify-file.js .local/judge-evidence.json .local/keys/institution.public.pem

# Export and verify with checkpoint witness
node --env-file=.env scripts/export-checkpoint.js .local/checkpoint-demo.json
node scripts/verify-file.js .local/judge-evidence.json .local/keys/institution.public.pem .local/judge-receipt.json .local/checkpoint-demo.json
```

## Cleanup and recovery

- The disposable schema is dropped automatically at the end of `npm run demo`.
- If the process is interrupted, drop leftover schemas manually:
  ```powershell
  # List disposable schemas
  & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -p 55432 -U verimark -d verimark -tAc "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'vmtest_%'"
  ```
- Restart the API: `npm start`
- Restart the cluster: `npm run dev:setup`
- Stop the cluster: `& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D .local/pgdata -m fast -w stop`

## Labels

- Steps requiring frontend: QR rendering in React, independent browser verification (verifier module exists at `shared/browser-verifier.js`; tested via Node WebCrypto, not yet in a browser UI)
- Steps requiring physical phone/printer: not tested; label as manual verification pending
- No hidden manual edits or fictitious verification output are used

## Rollback protection honesty

- Local checkpoint file: `ROLLBACK_BELOW_WITNESS` detected when chain is shorter than retained checkpoint
- This is **not** an independently operated witness. Do not present it as full rollback protection in front of judges without configuring an external checkpoint publication channel.