# Backend integration notes

No wire endpoints are assumed or implemented. When inspected, `origin/main` contained only the repository README and `origin/backend/h8-core` was not visible. `src/services/api.ts` is the centralized typed verification boundary. It dispatches to sample evidence or returns an unavailable result; it does not make network calls. `VITE_API_BASE_URL` is read but not used for networking yet. The other screens consume synthetic data exclusively when enabled.

## Operations to confirm with backend

Names below describe needed operations, **not** proposed HTTP paths or schemas. For each, provide the method/route, request and response schema, example payloads, typed errors, and authentication requirements.

| Operation | Data/UI behavior needed |
| --- | --- |
| Fetch public proof for exact publication reference | Privacy-approved public result payload, proof envelope, version relation and checkpoint evidence; distinguish unknown reference, malformed proof, rate limit and outage. |
| Session / sign-in / sign-out | Current actor and roles (student, registrar, approver, auditor), expiry and 401/403 behavior, institution scoping, cookie/CSRF or token contract, CORS where applicable. |
| Student result history and marksheet receipt | Profile scoped to session, exam/version metadata, subjects, totals/grading, publication time, reason/details authorized for the student, receipt/reference and canonical public QR origin. |
| Staff roster, exams, results and publication history | Search/filter/pagination parameters, subject and mark constraints, version linkage and canonical identifiers. |
| Publication and optional CSV import | Draft/validation and confirmation operation, idempotency, conflict handling, created versions and receipts; CSV template, headers, bounds, encoding, preview and row errors. |
| Corrections | Proposal id, exact target version, before/after marks, reason, review eligibility, signing challenge/protocol, approval and rejection events, verification of distinct signers, finalization and published version. |
| Ledger and integrity audit | Paginated event/entry list; audit status/results, affected reference/field, expected vs observed value, precise finding category, signatures/checkpoint evidence and authorized correction linkage. For the demo, use a backend-provided synthetic audit dataset. |
| Failed verification event feed (if collected) | Auditor scope, safe details, reason taxonomy, timestamp, and pagination; no sensitive logs on public routes. |

## Verification acceptance requirements

- Supply a versioned proof schema: exact signed bytes/canonicalization (ordering, encodings and normalization), signature algorithm and key encoding, domain separation if applicable, and binding between the URL reference, displayed fields, version and commitment.
- Supply the ledger scheme and verifier rules (chain or Merkle path), checkpoint payload, expected trust root distribution, key rotation/revocation and freshness rules. Never accept a key sent with a proof as trusted solely because it verifies that proof.
- Specify how to establish that a valid result is current or superseded. Proof of inclusion at an old checkpoint is not by itself proof of currentness. Use browser Web Crypto where the agreed protocol permits; unsupported or missing evidence stays unavailable. An API boolean cannot produce a verified result.
- Obtain valid current, valid superseded, wrong commitment, wrong signature, ledger mismatch, stale/untrusted checkpoint and no-evidence vectors. Only evaluated failure evidence can produce invalid/tampered, not network errors or unknown references. Verify exact marks displayed against authenticated bytes.
- Agree whether public marks are permitted and whether references must be opaque/rate-limited. Do not expose student identifiers, private receipts or PII in URLs, logs or telemetry. Use masked/omitted fields per the real contract.
- Before adding live forms, confirm session expiry and server authorization, distinct signer enforcement, and how institutional signing is invoked without embedding private keys or fabricating signatures in the browser.

## Existing UI types

- `Result`, `Mark`, `Student`, `Exam` and `Correction` in `src/services/model.ts` are synthetic view models.
- `Verification` is the verdict/checklist view model with a typed outcome and evidence states. Convert to it only after schema validation and proof evaluation. Use `AbortSignal` and extend the adapter with typed status/error handling once a contract exists.
- Demo references use 6–80 ASCII letters, digits, hyphens and underscores. This is a mock format constraint, not a backend decision. Uploaded QR images accept same-origin `/verify?ref=…` only; confirm the real QR URL contract before allowing another origin.
