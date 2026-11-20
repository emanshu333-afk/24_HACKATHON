# Architecture

## Boundaries

Single Node 24 ESM Express 5 process; PostgreSQL 18 and Prisma 6.19.3. React/Vite is a separate developer's responsibility. No blockchain, cryptocurrency, Redis or external service. Public verification can run in a separate Node process without PostgreSQL or HTTP using src/crypto.js and scripts/verify-file.js.

Prisma tooling transitive dependencies are overridden to deepmerge-ts 8.0.2 / effect 3.22.1 to address audit advisories. Generation, fresh migrations and full tests pass with these pins. Reassess when upgrading Prisma; do not remove overrides without checking advisories and compatibility.

- `src/crypto.js`: canonical encoding, domain-separated SHA-256, Ed25519, certificates, offline verifier.
- `src/service.js`: ledger transactions, publication, corrections, receipts, evidence, audits.
- `src/auth.js`: salted scrypt password hashing, HS256 JWT, DB-backed role checks.
- `src/validation.js`: strict Zod input validation and subject ordering.
- `src/app.js`: HTTP contract, ownership checks, QR/printable HTML, CORS and error mapping.
- `src/config.js`: file-based signing key, signed approver registry, optional external witness.
- `scripts/`: local DB bootstrap, seed, signing, witness export, offline verification, attack demo.

## Database

User: unique email, password hash, role, optional approver public key. Student: unique university code, optional unique user association. Exam: unique exam code.

Result: unique (student,exam), mutable current version and marks. ResultVersion: unique (result,version), immutable-by-application canonical publication data and commitment. LedgerEvent: unique global sequence, UUID, hash and version reference. JSON body includes original signed data independently of mutable projections.

CorrectionProposal: immutable-by-application proposal body/digest plus mutable applied flag. Approval: unique (proposal,user), actual detached Ed25519 signature. Checkpoint: unique ledger sequence, signed body. Foreign keys enforce relations; proposal result indexed; unique keys index event ordering, version lookup and publication deduplication.

Historical data is not enforced immutable against database owners: the explicit threat model allows bypassing the API. Authenticity comes from signatures and external trust, not an immutability flag. Audit compares projections and historical rows to authentic signed event copies. Schema protects referential consistency, not cryptographic truth.

## Write flow

All publication/proposal/approval writes acquire PostgreSQL transaction advisory lock 78421309 under Read Committed. It globally serializes writers, including across backend processes. The second transaction reads committed state only after obtaining the lock. Unique constraints independently block duplicates. No gap-generating DB sequences are used: next ledger position is validated chain length+1.

Publication creates result/version, authenticates prior chain, constructs signed event/checkpoint, verifies the proposed complete chain and atomically commits. Duplicate publications return 409. Corrections retain old versions, bind two signatures to the exact proposal including reason and base version, and atomically advance the projection with an event. Competing corrections from one base cannot both commit.

Proof and audit reads use Repeatable Read transactions to avoid false findings from concurrent appends. The audit checks actual SQL records, not cached validity flags. A corrupt chain blocks future appends; recovery must be deliberate, not automatic re-signing.

## Trust and deployment tradeoffs

All dev keys live outside PostgreSQL and Git. Institution-authorized approver certificates are in an external registry; DB-only key replacement is insufficient to produce valid approvals. Development keeps all three private keys on one workstation for reproducibility: production requires separately controlled approver devices and institution key custody. Node-only verification is delivered; a React/browser WebCrypto verifier is not yet implemented.

The API binds loopback. CORS allows one configured React origin, JWT lasts one hour, login is process-local rate limited. TLS/reverse proxy, distributed rate limits, user provisioning/password reset, key rotation/revocation and production least-privilege DB roles are unfinished. No deployment has occurred.

Full-chain evidence is O(n) in events and verification time; append validation is also O(n), hence cumulative publishing cost O(n²). This intentionally favors correctness at hackathon scale. Full event data includes pseudonymous marks for unrelated results. Capability URLs suppress names but are not a production privacy solution. Merkle proofs/selective disclosure are the preferred next protocol version.

Snapshots can be restored consistently by a DB attacker; signed checkpoints stored only in that DB do not stop rollback. An independently controlled witness must retain checkpoints and clients must authenticate that channel. Current tests retain a witness file outside SQL; no remote independent operator is configured.
