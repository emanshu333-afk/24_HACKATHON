# VeriMark — Tamper-Proof Exam Result Ledger

Node/Express + PostgreSQL/Prisma backend for cryptographically verifiable exam publications, two-signature corrections, QR marksheets and direct-SQL tamper audits. React is developed separately.

**Verified locally:** PostgreSQL migration/seed, real SHA-256/Ed25519, publication/correction races, historical receipts, generated QR decoding and SQL tamper detection. **Not deployed:** independent witness service, browser-side verifier, production key custody. “Current” always means as of a signed checkpoint. See [security results](docs/SECURITY_TESTS.md).

## Prerequisites and setup (tested on Windows)

- Node 24 (package supports >=22), npm, Git.
- PostgreSQL 18 binaries. Docker is not installed on the tested workstation.
- Run in repository root on `backend/h8-core`.

```powershell
npm ci
npm run dev:setup
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm start
```

`dev:setup` uses `C:/Program Files/PostgreSQL/18/bin`; set `PG_BIN` to your installed binary directory if different. It creates an isolated `.local/pgdata` cluster listening only on 127.0.0.1:55432, a dedicated development database, random SCRAM credentials, JWT secret and three Ed25519 keypairs. Existing PostgreSQL service/credentials are untouched. Startup is idempotent. All generated secrets stay ignored and are not printed. Windows ACLs remove inherited access from `.local` and `.env`; POSIX files use restrictive modes. This path is tested on Windows; on Unix, run as a non-root PostgreSQL-capable user and set PG_BIN.

Generated `.local/demo-credentials.json` contains local demo account passwords. Read it privately in your editor to login; do not paste it in issue reports or commit it. Accounts: admin, student, approver-a, approver-b, auditor at `verimark.test`. Private keys: `.local/keys/*.private.pem`. All approver keys share the development workstation only; real approvals require separate key custody.

Optional existing database: provide `.env` based on `.env.example`, own keys and registry; bootstrap intentionally refuses a non-isolated URL. Do not point attack tests or seed at production. Production provisioning is not implemented.

API listens at http://localhost:3000; health `GET /health`; CORS defaults to http://localhost:5173. No VS Code reopening is required for this agent; the session is already rooted in the clone. To open the same folder in an editor: `code .`.

### Environment

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection with schema; secret |
| JWT_SECRET | Random signing secret, at least 32 characters |
| KEY_DIRECTORY | Directory containing institution private/public PEM and approvers.json |
| PUBLIC_BASE_URL | Publicly reachable API URL encoded in QR; localhost works only on this workstation |
| FRONTEND_ORIGIN | Single allowed React origin |
| PORT | Loopback HTTP port, default 3000 |
| WITNESS_FILE | Optional separately obtained and authenticated checkpoint JSON |
| LOCAL_ATTACK_TESTS | 1 only for isolated local dev attack tests; bootstrap sets it |
| PG_BIN | Optional installed PostgreSQL binary directory for bootstrap |

For phone scans a reachable HTTPS endpoint and corresponding PUBLIC_BASE_URL are necessary. No tunnel/deployment was created. Tests decode actual generated QR pixels and follow the URL in-process; physical printer/phone scanning is not tested.

## Development / demonstration

1. Start API with `npm start`. In another terminal, `npm run demo` exercises real HTTP login/publication/verification, independently verifies the evidence, and saves `.local/demo-marksheet.html`, `.local/demo-evidence.json` and `.local/demo-receipt.json`. It reuses the seeded student's result on repeat runs.
2. Log in with local admin credentials, GET students/exams, POST /results. Use returned receipt; GET printable marksheet with Bearer authorization.
3. Create a correction with a reason. Each approver reviews proposal JSON, signs locally, then submits under their own account:

```powershell
node scripts/sign-proposal.js .local/proposal.json .local/keys/approver-a.private.pem
```

Repeat with approver-b. Never send private keys to the API. Verify original receipt again: VALID_HISTORICAL, original marks retained.

4. Demonstrate direct database attack (creates a synthetic publication, mutates score using SQL, prints exact finding, restores mutable marks in finally):

```powershell
npm run attack:demo
```

5. Save public /verify response to `.local/evidence.json` and receipt envelope to `.local/receipt.json`, then verify without the server:

```powershell
node scripts/verify-file.js .local/evidence.json .local/keys/institution.public.pem .local/receipt.json
node --env-file=.env scripts/export-checkpoint.js .local/checkpoint-export.json
node scripts/verify-file.js .local/evidence.json .local/keys/institution.public.pem .local/receipt.json .local/checkpoint-export.json
```

For a real verifier, obtain institution.public.pem from an authenticated channel; never trust the API to supply its own trust root. Publish exported checkpoints through an independently controlled static endpoint/repository, then configure clients and WITNESS_FILE. Export refuses overwriting existing files. Local same-machine witness files do **not** establish operational independent rollback protection.

## Tests and operations

`npm run test:crypto` requires no database. `npm test` requires seeded dev keys and local PostgreSQL. Integration tests create a random `security_*` schema, apply the committed migrations, perform real attacks and drop only that schema afterwards. Application schema data is preserved. Seed is idempotent and does not reset passwords or rotate keys.

```powershell
npx prisma migrate status
npm run db:seed
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D .local/pgdata -m fast -w stop
```

Use `npm run dev:setup` to start again. Do not delete `.local` casually: it contains the keys authenticating your existing ledger. The local data is under the current workspace (which may be OneDrive-synced); ACLs are not encryption or protection against your own cloud account. Production keys need separate custody.

Troubleshooting: missing Prisma client → `npm run db:generate`; port conflict → inspect the process before changing cluster settings; existing service requests password → use isolated bootstrap, not the existing server; invalid ledger → preserve evidence and audit, never silently re-sign corrupt rows. npm 11 may warn that Prisma lifecycle scripts require approval; explicit `prisma generate` was sufficient here. No automatic global npm upgrades.

## References

- [API contract and frontend flows](docs/API.md)
- [OpenAPI 3.1 route definitions](docs/openapi.json)
- [Architecture](docs/ARCHITECTURE.md) / [exact proof protocol](docs/PROOF_SPEC.md)
- [Security tests and limitations](docs/SECURITY_TESTS.md)
- [Progress](docs/PROGRESS.md) / [next-agent handoff](docs/HANDOFF.md)
- [Repository agent instructions](AGENTS.md)
