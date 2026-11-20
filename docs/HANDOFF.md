# Operational handoff

Current objective: build the backend with real cryptographic proofs and PostgreSQL tests.
Read AGENTS.md. Branch backend/h8-core; never push without approval.
Environment: Windows, PostgreSQL binaries C:/Program Files/PostgreSQL/18/bin, Node 24.
Existing PostgreSQL service requires credentials; use a separately initialized .local cluster on 55432.
Foundation implemented: isolated DB, migration, seed, canonical protocol, independent verifier and initial service. npm run test:crypto: 12 passed, 0 failed. Database service operations not integration-tested yet.
Next: implement HTTP/QR and PostgreSQL security tests. Run npm test after adding integration tests. Existing local keys/credentials stay ignored. Do not reinitialize the cluster or rotate keys silently.
