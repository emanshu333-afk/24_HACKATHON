import { createHash, sign, verify, createPublicKey } from 'node:crypto';
import { canonical, protocolBytes } from '../shared/canonical.js';
export { canonical, compareDisplayedResult } from '../shared/canonical.js';

export const ZERO = '0'.repeat(64);
export const FORMAT = 'verimark-v1';
export const bytes = protocolBytes;
export const digest = (domain, value) => createHash('sha256').update(bytes(domain, value)).digest('hex');
export const keyId = key => {
  const publicKey = createPublicKey(key);
  if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('Ed25519 key required');
  return createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
};
export const signValue = (domain, value, key) => sign(null, bytes(domain, value), key).toString('base64url');
export function verifyValue(domain, value, signature, key) {
  try {
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return false;
    if (createPublicKey(key).asymmetricKeyType !== 'ed25519') return false;
    return verify(null, bytes(domain, value), key, Buffer.from(signature, 'base64url'));
  } catch { return false; }
}
export const signed = (domain, body, key) => ({ body, signature: signValue(domain, body, key) });
export function checkApprovals(correction, institutionKey) {
  const { proposal, approvals } = correction;
  if (!proposal.reason?.trim() || proposal.format !== FORMAT) throw new Error('INVALID_PROPOSAL');
  const proposalDigest = digest('proposal', proposal);
  const seen = new Set();
  const keys = new Set();
  if (approvals.length !== 2) throw new Error('TWO_APPROVALS_REQUIRED');
  for (const a of approvals) {
    const cert = a.certificate;
    if (!verifyValue('approver-certificate', cert.body, cert.signature, institutionKey) || cert.body.role !== 'APPROVER' || cert.body.format !== FORMAT) throw new Error('INVALID_APPROVER_CERTIFICATE');
    if (seen.has(cert.body.userId) || keys.has(cert.body.keyId)) throw new Error('DUPLICATE_APPROVER');
    if (keyId(cert.body.publicKey) !== cert.body.keyId || !verifyValue('approval', { proposalDigest }, a.signature, cert.body.publicKey)) throw new Error('INVALID_APPROVAL');
    seen.add(cert.body.userId); keys.add(cert.body.keyId);
  }
}

// No database or network dependency. institutionKey MUST come from a separately trusted source.
export function verifyEvidence(evidence, institutionKey, { witness, receipt } = {}) {
  const failures = [];
  const fail = (code, details = {}) => failures.push({ code, ...details });
  try {
    if (!evidence?.checkpoint || !Array.isArray(evidence.events)) return { status: 'INCOMPLETE', failures: [{ code: 'MISSING_EVIDENCE' }] };
    const cp = evidence.checkpoint;
    const signer = keyId(institutionKey);
    if (!verifyValue('checkpoint', cp.body, cp.signature, institutionKey) || cp.body.signer !== signer || cp.body.format !== FORMAT) fail('INVALID_CHECKPOINT_SIGNATURE');
    if (evidence.events.length !== cp.body.sequence || cp.body.sequence < 1) fail('INCOMPLETE_CHAIN');
    let previous = ZERO;
    const latest = new Map();
    const eventIds = new Set();
    for (let i = 0; i < evidence.events.length; i++) {
      const event = evidence.events[i], b = event.body;
      const detail = { eventId: b.id, sequence: b.sequence, resultId: b.resultId, version: b.version };
      if (b.sequence !== i + 1 || b.previousHash !== previous) fail('BROKEN_LINK', detail);
      if (eventIds.has(b.id)) fail('DUPLICATE_EVENT_ID', detail);
      eventIds.add(b.id);
      if (b.format !== FORMAT || b.signer !== signer || digest('event', b) !== event.hash) fail('EVENT_HASH_MISMATCH', detail);
      if (!verifyValue('event-signature', { hash: event.hash }, event.signature, institutionKey)) fail('INVALID_EVENT_SIGNATURE', detail);
      if (digest('result', b.data) !== b.commitment || b.data.resultId !== b.resultId || b.data.version !== b.version || b.data.format !== FORMAT) fail('RESULT_COMMITMENT_MISMATCH', detail);
      const old = latest.get(b.resultId);
      if (!old) {
        if (b.type !== 'PUBLISH' || b.version !== 1 || b.correction !== null) fail('INVALID_PUBLICATION', detail);
      } else {
        if (b.type !== 'CORRECT' || b.version !== old.body.version + 1) fail('INVALID_VERSION', detail);
        try {
          checkApprovals(b.correction, institutionKey);
          const p = b.correction.proposal;
          if (p.resultId !== b.resultId || p.baseVersion !== old.body.version || canonical(p.marks) !== canonical(b.data.marks) || b.data.studentId !== old.body.data.studentId || b.data.examId !== old.body.data.examId) fail('PROPOSAL_MISMATCH', detail);
        } catch (e) { fail(e.message, detail); }
      }
      latest.set(b.resultId, event);
      previous = event.hash;
    }
    if (previous !== cp.body.headHash) fail('CHECKPOINT_HEAD_MISMATCH');
    let witnessed = false;
    if (witness) {
      if (!verifyValue('checkpoint', witness.body, witness.signature, institutionKey) || witness.body.signer !== signer || witness.body.format !== FORMAT) fail('INVALID_WITNESS');
      else if (witness.body.sequence > cp.body.sequence) fail('ROLLBACK_BELOW_WITNESS');
      else if (evidence.events[witness.body.sequence - 1]?.hash !== witness.body.headHash) fail('WITNESS_FORK');
      else witnessed = true;
    }
    let target;
    if (receipt) {
      if (!verifyValue('receipt', receipt.body, receipt.signature, institutionKey) || receipt.body.format !== FORMAT || receipt.body.signer !== signer) fail('FORGED_RECEIPT');
      target = evidence.events.find(e => e.hash === receipt.body.eventHash);
      if (!target) fail('RECEIPT_EVENT_MISSING');
      else if (receipt.body.resultId !== target.body.resultId || receipt.body.version !== target.body.version || receipt.body.commitment !== target.body.commitment) fail('RECEIPT_MISMATCH');
    }
    return {
      status: failures.length ? 'INVALID' : target && latest.get(target.body.resultId).hash !== target.hash ? 'VALID_HISTORICAL' : 'VALID_CURRENT',
      failures, checkpointSequence: cp.body.sequence,
      freshness: witnessed && !failures.length ? 'AT_LEAST_WITNESSED_CHECKPOINT' : 'UNWITNESSED',
      currentAsOf: cp.body.issuedAt,
      ...(target ? { result: target.body.data, latestVersion: latest.get(target.body.resultId).body.version } : {})
    };
  } catch { return { status: 'INVALID', failures: [...failures, { code: 'MALFORMED_EVIDENCE' }] }; }
}
