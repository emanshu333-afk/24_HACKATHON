# VeriMark Test Report

All tests below were actually executed against the repository on branch `backend/h8-core`. Counts are real, not estimated.

## Test files

| File | Database required | Description |
|---|---|---|
| `test/crypto.test.js` | No | Canonical encoding, Ed25519, protocol mutations, approvals |
| `test/integration.test.js` | Real PostgreSQL disposable schema | Publication, correction, SQL tamper, rollback, QR pixels |
| `test/audit-regressions.test.js` | Real PostgreSQL disposable schema | Audit blind-spot regressions |
| `test/security.test.js` | Real PostgreSQL disposable schema | Auth, RBAC, JWT variants, input safety, CORS, throttle |
| `test/browser-verifier.test.js` | No | Node WebCrypto vs Node crypto agreement, mutation coverage |

## Execution results

Baseline (pre-audit): 31 passed, 0 failed  
Current full suite (`npm test`): **104 passed, 0 failed, 0 skipped**  
Duration: ~13.8 seconds  
Crypto-only (`npm run test:crypto`): 14 passed, 0 failed  
TypeScript (`npm run typecheck`): passed  
Prisma validation: valid  
Prisma migration status: up to date  
npm audit: 0 vulnerabilities

### Test inventory

Crypto/protocol tests (14):
- canonical ordering, integers, domain separation
- Ed25519 valid/invalid/wrong key
- independent verification valid
- rejects incorrect marks, modified ledger payload, invalid signature, deleted event, reordered sequence, checkpoint mismatch, forged receipt
- missing evidence incomplete
- approvals: one only, duplicate signer, two distinct, changed proposal
- witness fork rejection

Integration/real-PostgreSQL tests (21):
- publication produces independently verifiable evidence
- duplicate publication race: exactly one success
- concurrent appends maintain chain
- direct SQL current marks edit pinpointed (expected/actual)
- direct SQL historical data edit detected
- modified ledger payload rejects proof and blocks signing
- invalid stored event signature detected
- reordered sequences detected
- deleted event detected
- checkpoint mismatch detected
- tampered version identity cannot mint receipt
- one approval only; duplicate signer; reused signature; two distinct apply
- original receipt stays valid historical
- competing corrections: exactly one applies
- changed proposal and forged approval detected
- rollback detected against external-to-DB checkpoint
- HTTP login/RBAC/forged receipt/QR pixel decode
- malformed/fractional SQL payloads safe
- proof size and timing measured

Audit regression tests (3):
- array-to-object shape replacement detected
- injected null property detected
- deleted applied proposal and approval records detected

Security/HTTP tests (55):
- successful login returns public fields only
- wrong password, unknown user, SQL-like email rejected without secrets
- JWT missing, invalid, expired, tampered, wrong audience, wrong algorithm, no subject rejected
- STUDENT/APPROVER/AUDITOR cannot publish or propose
- administrator cannot approve; student role claim does not elevate
- registration and correction rejection explicitly unsupported (404)
- student owns only own results across all subresources
- publication rejects negative, too high, fraction, string, empty, duplicate subject, wrong max, script subject, too many marks
- publication rejects missing fields and absent FKs
- invalid JSON, negative zero, extra role field, large body, SQL-like path fail safely
- CORS permits configured origin, rejects arbitrary origin
- malformed QR, forged receipt, missing result explicit failures
- ledger explorer bounded and staff-only
- correction rejects invalid reasons
- simultaneous distinct approvals finalize exactly once; replay fails
- proposal changed after first approval rejected
- database approver public-key replacement cannot authorize new identity
- failed transaction rolls back all writes; retry succeeds
- direct SQL studentId/examId substitution pinpointed
- direct SQL commitment edit and linkage change rejected
- invalid runtime config rejected
- login throttled at 21/min
- real DB unavailability returns 503, not JWT failure
- failed correction finalization rolls back; retry succeeds

Browser verifier tests (19):
- public fixtures verify identically in Node crypto and WebCrypto
- rejects student identity, exam identity, commitment, link, removed event, reordered events, replaced payload, event signature, checkpoint, approval signature, approver certificate, malformed event
- wrong pinned institution key rejected
- Unicode normalization absent; null differs from missing; ordering/safe integers deterministic
- same key with two distinct certified user IDs insufficient
- witness rollback/fork/forgery/freshness agree between verifiers
- displayed mutable marks must match signed result
- missing evidence unavailable; unsupported WebCrypto fails closed

## Disposable database safety

Integration, audit-regression, and security tests create a random PostgreSQL schema (`vmtest_*`), apply the committed migration, run attacks, and drop only that schema. The development `public` schema, existing publications, keys, and Git history are never mutated by tests.

The judge demo (`npm run demo`) also uses a disposable schema and leaves development data untouched.

## Coverage gaps / honest limitations

- Browser tests run via Node WebCrypto, not an actual browser UI (no jsdom/Playwright configured)
- Physical printer/phone QR scan not tested
- No user registration, password reset, or refresh token tests (endpoints not implemented)
- No independent remote witness service configured or tested
- No production TLS/deployment or multi-host concurrency testing
- Large-load/performance benchmarks not performed beyond proof timing (~3-7 ms for 15 events)

## Commands executed

```
npm test                      104 passed, 0 failed
npm run test:crypto           14 passed, 0 failed
npm run typecheck             passed
npx prisma validate           valid
npx prisma migrate status     up to date
npm audit                     0 vulnerabilities
npm run demo                  six journeys passed on disposable schema
npm run attack:demo           SQL tamper 75→99 detected and pinpointed
```

## Regression statement

No tests were weakened or removed to obtain a green result. The three audit blind spots discovered during this audit were fixed in `src/service.js` and have passing regression tests.
