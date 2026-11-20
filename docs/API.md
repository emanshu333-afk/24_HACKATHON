# VeriMark HTTP contract — v1

Base: `http://localhost:3000`. JSON except printable HTML. React origin defaults to `http://localhost:5173`; configure FRONTEND_ORIGIN. Bearer authentication: `Authorization: Bearer <token>`. No cookies. Requests accept strict bodies; unknown fields rejected. Max body 64 KiB. No frontend branch changed.

Machine-readable route/request definitions: [OpenAPI 3.1](openapi.json). This document and PROOF_SPEC.md expand the cryptographic response envelopes and error semantics.

## Shared shapes and errors

`Marks = [{"subject":"CS101","score":86,"max":100}]`: 1–30 unique ASCII subject codes `[A-Z0-9_-]{1,32}`, integer scores 0..100, max exactly 100. Responses sort subjects.

`Result = {id,studentId,examId,currentVersion,marks}`. IDs UUID strings. `ResultVersion = {id,resultId,version,data,commitment,event}`; event includes storage fields id,sequence,versionId,body,hash,signature. Public evidence strips storage-only fields.

`Publication = {resultId,version,receipt,checkpoint}`. See PROOF_SPEC.md for exact signed envelope fields. `Proposal = {id,resultId,baseVersion,body,digest,applied}`; reads include `approvals:[{id,proposalId,userId,signature}]`.

Errors: `{ "error": "CODE" }`. 400 VALIDATION_FAILED includes `issues:[{path,message}]`; 400 UNKNOWN_REFERENCE, INVALID_JSON, INVALID_RECEIPT_ENCODING; 401 UNAUTHORIZED/INVALID_CREDENTIALS; 403 FORBIDDEN/UNREGISTERED_APPROVER; 404 NOT_FOUND/RESULT_NOT_FOUND/VERSION_NOT_FOUND/PROPOSAL_NOT_FOUND/NO_CHECKPOINT; 409 domain conflict; 413 BODY_TOO_LARGE; 429 RATE_LIMITED; 500 INTERNAL_ERROR. Authentication errors apply to every protected route. Internal SQL errors and secrets are not returned.

Roles: ADMIN, STUDENT, APPROVER, AUDITOR. “Readers” = all four, with student ownership enforced for individual results. “Staff” = ADMIN, APPROVER, AUDITOR. Student list endpoints only return that student's results. A DB result projection is not cryptographic evidence.

## Implemented routes

| Method / route | Role | Request | Success | Additional failures |
|---|---|---|---|---|
| GET /health | Public | None | 200 `{status:"ok"}` after SQL read | 500 database unavailable |
| POST /auth/login | Public | `{email,password}` | 200 `{token,expiresIn:3600,user:{id,role,email}}` | 400 validation, 401 invalid credentials, 429 after 20/IP/minute |
| GET /me | Readers | None | 200 `{id,email,role,studentId:null\|UUID}` | 401/403 |
| GET /students | Staff | None | 200 `[{id,code,name}]` | 403 student |
| GET /exams | Readers | None | 200 `[{id,code,title}]` | 401/403 |
| POST /results | ADMIN | `{studentId,examId,marks}` | 201 Publication | 409 ALREADY_PUBLISHED/LEDGER_INTEGRITY_FAILURE/PROPOSED_EVENT_INVALID; 400 UNKNOWN_REFERENCE |
| GET /results | Readers | None | 200 `[Result + {exam:{id,code,title}}]` | 401/403 |
| GET /results/:id | Readers, own if student | None | 200 Result | 400 invalid UUID; 403 ownership; 404 |
| GET /results/:id/history | Readers, own if student | None | 200 `[ResultVersion]` ascending version | 403/404 |
| GET /results/:id/receipt/:version | Readers, own if student | None; positive integer version | 200 `{receipt,verificationUrl}` | 400 version; 403/404; 409 LEDGER_INTEGRITY_FAILURE/RESULT_INTEGRITY_FAILURE |
| GET /results/:id/marksheet/:version | Readers, own if student | None | 200 text/html printable signed-version marks and QR image | 400 version; 403/404; 409 LEDGER_INTEGRITY_FAILURE/RESULT_INTEGRITY_FAILURE |
| GET /verify?receipt=TOKEN | Public capability | TOKEN=base64url UTF-8 JSON receipt | 200 `{verification,evidence}` | 400 bad encoding/forged receipt |
| POST /verify | Public capability | `{receipt:<signed receipt envelope>}` | 200 `{verification,evidence}` | 400 forged receipt |
| POST /results/:id/corrections | ADMIN | `{baseVersion,marks,reason}` | 201 Proposal (no approvals property yet) | 400 validation; 404; 409 STALE_BASE_VERSION |
| GET /corrections | Staff | None | 200 `[Proposal + {approvals}]` | 401/403 |
| GET /corrections/:id | Staff | None | 200 Proposal + approvals | 400 invalid UUID; 404 |
| POST /corrections/:id/approvals | APPROVER | `{signature:"86-character base64url signature"}` | 200 first: `{proposalId,approvalCount:1,applied:false}`; second: Publication + `{proposalId,approvalCount:2,applied:true}` | 400 INVALID_APPROVAL; 403 UNREGISTERED_APPROVER; 409 DUPLICATE_APPROVER/ALREADY_APPLIED/STALE_BASE_VERSION/PROPOSAL_TAMPERED/RESULT_INTEGRITY_FAILURE/LEDGER_INTEGRITY_FAILURE/PROPOSED_EVENT_INVALID |
| GET /checkpoints/latest | Public | None | 200 signed checkpoint envelope | 404 NO_CHECKPOINT |
| POST /audits | ADMIN or AUDITOR | Empty JSON or no body | 200 `{status:"VALID"\|"INVALID",findings:[],freshness,checkpointSequence}` | 401/403 |

