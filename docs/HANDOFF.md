# Operational handoff

Current objective: build the backend with real cryptographic proofs and PostgreSQL tests.
Read AGENTS.md. Branch backend/h8-core; never push without approval.
Environment: Windows, PostgreSQL binaries C:/Program Files/PostgreSQL/18/bin, Node 24.
Existing PostgreSQL service requires credentials; use a separately initialized .local cluster on 55432.
Implemented: full backend publication/correction/QR/audit flow, offline verifier, seed/migration, auth/RBAC, witness export. Final npm test: 31 passed, 0 failed; QR pixels decoded; actual SQL attack demo pinpointed 75→99. npm audit: 0 vulnerabilities with tested transitive overrides. Details in SECURITY_TESTS.md.
Recent files: src/app.js, src/service.js, scripts/*, test/integration.test.js, docs/API.md, README.md and architecture/proof/security docs.
Decisions: full-chain genesis proof, exact domain-separated protocol, global transaction lock, externally pinned trust root and approver certificates. No hidden self-trust in DB flags. Do not change proof format or routes without explicit version coordination.
API smoke test, migration status, offline CLI and checkpoint export passed. PostgreSQL still runs; API stopped intentionally after demo. Start with npm start, then npm run demo in another terminal. Demo artifacts: .local/demo-marksheet.html, demo-evidence.json, demo-receipt.json, checkpoint-session-export.json. No independent external witness configured.
Exact next task: coordinate with frontend on docs/API.md + docs/openapi.json, implement browser-side verification using an independently pinned institution key and shared canonical test vectors; do not alter teammate branch without direction. Then configure/test a genuinely independently controlled checkpoint channel with user permission. Existing local keys/credentials stay ignored. Do not reinitialize cluster or rotate keys silently.
Run: npm run dev:setup (if DB stopped), npm run db:generate, npm run db:migrate, npm run db:seed, npm test, npm start. Credentials .local/demo-credentials.json; never print or commit them.
Known failures: none in automated suite. Limitations: no browser verifier, remote witness, production custody/TLS or physical QR test. User action later: choose independently controlled checkpoint channel and reachable API deployment; permission required before any Git push.
