import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { loadKeys } from '../src/config.js';
import { LedgerService } from '../src/service.js';
import { signValue, verifyEvidence } from '../src/crypto.js';
import { createApp, decodeReceipt } from '../src/app.js';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/verimark' || process.env.LOCAL_ATTACK_TESTS !== '1') throw new Error('Integration attack tests require the isolated local development cluster');
const schema = `security_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const keys = loadKeys();
const service = new LedgerService(db, keys);
const marks = [{ subject: 'CS101', score: 81, max: 100 }];
let exam, student, published, approvers, server, base;
const signingKeys = Object.fromEntries(Object.entries(keys.registry).map(([id, cert]) => {
  const names = ['approver-a','approver-b'];
  const name = names.find(n => readFileSync(`.local/keys/${n}.public.pem`, 'utf8') === cert.body.publicKey);
  return [id, readFileSync(`.local/keys/${name}.private.pem`, 'utf8')];
}));
const signature = (p, id) => signValue('approval', { proposalDigest: p.digest }, signingKeys[id]);
async function newPublication() {
  const s = await db.student.create({ data: { code: randomUUID(), name: 'Synthetic test student' } });
  return service.publish({ studentId: s.id, examId: exam.id, marks });
}
before(async () => {
  const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','deploy'], { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' });
  assert.equal(migrated.status, 0, 'Fresh test schema migrations must apply');
  approvers = Object.keys(keys.registry);
  for (const id of approvers) await db.user.create({ data: { id, email: `${id}@verimark.test`, passwordHash: 'unused', role: 'APPROVER', publicKey: keys.registry[id].body.publicKey } });
  exam = await db.exam.create({ data: { code: 'TEST-2026', title: 'Synthetic exam' } });
  student = await db.student.create({ data: { code: 'TEST-001', name: 'Test Student' } });
  published = await service.publish({ studentId: student.id, examId: exam.id, marks });
  const app = createApp(db, service, { jwtSecret: process.env.JWT_SECRET });
  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(r => server.close(r));
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});
test('PostgreSQL publication produces independently verifiable signed evidence', async () => {
  const { evidence } = await service.verify(published.receipt);
  assert.equal(verifyEvidence(evidence, keys.publicKey, { receipt: published.receipt }).status, 'VALID_CURRENT');
  assert.equal((await service.audit()).status, 'VALID');
});
test('duplicate publication requests yield exactly one publication', async () => {
  const s = await db.student.create({ data: { code: randomUUID(), name: 'Duplicate test' } });
  const results = await Promise.allSettled([1,2].map(() => service.publish({ studentId: s.id, examId: exam.id, marks })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.message, 'ALREADY_PUBLISHED');
});
test('concurrent appends maintain a gap-free signed hash chain', async () => {
  await Promise.all(Array.from({ length: 6 }, () => newPublication()));
  assert.equal((await service.verify()).verification.status, 'VALID_CURRENT');
});
test('direct SQL current marks edit is pinpointed with expected and actual scores', async () => {
  const result = await db.result.findUnique({ where: { id: published.resultId } });
  try {
    await db.$executeRaw`UPDATE "Result" SET marks = ${JSON.stringify([{ ...marks[0], score: 99 }])}::jsonb WHERE id = ${result.id}`;
    const audit = await service.audit();
    const finding = audit.findings.find(f => f.field === 'result.marks.0.score');
    assert.equal(audit.status, 'INVALID'); assert.equal(finding.expected, 81); assert.equal(finding.actual, 99);
    assert.equal(finding.resultId, result.id);
  } finally { await db.result.update({ where: { id: result.id }, data: { marks: result.marks } }); }
});
test('direct SQL historical committed data edit is detected', async () => {
  const row = await db.resultVersion.findUnique({ where: { resultId_version: { resultId: published.resultId, version: 1 } } });
  try {
    await db.$executeRaw`UPDATE "ResultVersion" SET data = jsonb_set(data, '{marks,0,score}', '98'::jsonb) WHERE id = ${row.id}`;
    assert.ok((await service.audit()).findings.some(f => f.field === 'version.data.marks.0.score' && f.actual === 98));
  } finally { await db.resultVersion.update({ where: { id: row.id }, data: { data: row.data } }); }
});
test('modified stored ledger payload rejects proof and blocks further signing', async () => {
  const row = await db.ledgerEvent.findFirst({ orderBy: { sequence: 'asc' } });
  try {
    await db.ledgerEvent.update({ where: { id: row.id }, data: { body: { ...row.body, issuedAt: 'forged' } } });
    assert.equal((await service.verify()).verification.status, 'INVALID');
    await assert.rejects(newPublication(), /LEDGER_INTEGRITY_FAILURE/);
  } finally { await db.ledgerEvent.update({ where: { id: row.id }, data: { body: row.body } }); }
});
test('invalid stored event signature is detected', async () => {
  const row = await db.ledgerEvent.findFirst();
  try {
    await db.ledgerEvent.update({ where: { id: row.id }, data: { signature: 'A'.repeat(86) } });
    assert.ok((await service.audit()).findings.some(f => f.code === 'INVALID_EVENT_SIGNATURE'));
  } finally { await db.ledgerEvent.update({ where: { id: row.id }, data: { signature: row.signature } }); }
});
test('reordered database sequences are rejected and unsigned row metadata is pinpointed', async () => {
  const rows = await db.ledgerEvent.findMany({ orderBy: { sequence: 'asc' }, take: 2 });
  try {
    await db.ledgerEvent.update({ where: { id: rows[0].id }, data: { sequence: 100000 } });
    assert.equal((await service.verify()).verification.status, 'INVALID');
    assert.ok((await service.audit()).findings.some(f => f.field === 'event.sequence'));
  } finally { await db.ledgerEvent.update({ where: { id: rows[0].id }, data: { sequence: rows[0].sequence } }); }
});
test('deleted stored event is detected', async () => {
  const row = await db.ledgerEvent.findFirst({ orderBy: { sequence: 'asc' } });
  try {
    await db.ledgerEvent.delete({ where: { id: row.id } });
    assert.equal((await service.verify()).verification.status, 'INVALID');
    assert.ok((await service.audit()).findings.some(f => f.code === 'UNCOMMITTED_VERSION'));
  } finally { await db.ledgerEvent.create({ data: row }); }
});
test('stored checkpoint mismatch is detected', async () => {
  const row = await db.checkpoint.findFirst({ orderBy: { sequence: 'desc' } });
  try {
    await db.checkpoint.update({ where: { sequence: row.sequence }, data: { body: { ...row.body, headHash: '0'.repeat(64) } } });
    assert.equal((await service.verify()).verification.status, 'INVALID');
  } finally { await db.checkpoint.update({ where: { sequence: row.sequence }, data: { body: row.body } }); }
});
test('tampered version identity cannot mint a receipt for a different requested version', async () => {
  const row = await db.resultVersion.findUnique({ where: { resultId_version: { resultId: published.resultId, version: 1 } } });
  try {
    await db.resultVersion.update({ where: { id: row.id }, data: { version: 99 } });
    await assert.rejects(service.getReceipt(published.resultId, 99), /RESULT_INTEGRITY_FAILURE/);
    assert.ok((await service.audit()).findings.some(f => f.field === 'version.version' && f.actual === 99));
  } finally { await db.resultVersion.update({ where: { id: row.id }, data: { version: 1 } }); }
});
test('one approval does not apply; duplicate signer and reused signature are rejected; two distinct signatures apply', async () => {
  const p = await service.propose(published.resultId, { baseVersion: 1, marks: [{ ...marks[0], score: 86 }], reason: 'Recount verified missing answer' });
  const first = await service.approve(p.id, approvers[0], signature(p, approvers[0]));
  assert.equal(first.applied, false);
  assert.equal((await db.result.findUnique({ where: { id: published.resultId } })).currentVersion, 1);
  await assert.rejects(service.approve(p.id, approvers[0], signature(p, approvers[0])), /DUPLICATE_APPROVER/);
  const other = await service.propose(published.resultId, { baseVersion: 1, marks, reason: 'Different proposal replay test' });
  await assert.rejects(service.approve(other.id, approvers[1], signature(p, approvers[1])), /INVALID_APPROVAL/);
  const second = await service.approve(p.id, approvers[1], signature(p, approvers[1]));
  assert.equal(second.applied, true); assert.equal(second.version, 2);
  assert.equal((await service.verify(second.receipt)).verification.status, 'VALID_CURRENT');
  await assert.rejects(service.approve(other.id, approvers[1], signature(other, approvers[1])), /STALE_BASE_VERSION/);
});
test('original printed receipt stays valid historical after correction', async () => {
  const { verification } = await service.verify(published.receipt);
  assert.equal(verification.status, 'VALID_HISTORICAL');
  assert.equal(verification.result.marks[0].score, 81);
  assert.equal(verification.latestVersion, 2);
});
test('competing corrections cannot both apply to the same base version', async () => {
  const pub = await newPublication();
  const proposals = await Promise.all([82,83].map(score => service.propose(pub.resultId, { baseVersion: 1, marks: [{ ...marks[0], score }], reason: 'Concurrent correction test' })));
  for (const p of proposals) await service.approve(p.id, approvers[0], signature(p, approvers[0]));
  const results = await Promise.allSettled(proposals.map(p => service.approve(p.id, approvers[1], signature(p, approvers[1]))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.message, 'STALE_BASE_VERSION');
});
test('changed proposal and direct SQL forged approval are detected', async () => {
  const pub = await newPublication();
  const p = await service.propose(pub.resultId, { baseVersion: 1, marks, reason: 'Original proposal reason' });
  try {
    await db.correctionProposal.update({ where: { id: p.id }, data: { body: { ...p.body, reason: 'Tampered reason' } } });
    await assert.rejects(service.approve(p.id, approvers[0], signature(p, approvers[0])), /PROPOSAL_TAMPERED/);
    assert.ok((await service.audit()).findings.some(f => f.code === 'PROPOSAL_TAMPERED'));
  } finally { await db.correctionProposal.update({ where: { id: p.id }, data: { body: p.body } }); }
  const forged = await db.approval.create({ data: { proposalId: p.id, userId: approvers[0], signature: 'A'.repeat(86) } });
  try {
    await assert.rejects(service.approve(p.id, approvers[1], signature(p, approvers[1])), /INVALID_APPROVAL/);
    assert.ok((await service.audit()).findings.some(f => f.code === 'INVALID_STORED_APPROVAL'));
  } finally { await db.approval.delete({ where: { id: forged.id } }); }
});
test('database rollback is detected against a checkpoint retained outside PostgreSQL', async () => {
  await newPublication();
  const { evidence } = await service.verify();
  const path = `.local/test-witness-${schema}.json`;
  writeFileSync(path, JSON.stringify(evidence.checkpoint), { flag: 'wx' });
  try {
    const witness = JSON.parse(readFileSync(path, 'utf8'));
    const last = await db.ledgerEvent.findFirst({ orderBy: { sequence: 'desc' } });
    const cp = await db.checkpoint.findUnique({ where: { sequence: last.sequence } });
    try {
      await db.checkpoint.delete({ where: { sequence: last.sequence } });
      await db.ledgerEvent.delete({ where: { id: last.id } });
      const rolledBack = await service.evidence();
      assert.equal(verifyEvidence(rolledBack, keys.publicKey).status, 'VALID_CURRENT');
      const checked = verifyEvidence(rolledBack, keys.publicKey, { witness });
      assert.ok(checked.failures.some(f => f.code === 'ROLLBACK_BELOW_WITNESS'));
    } finally { await db.ledgerEvent.create({ data: last }); await db.checkpoint.create({ data: cp }); }
  } finally { unlinkSync(path); }
});
test('HTTP login, RBAC, public forged receipt and QR URL evidence verification', async () => {
  const { hashPassword, tokenFor } = await import('../src/auth.js');
  const password = randomUUID();
  const user = await db.user.create({ data: { email: 'admin@test.example', role: 'ADMIN', passwordHash: hashPassword(password) } });
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${base}/results`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  const studentUser = await db.user.create({ data: { email: 'student@test.example', role: 'STUDENT', passwordHash: 'unused' } });
  const studentToken = tokenFor(studentUser, process.env.JWT_SECRET);
  assert.equal((await fetch(`${base}/audits`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
  assert.equal((await fetch(`${base}/results/${published.resultId}`, { headers: { Authorization: `Bearer ${studentToken}` } })).status, 403);
  const receiptResponse = await fetch(`${base}/results/${published.resultId}/receipt/1`, { headers });
  const receiptInfo = await receiptResponse.json();
  const qrUrl = new URL(receiptInfo.verificationUrl);
  const decodedReceipt = decodeReceipt(qrUrl.searchParams.get('receipt'));
  assert.deepEqual(decodedReceipt, published.receipt);
  const verificationResponse = await fetch(`${base}${qrUrl.pathname}${qrUrl.search}`);
  const proof = await verificationResponse.json();
  assert.equal(verifyEvidence(proof.evidence, keys.publicKey, { receipt: decodedReceipt }).status, 'VALID_HISTORICAL');
  const html = await (await fetch(`${base}/results/${published.resultId}/marksheet/1`, { headers })).text();
  assert.ok(html.includes('data:image/png;base64,')); assert.ok(html.includes('VALID_HISTORICAL'));
  const image = PNG.sync.read(Buffer.from(html.match(/src="data:image\/png;base64,([^"]+)"/)[1], 'base64'));
  const scanned = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
  assert.ok(scanned, 'QR image must be optically decodable');
  assert.equal(scanned.data, receiptInfo.verificationUrl);
  const forged = structuredClone(published.receipt); forged.body.version = 99;
  assert.equal((await fetch(`${base}/verify`, { method: 'POST', headers, body: JSON.stringify({ receipt: forged }) })).status, 400);
  assert.equal((await fetch(`${base}/results`, { method: 'POST', headers, body: JSON.stringify({ studentId: student.id, examId: exam.id, marks }) })).status, 409);
  const s = await db.student.create({ data: { code: randomUUID(), name: 'HTTP publication test' } });
  const post = (path, body, authHeaders = headers) => fetch(`${base}${path}`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
  const pubResponse = await post('/results', { studentId: s.id, examId: exam.id, marks });
  assert.equal(pubResponse.status, 201);
  const pub = await pubResponse.json();
  const proposed = await post(`/results/${pub.resultId}/corrections`, { baseVersion: 1, marks: [{ ...marks[0], score: 88 }], reason: 'HTTP signed correction test' });
  assert.equal(proposed.status, 201);
  const proposal = await proposed.json();
  for (let i = 0; i < 2; i++) {
    const response = await post(`/corrections/${proposal.id}/approvals`, { signature: signature(proposal, approvers[i]) }, { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFor({ id: approvers[i] }, process.env.JWT_SECRET)}` });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).applied, i === 1);
  }
  assert.equal((await (await fetch(`${base}/results/${pub.resultId}/history`, { headers })).json()).length, 2);
  assert.equal((await (await post('/audits', {})).json()).status, 'VALID');
  assert.equal((await fetch(`${base}/checkpoints/latest`)).status, 200);
});
test('malformed and fractional SQL payloads produce audit failures, not exceptions', async () => {
  const row = await db.ledgerEvent.findFirst({ orderBy: { sequence: 'asc' } });
  const result = await db.result.findUnique({ where: { id: published.resultId } });
  try {
    await db.$executeRaw`UPDATE "LedgerEvent" SET body = 'null'::jsonb WHERE id = ${row.id}`;
    assert.ok((await service.audit()).findings.some(f => f.code === 'MALFORMED_EVENT'));
    await db.ledgerEvent.update({ where: { id: row.id }, data: { body: row.body } });
    await db.$executeRaw`UPDATE "Result" SET marks = jsonb_set(marks, '{0,score}', '99.5'::jsonb) WHERE id = ${result.id}`;
    assert.ok((await service.audit()).findings.some(f => f.actual === 99.5));
  } finally {
    await db.ledgerEvent.update({ where: { id: row.id }, data: { body: row.body } });
    await db.result.update({ where: { id: result.id }, data: { marks: result.marks } });
  }
});
test('full-chain proof size and verification time are measured; final audit clean', async t => {
  const { evidence } = await service.verify();
  const started = performance.now();
  assert.equal(verifyEvidence(evidence, keys.publicKey).status, 'VALID_CURRENT');
  t.diagnostic(`events=${evidence.events.length} bytes=${Buffer.byteLength(JSON.stringify(evidence))} verification_ms=${(performance.now() - started).toFixed(2)}`);
  const audit = await service.audit();
  assert.deepEqual(audit.findings, []);
});