## Frontend flows and example JSON

1. Login using locally generated account credentials. Keep bearer token in memory. GET /me identifies role and student association.
2. Admin reads students/exams and POSTs /results:

```json
{"studentId":"11111111-1111-4111-8111-111111111111","examId":"22222222-2222-4222-8222-222222222222","marks":[{"subject":"CS101","score":86,"max":100}]}
```

Example IDs above are illustrative; use actual GET responses. Fixture UI data is fixtures/frontend.json, explicitly not authentic proof.

3. Retrieve receipt and printable HTML with Authorization headers. For print, fetch HTML as an authenticated request and render a controlled Blob/new window; direct window navigation cannot add Bearer headers. Do not inject untrusted response HTML into arbitrary application content.
4. QR scan requests GET /verify with the receipt token. **The JSON status is advisory**: independently verify `evidence` against the pinned institution public key and original receipt. The provided executable verifier is Node-based; a browser verifier is remaining frontend integration work.
5. Correction example:

```json
{"baseVersion":1,"marks":[{"subject":"CS101","score":91,"max":100}],"reason":"Recount confirmed omitted five-mark answer"}
```

Save returned proposal JSON, review its body, and each approver signs with their own key using `node scripts/sign-proposal.js proposal.json own-private.pem`. Submit the output `{signature}` while authenticated as that approver. Server never accepts private keys. First approval does not change results; the second applies atomically. UI must handle 409 stale base by fetching current history and creating a new proposal (never silently rebase signatures).

## Verification-specific fields

Successful verification example (abridged result, real evidence is always required):

```json
{"status":"VALID_HISTORICAL","failures":[],"checkpointSequence":15,"freshness":"UNWITNESSED","currentAsOf":"2026-11-20T00:00:00.000Z","result":{"format":"verimark-v1","resultId":"...","studentId":"...","examId":"...","version":1,"marks":[{"subject":"CS101","score":86,"max":100}]},"latestVersion":2}
```

- VALID_CURRENT: latest version within supplied signed checkpoint, **not a global freshness assertion**.
- VALID_HISTORICAL: valid original publication, superseded by an authorized correction in supplied chain.
- INVALID: evidence/receipt/checkpoint/signature failure; never display as verified.
- INCOMPLETE: missing evidence (e.g. no checkpoint); network errors should also be displayed as unavailable, never invalid marks by default.
- freshness: UNWITNESSED or AT_LEAST_WITNESSED_CHECKPOINT; a witness is a lower-bound checkpoint, not a live clock.
- failures: `[{code,eventId?,sequence?,resultId?,version?}]`. Examples: EVENT_HASH_MISMATCH, RESULT_COMMITMENT_MISMATCH, INVALID_EVENT_SIGNATURE, BROKEN_LINK, INCOMPLETE_CHAIN, INVALID_CHECKPOINT_SIGNATURE, CHECKPOINT_HEAD_MISMATCH, FORGED_RECEIPT, INVALID_APPROVAL, ROLLBACK_BELOW_WITNESS, WITNESS_FORK, MALFORMED_EVIDENCE.

A forged receipt returns HTTP 400 `{verification:{status:"INVALID",failures:[{code:"FORGED_RECEIPT"}]}}` with no evidence. Cryptographically invalid stored evidence otherwise returns HTTP 200 with INVALID so clients can inspect it independently.

Audit finding example:

```json
{"code":"DATABASE_FIELD_MISMATCH","resultId":"...","version":1,"field":"result.marks.0.score","expected":75,"actual":99}
```

Authentic event data permits field-level comparison. If the signed event itself is corrupted, hash/signature failure can identify the event but cannot recover the original changed field. No arbitrary recovery claim.

## Contract changes

Initial v1 contract; no prior API existed. Do not rename routes, envelopes, statuses or proof fields without recording a versioned breaking change here and coordinating with frontend.
