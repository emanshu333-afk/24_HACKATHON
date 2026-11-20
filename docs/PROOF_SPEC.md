# VeriMark proof protocol v1

All authenticated objects contain `format: "verimark-v1"`. Node `src/crypto.js` is the executable, database-independent verifier. Trust input is an institution **SPKI PEM Ed25519 public key obtained independently**, never the key accompanying an untrusted HTTP response.

## Exact bytes

Canonical JSON: null/booleans/strings use ECMAScript JSON.stringify; numbers are safe integers (negative zero rejected); arrays retain order; plain-object keys sort by ECMAScript UTF-16 lexicographic order, then JSON.stringify(key), colon and canonical value. No whitespace. No Unicode normalization. Undefined, floats, nonplain objects rejected. UTF-8 encodes the resulting string. Result subject codes are ASCII and unique; publishing sorts marks by subject code. Scores are integer 0..100, max=100. Strings are represented exactly, with JSON escaping.

`bytes(domain,x) = UTF8("VERIMARK/v1/" + domain + U+0000 + canonical(x))`.
`digest(domain,x) = lowercase hex SHA256(bytes(domain,x))`.
`signValue(domain,x) = unpadded base64url Ed25519.sign(bytes(domain,x))` (64 signature bytes). Node uses `sign(null,...)`, not a substitute hash signature scheme.

Domains: `result`, `event`, `event-signature`, `proposal`, `approval`, `checkpoint`, `receipt`, `approver-certificate`. Event signatures sign `{hash: eventHash}` in event-signature domain. Approval signatures sign `{proposalDigest: digest("proposal", proposal)}` in approval domain. Other signed objects sign their `body` directly. Key ID = lowercase SHA256(SPKI DER public key).

## Objects

Result: `{format,resultId,studentId,examId,version,marks:[{subject,score,max}]}`. Pseudonymous UUIDs replace names/roll numbers in public evidence.

Event body: `{format,id,sequence,type,resultId,version,data,commitment,previousHash,signer,issuedAt,correction}`. type PUBLISH/CORRECT. commitment=digest(result,data); previousHash is prior event hash, genesis 64 zeroes. hash=digest(event,body); event envelope `{body,hash,signature}`. ID UUID; sequence starts at 1. ISO UTC timestamps are institution assertions, not trusted timestamps.

Proposal: `{format,id,resultId,baseVersion,marks,reason,createdAt}`. Correction includes `{proposal,approvals}`; exactly two approvals, each `{certificate,signature}`. Certificate body `{format,userId,role:"APPROVER",keyId,publicKey}` signed by institution in approver-certificate domain. Both user IDs and key IDs must differ. Certificates are an institution-signed authorization assertion; registry outside DB is the signing-time authority. No key revocation/rotation protocol yet.

Checkpoint envelope `{body:{format,sequence,headHash,signer,issuedAt},signature}`. Every append creates a checkpoint in the same transaction.

Receipt envelope `{body:{format,resultId,version,commitment,eventHash,signer},signature}`. No names or marks in QR. QR holds `/verify?receipt=<base64url(UTF8(JSON.stringify(receipt)))>`. This capability URL reveals the referenced result to anyone holding it; do not publish student URLs.

## Verification

The initial proof contains the entire chain from genesis through the offered checkpoint. Verify every commitment, event hash/signature, sequence/link, per-result versions, correction approval/certificate signatures and proposal binding, then checkpoint signature/head. Receipt signature and fields must match its event. Later authorized events distinguish historical from current **as of the offered checkpoint**, not absolute current time.

Statuses: VALID_CURRENT, VALID_HISTORICAL, INVALID, INCOMPLETE. HTTP returns evidence, not just a validity Boolean. A client must run independent verification with its pinned key. Missing checkpoint is INCOMPLETE; malformed/truncated offered evidence is INVALID.

## Witness and limits

An optional externally obtained signed checkpoint is supplied by the verifier's caller or WITNESS_FILE. A chain shorter than that checkpoint or with a different hash at its sequence is rejected. Never automatically replace a witness with the server's newest answer. Export with scripts/export-checkpoint.js and publish through a separately controlled channel. Local exports exercise the protocol but are not an independently operated witness. Without independent storage, a DB attacker can restore an older internally consistent snapshot undetected. Even with a witness, events after its last checkpoint may be hidden. No claim of real-time freshness.

Institution key compromise allows forged history after trusted anchors; DB and signing service compromise together are outside the DB-only tampering model. Authentication/authorization DB rows are mutable and not cryptographic identity proof. Private keys and registry are outside DB, with development ACL restrictions; production needs dedicated key custody. Full-chain proofs are O(total ledger events), expose pseudonymous marks for all chain events, and are not production privacy-scalable. Merkle commitments and selective proofs are future work. Measurements are recorded in SECURITY_TESTS.md.
