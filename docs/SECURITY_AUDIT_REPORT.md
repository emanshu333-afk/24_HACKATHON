# VeriMark Security Audit Report

Scope: backend on `backend/h8-core`. Audit performed by re-executing the repository, reproducing findings, and fixing defects. No secrets or private keys are included in this report.

## Threat model

Attacker capabilities considered:
- Direct SQL read/write/delete on PostgreSQL, bypassing the API
- Forged or replayed HTTP receipts and signatures
- Modified signatures, ledger payloads, event linkages, checkpoint rows
- Reordered/deleted ledger events
- Stale or changed correction proposals
- Competing concurrent corrections and publications
- Approver public-key replacement in the database
- Database unavailability
- Invalid or malicious JSON input

Attacker does NOT possess institution or approver Ed25519 private keys, nor control an independently authenticated trust root/checkpoint. Database-owner compromise plus signing-service compromise is outside the DB-only tampering model.

## Tests executed and results

### Cryptographic signature tests (passed)

| Test | Result |
|---|---|
| Valid Ed25519 signature verifies | PASS |
| Modified message fails | PASS |
| Modified signature fails | PASS |
| Wrong public key fails | PASS |
| Domain separation across message types | PASS |
| Two distinct approver keys required; same key twice rejected | PASS (Node + WebCrypto) |
| Approval bound to exact proposal digest | PASS |

### Correction authorization tests (passed)

| Test | Result |
|---|---|
| One approval only does not apply | PASS |
| Two distinct valid approvals apply atomically | PASS |
| Same user signs twice | REJECTED |
| Same signing key with two certified user IDs | REJECTED |
| Unauthorized approver | REJECTED |
| Invalid signature | REJECTED |
| Signature for different proposal | REJECTED |
| Approval replay | REJECTED |
| Proposal modified after first approval | REJECTED |
| Already completed correction | REJECTED |
| Concurrent corrections: exactly one applies | PASS |
| Stale base version | REJECTED |
| Changed proposal digest rejected | PASS |
| Forged stored approval detected | PASS |

### Direct SQL tampering tests on disposable data (passed)

| Attack | Detection | Finding detail |
|---|---|---|
| Marks 75 → 99 | DATABASE_FIELD_MISMATCH | result.marks.0.score, expected 75, actual 99 |
| studentId substitution | DATABASE_FIELD_MISMATCH | result.studentId expected vs actual |
| examId substitution | DATABASE_FIELD_MISMATCH | result.examId expected vs actual |
| Commitment edit | DATABASE_FIELD_MISMATCH | version.commitment |
| Event signature forged | INVALID_EVENT_SIGNATURE | event identified |
| Ledger payload modified | INVALID / BROKEN_LINK | proof invalid, signing blocked |
| Event linkage changed | BROKEN_LINK | sequence/linkage failure |
| Event deleted | INVALID + UNCOMMITTED_VERSION | chain gap detected |
| Checkpoint head changed | INVALID | CHECKPOINT_HEAD_MISMATCH |
| Correction proposal body tampered | PROPOSAL_TAMPERED | digest mismatch |
| Approval records deleted | MISSING_CORRECTION_RECORD | event references missing proposal |
| Array replaced by object | DATABASE_FIELD_MISMATCH | type mismatch per field |
| Injected null property | DATABASE_FIELD_MISMATCH | field-level difference |
| Version identity changed | RESULT_INTEGRITY_FAILURE | receipt cannot be minted |

### Checkpoint / rollback tests (passed)

| Scenario | Result |
|---|---|
| Valid local checkpoint accepted | AT_LEAST_WITNESSED_CHECKPOINT |
| Chain shorter than witness | ROLLBACK_BELOW_WITNESS |
| Forked head vs witness | WITNESS_FORK |
| Forged witness signature | INVALID_WITNESS |
| No witness configured | UNWITNESSED (honest limitation) |

### Authentication and input tests (passed)

| Test | Result |
|---|---|
| Wrong password / unknown user | 401, no secrets leaked |
| SQL-like email input | 400 |
| JWT missing/invalid/expired/tampered/wrong audience/wrong algorithm/no subject | 401 |
| Role escalation via client JWT claim | 403 |
| Student access to another student's result | 403 |
| Large body (66 KB) | 413 |
| Invalid JSON | 400 |
| Negative zero / extra fields | 400 |
| CORS arbitrary origin | no header granted |
| Login rate limit | 429 after 21/min |
| DB unavailability | 503 DATABASE_UNAVAILABLE |

## Defects found and fixed during this audit

1. **Audit did not detect array-to-object substitution** — recursive comparison treated numeric object keys as equal to array indices. Fixed in `src/service.js` to compare array-vs-object as a mismatch per field. Regression test added.

2. **Audit did not detect injected null property** — `compare` treated `undefined`/missing as equal to null. Fixed to report missing/present key mismatches explicitly. Regression test added.

3. **Audit did not detect deletion of applied correction proposals and approval rows** — no cross-check between ledger events referencing proposals and stored proposal rows. Fixed in `src/service.js` audit to report `MISSING_CORRECTION_RECORD`. Regression test added.

4. **Malformed proposals could reach `checkApprovals`** — hardened `approve` to throw `PROPOSAL_TAMPERED` before signature verification when proposal digest/identity fields mismatch.

5. **Registry not validated at startup** — `loadKeys` now validates every approver certificate signature and binding against the institution public key.

6. **Witness freshness label could claim witnessed status on invalid evidence** — now only labels `AT_LEAST_WITNESSED_CHECKPOINT` when witness verifies and there are no failures.

7. **Unsafe runtime configuration accepted** — added `runtimeConfig` validation for JWT secret length, PORT range, PostgreSQL URL protocol, and HTTP origins.

8. **Error handler could expose Prisma internals** — database connection errors mapped to sanitized `DATABASE_UNAVAILABLE`; internal errors log only constructor name.

## Remaining security limitations (honest disclosure)

- No independently operated witness service is configured. Local checkpoint files are not operational rollback protection against a database owner who controls all storage.
- All development private keys share one workstation. Production requires separately controlled approver devices and institution key custody.
- No TLS/deployment; API binds loopback only in dev.
- No refresh token, registration, or password reset.
- Full-chain proofs are O(n) and expose pseudonymous marks for all events; not privacy-scalable at large scale.
- Browser verifier tested via Node WebCrypto, not an actual browser UI.
- Physical QR/phone scan not tested.
- DB attacker can restore an older internally consistent snapshot undetected without an external witness.

## Cryptographic trust statement

Verification does not depend on the backend returning `verified: true`. Public `/verify` returns full evidence (`events`, `checkpoint`) and the frontend independently runs `verifyEvidence` against a pinned institution public key. `VERIFIED_CURRENT`/`VALID_HISTORICAL` statuses are advisory; empty `failures` is the pass condition.
