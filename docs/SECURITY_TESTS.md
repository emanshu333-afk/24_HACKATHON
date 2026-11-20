# Security verification record

## Threat model

Attacker can edit/delete/reorder SQL data, forge public HTTP responses, replay receipts/signatures, race valid writes and restore an older DB snapshot. Attacker does not possess institution/approver private keys or control an independently authenticated trust root/checkpoint. DB roles/password hashes themselves are not protected against a database owner; DB compromise plus abuse of the signing service is beyond the passive DB-tampering proof model. Availability cannot be guaranteed against deletion.

## Executed 2026-11-20

- `npm run test:crypto`: 12 passed, 0 failed (foundation milestone).
- First `npm test`: 29 passed, 0 failed.
- Final `npm test`: **31 passed, 0 failed, 0 skipped**, about 3.56 s. Node 24.19, PostgreSQL 18.6, Prisma 6.19.3, Windows. Tests use real Ed25519 and an actual fresh PostgreSQL schema with deployed migrations, not arrays/SQLite.
- `npm run demo` against an actual `npm start` process: SQL health ok, HTTP login/publication, independently verified VALID_CURRENT, printable HTML/evidence/receipt saved locally. API stopped intentionally after smoke testing.
- `scripts/verify-file.js` accepted saved evidence both without witness (UNWITNESSED) and with exported checkpoint (AT_LEAST_WITNESSED_CHECKPOINT). Checkpoint exporter succeeded.
- `npx prisma migrate status`: database up to date. OpenAPI JSON parsed with 19 operations and 37 internal references resolved (not full external schema-validator certification).
- `npm audit` initially reported four high-severity transitive Prisma tooling findings (deepmerge-ts/effect and dependents). Explicit overrides deepmerge-ts 8.0.2 and effect 3.22.1 resolve them; subsequent full audit reports **0 vulnerabilities**. Prisma generation and full tests passed with overrides. No blind major Prisma upgrade.
- `npm run attack:demo`: detected direct SQL score change from 75 to 99; finding field `result.marks.0.score` on result `7bc53150-5f39-4832-8deb-4d4943acd467`, version 1. Restored projection afterwards; authentic synthetic publication remains in development ledger.

## Coverage

| Requirement / attack | Executable evidence | Result |
|---|---|---|
| Canonicalization and domain separation | crypto.test.js ordering/integers/domain test | PASS |
| Real Ed25519, wrong key/message rejection | crypto.test.js signature test | PASS |
| Publish and independently verify | crypto and PostgreSQL publication tests | PASS |
| Incorrect marks / altered event payload | crypto mutations; SQL ledger payload test, append blocked | PASS |
| Direct SQL current marks edit | integration test compares expected 81 to actual 99 | PASS |
| Direct SQL historical data edit | integration `version.data.marks.0.score` finding | PASS |
| Invalid event signature | crypto and actual stored event mutation | PASS |
| Reordered/deleted ledger events | crypto and PostgreSQL sequence/delete tests | PASS |
| Checkpoint mismatch | crypto and actual stored checkpoint mutation | PASS |
| Version identity substitution | changed SQL version cannot mint a receipt for another requested version; audit pinpoints it | PASS |
| Forged receipt | crypto and HTTP 400 verification test | PASS |
| One approval only | first signature leaves current version unchanged | PASS |
| Same user twice | duplicate signer rejected before applying | PASS |
| Two distinct valid approvals | real independent keypairs; service and HTTP apply version 2 | PASS |
| Reused signature on different proposal | distinct UUID/digest rejected | PASS |
| Changed proposal and forged stored approval | direct SQL mutations rejected and audited | PASS |
| Stale correction / correction race | competing second approvals: one success, one stale rejection | PASS |
| Duplicate publication race | exactly one success, one ALREADY_PUBLISHED | PASS |
| Concurrent global appends | six simultaneous writes preserve sequence/linkage | PASS |
| Original marksheet after correction | old receipt verifies historical with original score | PASS |
| Actual QR image initiates verification | PNG decoded using jsQR, URL equals signed receipt URL, HTTP proof independently checked | PASS |
| JWT / roles / student ownership | real HTTP login, unauthenticated write, student audit/foreign-result rejection | PASS |
| Fresh schema migration / FKs / reads/writes | each integration run migrates its own schema | PASS |
| SQL rollback vs external-to-DB checkpoint | retain signed JSON file, delete latest SQL event/checkpoint, old chain passes without witness and fails with witness | PASS (local simulation) |
| Malformed/fractional SQL JSON | structured audit findings, no exception | PASS |
| Clean state after reversible attacks | final complete audit finds no mismatches | PASS |

Tests that need multiple assertions use meaningful workflows; counts above are scenarios, not individually counted test cases. Integration tests remove only their random schema. Attack script is explicitly gated to isolated loopback DB; restores only its own synthetic mutable record.

## Measured proof scaling

Final test chain: 15 events (including 3 corrections), serialized evidence 17,622 UTF-8 bytes; independent verification 3.75 ms in that run. Earlier 13-event chain: 14,520 bytes, 6.09 ms (timing noise means no throughput claim). Full chain is O(total events) in payload/verification; append validates history and is O(n) per append. Large-ledger benchmarks not performed.

## Outstanding risks / untested production properties

- No independently operated witness configured; same-machine file simulation proves the algorithm, not operational separation or real-time freshness. External publication, authenticated retrieval and rollback against that actual service remain incomplete.
- QR pixels decode in tests; physical printing/phone scanning is untested. Default localhost QR is usable only on the workstation.
- Node offline verifier delivered; browser WebCrypto verifier / React integration not delivered. Frontend must not treat HTTP status as proof.
- Full-chain evidence exposes pseudonymous marks for all events. Capability URLs contain no names but are bearer access to evidence. Production requires selective proofs/privacy review.
- Development institution and approver keys share one machine; production key custody, revocation/rotation and independently controlled approval devices are not implemented. Local files may sync with workstation cloud backups.
- Server is loopback, no HTTPS deployment, no production credentials, no remote registration. JWT uses DB role checks; password reset/provisioning and distributed rate limits not implemented. Local DB bootstrap uses a privileged dev role.
- Event corruption yields hash/signature error at event granularity; only intact signed copies support expected/actual field pinpointing.
- Large-load behavior, crash-injection durability, multiple physical server hosts and multi-platform bootstrap not tested. Advisory locking is exercised with concurrent PostgreSQL transactions.
