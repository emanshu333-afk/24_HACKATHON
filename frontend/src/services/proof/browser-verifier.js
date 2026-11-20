// Source: backend/h8-core@21e766c:shared/browser-verifier.js
import { canonical, protocolBytes } from './canonical.js';
export { canonical, compareDisplayedResult } from './canonical.js';
const FORMAT = 'verimark-v1', ZERO = '0'.repeat(64);
const unbase64 = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const pemBytes = pem => unbase64(pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, ''));
const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
const subtle = () => { if (!globalThis.crypto?.subtle) throw new Error('WEBCRYPTO_UNAVAILABLE'); return globalThis.crypto.subtle; };
export const digest = async (domain, value) => hex(await subtle().digest('SHA-256', protocolBytes(domain, value)));
export async function keyId(pem) {
  const der = pemBytes(pem);
  await subtle().importKey('spki', der, 'Ed25519', false, ['verify']);
  return hex(await subtle().digest('SHA-256', der));
}
export async function verifyValue(domain, value, signature, pem) {
  try {
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return false;
    const key = await subtle().importKey('spki', pemBytes(pem), 'Ed25519', false, ['verify']);
    return await subtle().verify('Ed25519', key, unbase64(signature), protocolBytes(domain, value));
  } catch { return false; }
}
export async function checkApprovals(correction, institutionKey) {
  const { proposal, approvals } = correction;
  if (!proposal.reason?.trim() || proposal.format !== FORMAT) throw new Error('INVALID_PROPOSAL');
  const proposalDigest = await digest('proposal', proposal), seen = new Set(), keys = new Set();
  if (approvals.length !== 2) throw new Error('TWO_APPROVALS_REQUIRED');
  for (const a of approvals) {
    const cert = a.certificate;
    if (!await verifyValue('approver-certificate', cert.body, cert.signature, institutionKey) || cert.body.role !== 'APPROVER' || cert.body.format !== FORMAT) throw new Error('INVALID_APPROVER_CERTIFICATE');
    if (seen.has(cert.body.userId) || keys.has(cert.body.keyId)) throw new Error('DUPLICATE_APPROVER');
    if (await keyId(cert.body.publicKey) !== cert.body.keyId || !await verifyValue('approval', { proposalDigest }, a.signature, cert.body.publicKey)) throw new Error('INVALID_APPROVAL');
    seen.add(cert.body.userId); keys.add(cert.body.keyId);
  }
}
// Trust roots and optional witness are supplied by the caller, NOT taken from HTTP evidence.
// WebCrypto support requires HTTPS or localhost and an Ed25519-capable browser.
export async function verifyEvidence(evidence, institutionKey, { witness, receipt } = {}) {
  const failures = [], fail = (code, details = {}) => failures.push({ code, ...details });
  try {
    if (!evidence?.checkpoint || !Array.isArray(evidence.events)) return { status: 'INCOMPLETE', failures: [{ code: 'MISSING_EVIDENCE' }] };
    if (!globalThis.crypto?.subtle) return { status: 'INCOMPLETE', failures: [{ code: 'WEBCRYPTO_UNAVAILABLE' }] };
    // Distinguish unsupported algorithm from forged evidence.
    try { await subtle().importKey('spki', pemBytes(institutionKey), 'Ed25519', false, ['verify']); }
    catch (error) { if (error.name === 'NotSupportedError') return { status: 'INCOMPLETE', failures: [{ code: 'ED25519_UNAVAILABLE' }] }; throw error; }
    const cp = evidence.checkpoint, signer = await keyId(institutionKey);
    if (!await verifyValue('checkpoint', cp.body, cp.signature, institutionKey) || cp.body.signer !== signer || cp.body.format !== FORMAT) fail('INVALID_CHECKPOINT_SIGNATURE');
    if (evidence.events.length !== cp.body.sequence || cp.body.sequence < 1) fail('INCOMPLETE_CHAIN');
    let previous = ZERO;
    const latest = new Map(), eventIds = new Set();
    for (let i = 0; i < evidence.events.length; i++) {
      const event = evidence.events[i], b = event.body;
      const detail = { eventId: b.id, sequence: b.sequence, resultId: b.resultId, version: b.version };
      if (b.sequence !== i + 1 || b.previousHash !== previous) fail('BROKEN_LINK', detail);
      if (eventIds.has(b.id)) fail('DUPLICATE_EVENT_ID', detail);
      eventIds.add(b.id);
      if (b.format !== FORMAT || b.signer !== signer || await digest('event', b) !== event.hash) fail('EVENT_HASH_MISMATCH', detail);
      if (!await verifyValue('event-signature', { hash: event.hash }, event.signature, institutionKey)) fail('INVALID_EVENT_SIGNATURE', detail);
      if (await digest('result', b.data) !== b.commitment || b.data.resultId !== b.resultId || b.data.version !== b.version || b.data.format !== FORMAT) fail('RESULT_COMMITMENT_MISMATCH', detail);
      const old = latest.get(b.resultId);
      if (!old) {
        if (b.type !== 'PUBLISH' || b.version !== 1 || b.correction !== null) fail('INVALID_PUBLICATION', detail);
      } else {
        if (b.type !== 'CORRECT' || b.version !== old.body.version + 1) fail('INVALID_VERSION', detail);
        try {
          await checkApprovals(b.correction, institutionKey);
          const p = b.correction.proposal;
          if (p.resultId !== b.resultId || p.baseVersion !== old.body.version || canonical(p.marks) !== canonical(b.data.marks) || b.data.studentId !== old.body.data.studentId || b.data.examId !== old.body.data.examId) fail('PROPOSAL_MISMATCH', detail);
        } catch (e) { fail(e.message, detail); }
      }
      latest.set(b.resultId, event); previous = event.hash;
    }
    if (previous !== cp.body.headHash) fail('CHECKPOINT_HEAD_MISMATCH');
    let witnessed = false;
    if (witness) {
      if (!await verifyValue('checkpoint', witness.body, witness.signature, institutionKey) || witness.body.signer !== signer || witness.body.format !== FORMAT) fail('INVALID_WITNESS');
      else if (witness.body.sequence > cp.body.sequence) fail('ROLLBACK_BELOW_WITNESS');
      else if (evidence.events[witness.body.sequence - 1]?.hash !== witness.body.headHash) fail('WITNESS_FORK');
      else witnessed = true;
    }
    let target;
    if (receipt) {
      if (!await verifyValue('receipt', receipt.body, receipt.signature, institutionKey) || receipt.body.format !== FORMAT || receipt.body.signer !== signer) fail('FORGED_RECEIPT');
      target = evidence.events.find(e => e.hash === receipt.body.eventHash);
      if (!target) fail('RECEIPT_EVENT_MISSING');
      else if (receipt.body.resultId !== target.body.resultId || receipt.body.version !== target.body.version || receipt.body.commitment !== target.body.commitment) fail('RECEIPT_MISMATCH');
    }
    return { status: failures.length ? 'INVALID' : target && latest.get(target.body.resultId).hash !== target.hash ? 'VALID_HISTORICAL' : 'VALID_CURRENT', failures, checkpointSequence: cp.body.sequence, freshness: witnessed && !failures.length ? 'AT_LEAST_WITNESSED_CHECKPOINT' : 'UNWITNESSED', currentAsOf: cp.body.issuedAt, ...(target ? { result: target.body.data, latestVersion: latest.get(target.body.resultId).body.version } : {}) };
  } catch { return { status: 'INVALID', failures: [...failures, { code: 'MALFORMED_EVIDENCE' }] }; }
}
