import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { canonical, digest, signValue, verifyValue, signed, keyId, verifyEvidence, FORMAT, ZERO, checkApprovals } from '../src/crypto.js';
const pair = () => {
  const k = generateKeyPairSync('ed25519');
  return { privateKey: k.privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKey: k.publicKey.export({ type: 'spki', format: 'pem' }) };
};
const institution = pair();
function fixture() {
  const data = { format: FORMAT, resultId: 'result-1', studentId: 'student-1', examId: 'exam-1', version: 1, marks: [{ subject: 'CS', score: 85, max: 100 }] };
  const body = { format: FORMAT, id: 'event-1', sequence: 1, type: 'PUBLISH', resultId: data.resultId, version: 1, data, commitment: digest('result', data), previousHash: ZERO, signer: keyId(institution.publicKey), issuedAt: '2026-11-20T00:00:00.000Z', correction: null };
  const hash = digest('event', body);
  const event = { body, hash, signature: signValue('event-signature', { hash }, institution.privateKey) };
  const checkpoint = signed('checkpoint', { format: FORMAT, sequence: 1, headHash: hash, signer: body.signer, issuedAt: body.issuedAt }, institution.privateKey);
  const receipt = signed('receipt', { format: FORMAT, signer: body.signer, eventHash: hash, resultId: data.resultId, version: 1, commitment: body.commitment }, institution.privateKey);
  return { evidence: { events: [event], checkpoint }, receipt };
}
test('canonical ordering, integers and domain separation', () => {
  assert.equal(canonical({ z: 2, a: [1, 'é'] }), '{"a":[1,"é"],"z":2}');
  assert.throws(() => canonical({ x: 1.5 }));
  assert.throws(() => canonical({ x: undefined }));
  assert.notEqual(digest('event', {}), digest('result', {}));
});
test('real Ed25519 signatures reject changed message and wrong key', () => {
  const signature = signValue('test', { a: 1 }, institution.privateKey);
  assert.ok(verifyValue('test', { a: 1 }, signature, institution.publicKey));
  assert.ok(!verifyValue('test', { a: 2 }, signature, institution.publicKey));
  assert.ok(!verifyValue('test', { a: 1 }, signature, pair().publicKey));
});
test('independent verification validates receipt, commitment and checkpoint', () => {
  const { evidence, receipt } = fixture();
  assert.equal(verifyEvidence(evidence, institution.publicKey, { receipt }).status, 'VALID_CURRENT');
});
for (const [label, mutate] of [
  ['incorrect marks', f => { f.evidence.events[0].body.data.marks[0].score = 99; }],
  ['modified ledger payload', f => { f.evidence.events[0].body.type = 'CORRECT'; }],
  ['invalid signature', f => { f.evidence.events[0].signature = 'A'.repeat(86); }],
  ['deleted event', f => { f.evidence.events = []; }],
  ['reordered sequence', f => { f.evidence.events[0].body.sequence = 2; }],
  ['checkpoint mismatch', f => { f.evidence.checkpoint.body.headHash = ZERO; }],
  ['forged receipt', f => { f.receipt.body.version = 2; }]
]) test(`rejects ${label}`, () => {
  const f = fixture(); mutate(f);
  assert.equal(verifyEvidence(f.evidence, institution.publicKey, { receipt: f.receipt }).status, 'INVALID');
});
test('missing evidence is incomplete', () => assert.equal(verifyEvidence({}, institution.publicKey).status, 'INCOMPLETE'));
test('approvals require two identities and two distinct keys bound to exact proposal', () => {
  const proposal = { format: FORMAT, id: 'p1', resultId: 'r1', baseVersion: 1, marks: [], reason: 'Clerical error' };
  const approve = (userId, k) => ({ certificate: signed('approver-certificate', { format: FORMAT, role: 'APPROVER', userId, keyId: keyId(k.publicKey), publicKey: k.publicKey }, institution.privateKey), signature: signValue('approval', { proposalDigest: digest('proposal', proposal) }, k.privateKey) });
  const a = approve('a', pair()), b = approve('b', pair());
  assert.throws(() => checkApprovals({ proposal, approvals: [a] }, institution.publicKey), /TWO_APPROVALS/);
  assert.throws(() => checkApprovals({ proposal, approvals: [a, a] }, institution.publicKey), /DUPLICATE/);
  assert.doesNotThrow(() => checkApprovals({ proposal, approvals: [a,b] }, institution.publicKey));
  assert.throws(() => checkApprovals({ proposal: { ...proposal, id: 'p2' }, approvals: [a,b] }, institution.publicKey), /INVALID_APPROVAL/);
});
