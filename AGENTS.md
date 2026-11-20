# VeriMark engineering rules

Goal: independently verifiable exam publications; crypto correctness before polish.
Backend only on backend/h8-core. React belongs to teammate. Never push without approval.
Node/Express, PostgreSQL/Prisma, SHA-256, Ed25519; modular monolith.
src/crypto.js owns byte-level proof protocol and offline verification; src/service.js owns atomic ledger writes; src/app.js owns authentication/HTTP.
Never overwrite publication history. Corrections require two distinct registered approver signatures over the exact proposal. Serialize all writes with a transaction advisory lock. Never trust DB validity flags or DB-supplied trust roots.
Private keys, credentials and local clusters stay in ignored .local/ and .env. No production security or rollback claims without evidence.
Commands: npm ci; npm run dev:setup; npm run db:generate; npm run db:migrate; npm run db:seed; npm test; npm start.
Tests must exercise real crypto and actual PostgreSQL; destructive attack tests only on the isolated development cluster.
Read docs/PROGRESS.md and docs/HANDOFF.md first when resuming. Update both at milestones. Protocol is docs/PROOF_SPEC.md; HTTP contract is docs/API.md.
