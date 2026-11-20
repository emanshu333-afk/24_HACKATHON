import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { disposable } from '../scripts/lib/disposable.js';
import { createApp } from '../src/app.js';
import { tokenFor } from '../src/auth.js';
import { runtimeConfig } from '../src/config.js';
import { signValue, verifyEvidence, digest } from '../src/crypto.js';
let f, server, base, publication;
const secret = 'synthetic-test-secret-at-least-32-characters';
const marks = [{ subject: 'CS101', score: 75, max: 100 }];
const tokens = {};
async function request(path, { role = 'ADMIN', method = 'GET', body, raw, token, headers = {} } = {}) {
  return fetch(base + path, { method, headers: { ...(role || token ? { Authorization: `Bearer ${token ?? tokens[role]}` } : {}), ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}) });
}
before(async () => {
  f = await disposable();
  for (const [role, user] of Object.entries(f.users)) tokens[role] = tokenFor(user, secret);
  publication = await f.service.publish({ studentId: f.student.id, examId: f.exam.id, marks });
  server = createApp(f.db, f.service, { jwtSecret: secret }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(r => server.close(r)); await f?.dispose(); });
test('successful login returns only public user fields and a one-hour JWT', async () => {
  const r = await request('/auth/login', { method: 'POST', role: null, body: { email: f.users.ADMIN.email, password: f.passwords.ADMIN } });
  assert.equal(r.status, 200); const body = await r.json();
  assert.deepEqual(Object.keys(body.user).sort(), ['email','id','role']); assert.equal(body.expiresIn, 3600);
  assert.equal(jwt.verify(body.token, secret).sub, f.users.ADMIN.id);
});
for (const kind of ['wrong password', 'unknown user', 'SQL-like email']) test(`login rejects ${kind} without sensitive fields`, async () => {
  const body = { email: kind === 'wrong password' ? f.users.ADMIN.email : kind === 'SQL-like email' ? "x' OR 1=1--" : 'unknown@synthetic.test', password: 'wrong' };
  const r = await request('/auth/login', { method: 'POST', role: null, body });
  assert.equal(r.status, kind === 'SQL-like email' ? 400 : 401);
  const text = await r.text(); for (const value of [...Object.values(f.passwords), 'passwordHash', 'postgresql://', 'stack']) assert.ok(!text.includes(value));
});
for (const kind of ['missing', 'invalid', 'expired', 'tampered', 'wrong audience', 'wrong algorithm', 'no subject']) test(`JWT ${kind} rejected`, async () => {
  let token;
  if (kind === 'invalid') token = 'not.jwt';
  if (kind === 'tampered') token = tokens.ADMIN.slice(0, -6) + 'AAAAAA';
  if (['expired','wrong audience','wrong algorithm','no subject'].includes(kind)) token = jwt.sign({}, secret, { ...(kind !== 'no subject' ? { subject: f.users.ADMIN.id } : {}), issuer: 'verimark', audience: kind === 'wrong audience' ? 'other' : 'verimark-api', algorithm: kind === 'wrong algorithm' ? 'HS384' : 'HS256', expiresIn: kind === 'expired' ? -1 : 3600 });
  assert.equal((await request('/me', { role: null, token })).status, 401);
});
for (const role of ['STUDENT','APPROVER_A','AUDITOR']) test(`${role} cannot publish or propose corrections`, async () => {
  assert.equal((await request('/results', { method: 'POST', role, body: { studentId: f.student.id, examId: f.exam.id, marks } })).status, 403);
  assert.equal((await request(`/results/${publication.resultId}/corrections`, { method: 'POST', role, body: {} })).status, 403);
});
test('administrator cannot approve and client role claim does not elevate student', async () => {
  assert.equal((await request(`/corrections/${randomUUID()}/approvals`, { method: 'POST', body: { signature: 'A'.repeat(86) } })).status, 403);
  const token = jwt.sign({ role: 'ADMIN' }, secret, { subject: f.users.STUDENT.id, issuer: 'verimark', audience: 'verimark-api' });
  assert.equal((await request('/audits', { method: 'POST', role: null, token, body: {} })).status, 403);
});
test('registration and correction rejection are explicitly unsupported', async () => {
  assert.equal((await request('/auth/register', { method: 'POST', body: {} })).status, 404);
  assert.equal((await request(`/corrections/${randomUUID()}/reject`, { method: 'POST', body: {} })).status, 404);
});
test('student can read only owned result; every result subresource enforces ownership', async () => {
  assert.equal((await request(`/results/${publication.resultId}`, { role: 'STUDENT' })).status, 200);
  const student = await f.db.student.create({ data: { code: randomUUID(), name: 'Other student' } });
  const pub = await f.service.publish({ studentId: student.id, examId: f.exam.id, marks });
  for (const suffix of ['', '/history', '/receipt/1', '/marksheet/1']) assert.equal((await request(`/results/${pub.resultId}${suffix}`, { role: 'STUDENT' })).status, 403);
  const list = await (await request('/results', { role: 'STUDENT' })).json(); assert.equal(list.length, 1);
});
const invalidMarks = [ ['negative', [{ ...marks[0], score: -1 }]], ['too high', [{ ...marks[0], score: 101 }]], ['fraction', [{ ...marks[0], score: 75.1 }]], ['string', [{ ...marks[0], score: '75' }]], ['empty', []], ['duplicate subjects', [marks[0], marks[0]]], ['wrong maximum', [{ ...marks[0], max: 50 }]], ['script subject', [{ ...marks[0], subject: '<script>alert(1)</script>' }]], ['too many', Array.from({length:31}, (_,i) => ({...marks[0], subject:`CS${i}`}))] ];
for (const [kind, bad] of invalidMarks) test(`publication rejects ${kind} marks`, async () => assert.equal((await request('/results', { method: 'POST', body: { studentId: f.student.id, examId: f.exam.id, marks: bad } })).status, 400));
for (const field of ['studentId','examId','marks']) test(`publication rejects missing ${field}`, async () => {
  const input = { studentId: f.student.id, examId: f.exam.id, marks }; delete input[field];
  assert.equal((await request('/results', { method: 'POST', body: input })).status, 400);
});
for (const field of ['studentId','examId']) test(`publication rejects absent ${field} FK without partial result`, async () => {
  const count = await f.db.result.count();
  assert.equal((await request('/results', { method: 'POST', body: { studentId: f.student.id, examId: f.exam.id, marks, [field]: randomUUID() } })).status, 400);
  assert.equal(await f.db.result.count(), count);
});
test('invalid JSON, negative zero, extra role field and large body fail safely', async () => {
  assert.equal((await request('/results', { method: 'POST', raw: '{oops' })).status, 400);
  assert.equal((await request('/results', { method: 'POST', raw: JSON.stringify({studentId:f.student.id,examId:f.exam.id,marks}).replace('75','-0') })).status, 400);
  assert.equal((await request('/results', { method: 'POST', body: { studentId: f.student.id, examId: f.exam.id, marks, role: 'ADMIN' } })).status, 400);
  assert.equal((await request('/results', { method: 'POST', body: { padding: 'x'.repeat(66000) } })).status, 413);
  assert.equal((await request('/results/1%27%20OR%201%3D1')).status, 400);
});
test('CORS permits configured origin and never grants an arbitrary origin', async () => {
  const allowed = await request('/results', { method: 'OPTIONS', role: null, headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(allowed.status, 204); assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal((await request('/health', { role: null, headers: { Origin: 'https://evil.example' } })).headers.get('access-control-allow-origin'), null);
});
test('malformed QR, forged receipt and missing result return explicit failures', async () => {
  for (const query of ['', '?receipt=%%%', '?receipt=bnVsbA']) assert.equal((await request('/verify'+query, { role:null })).status, 400);
  assert.equal((await request('/verify', { method:'POST', role:null, body:{receipt:{body:{},signature:'A'.repeat(86)}} })).status, 400);
  assert.equal((await request(`/results/${randomUUID()}`)).status, 404);
});
test('ledger explorer is bounded and staff-only', async () => {
  const r = await request('/ledger/events?limit=1'); const data = await r.json();
  assert.equal(r.status, 200); assert.equal(data.events.length, 1); assert.equal(data.nextAfter, 1);
  assert.equal((await request('/ledger/events?limit=101')).status, 400);
  assert.equal((await request('/ledger/events', {role:'STUDENT'})).status, 403);
});
for (const reason of [undefined, '', '   ', 'abc']) test(`correction rejects invalid reason ${JSON.stringify(reason)}`, async () => {
  assert.equal((await request(`/results/${publication.resultId}/corrections`, { method:'POST',body:{baseVersion:1,marks,reason} })).status,400);
});
test('simultaneous distinct approvals finalize exactly once and replay fails', async () => {
  const p = await f.service.propose(publication.resultId, {baseVersion:1, marks:[{...marks[0],score:80}],reason:'Recount approved by committee'});
  const responses = await Promise.all(['APPROVER_A','APPROVER_B'].map(role => request(`/corrections/${p.id}/approvals`, {method:'POST',role,body:{signature:signValue('approval',{proposalDigest:p.digest},f.approverKeys[f.users[role].id])}})));
  for (const r of responses) assert.equal(r.status,200);
  assert.deepEqual((await Promise.all(responses.map(r=>r.json()))).map(r=>r.applied).sort(),[false,true]);
  const replay = await request(`/corrections/${p.id}/approvals`, {method:'POST',role:'APPROVER_A',body:{signature:signValue('approval',{proposalDigest:p.digest},f.approverKeys[f.users.APPROVER_A.id])}});
  assert.equal(replay.status,409); assert.equal((await replay.json()).error,'ALREADY_APPLIED');
});
test('proposal changed after first approval is rejected even if attacker recomputes digest', async () => {
  const p = await f.service.propose(publication.resultId,{baseVersion:2,marks,reason:'First agreed correction text'});
  await f.service.approve(p.id,f.users.APPROVER_A.id,signValue('approval',{proposalDigest:p.digest},f.approverKeys[f.users.APPROVER_A.id]));
  const changed = {...p.body,reason:'Attacker changed after signature'};
  await f.db.correctionProposal.update({where:{id:p.id},data:{body:changed,digest:digest('proposal',changed)}});
  const response = await request(`/corrections/${p.id}/approvals`, {method:'POST',role:'APPROVER_B',body:{signature:signValue('approval',{proposalDigest:digest('proposal',changed)},f.approverKeys[f.users.APPROVER_B.id])}});
  assert.equal(response.status,409); assert.equal((await response.json()).error,'INVALID_APPROVAL');
  await f.db.correctionProposal.update({where:{id:p.id},data:{body:p.body,digest:p.digest}});
});
test('database approver public-key replacement cannot authorize a new identity', async () => {
  const p = await f.service.propose(publication.resultId,{baseVersion:2,marks,reason:'Key replacement attack test'});
  const user = f.users.APPROVER_A;
  try {
    await f.db.user.update({where:{id:user.id},data:{publicKey:f.users.APPROVER_B.publicKey}});
    await assert.rejects(f.service.approve(p.id,user.id,signValue('approval',{proposalDigest:p.digest},f.approverKeys[f.users.APPROVER_B.id])),/UNREGISTERED_APPROVER/);
  } finally { await f.db.user.update({where:{id:user.id},data:{publicKey:user.publicKey}}); }
});
test('database-trigger failure rolls back result, version, event and checkpoint; retry succeeds', async () => {
  const student = await f.db.student.create({data:{code:randomUUID(),name:'Rollback test'}});
  const counts = await Promise.all([f.db.result.count(),f.db.resultVersion.count(),f.db.ledgerEvent.count(),f.db.checkpoint.count()]);
  await f.db.$executeRawUnsafe(`CREATE FUNCTION "${f.schema}".reject_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic interrupt'; END $$`);
  await f.db.$executeRawUnsafe(`CREATE TRIGGER synthetic_interrupt BEFORE INSERT ON "Checkpoint" FOR EACH ROW EXECUTE FUNCTION "${f.schema}".reject_checkpoint()`);
  try { await assert.rejects(f.service.publish({studentId:student.id,examId:f.exam.id,marks})); }
  finally { await f.db.$executeRawUnsafe('DROP TRIGGER synthetic_interrupt ON "Checkpoint"'); }
  assert.deepEqual(await Promise.all([f.db.result.count(),f.db.resultVersion.count(),f.db.ledgerEvent.count(),f.db.checkpoint.count()]),counts);
  const pub = await f.service.publish({studentId:student.id,examId:f.exam.id,marks});
  assert.equal((await f.service.verify(pub.receipt)).verification.status,'VALID_CURRENT');
});
for (const field of ['studentId','examId']) test(`direct SQL ${field} substitution is pinpointed`, async () => {
  const other = field === 'studentId' ? await f.db.student.create({data:{code:randomUUID(),name:'Other'}}) : await f.db.exam.create({data:{code:randomUUID(),title:'Other'}});
  const original = await f.db.result.findUnique({where:{id:publication.resultId}});
  try {
    if (field === 'studentId') await f.db.$executeRaw`UPDATE "Result" SET "studentId"=${other.id} WHERE id=${publication.resultId}`;
    else await f.db.$executeRaw`UPDATE "Result" SET "examId"=${other.id} WHERE id=${publication.resultId}`;
    assert.ok((await f.service.audit()).findings.some(x=>x.field===`result.${field}`&&x.actual===other.id&&x.expected===original[field]));
  } finally {await f.db.result.update({where:{id:publication.resultId},data:{[field]:original[field]}});}
});
test('direct SQL commitment edit and changed linkage are rejected', async () => {
  const v = await f.db.resultVersion.findFirst(), e = await f.db.ledgerEvent.findFirst();
  try {
    await f.db.$executeRaw`UPDATE "ResultVersion" SET commitment=${'0'.repeat(64)} WHERE id=${v.id}`;
    assert.ok((await f.service.audit()).findings.some(x=>x.field==='version.commitment'));
    await f.db.$executeRaw`UPDATE "LedgerEvent" SET body=jsonb_set(body,'{previousHash}',${JSON.stringify('f'.repeat(64))}::jsonb) WHERE id=${e.id}`;
    assert.ok((await f.service.verify()).verification.failures.some(x=>x.code==='BROKEN_LINK'));
  } finally {await f.db.resultVersion.update({where:{id:v.id},data:{commitment:v.commitment}});await f.db.ledgerEvent.update({where:{id:e.id},data:{body:e.body}});}
});
test('invalid runtime configuration rejects unsafe origins, port and database type', () => {
  const env={DATABASE_URL:'postgresql://unused@localhost/db',JWT_SECRET:secret};
  assert.equal(runtimeConfig(env).host,'127.0.0.1');
  for(const change of [{PORT:'NaN'},{PORT:'70000'},{JWT_SECRET:'short'},{PUBLIC_BASE_URL:'javascript:alert(1)'},{FRONTEND_ORIGIN:'https://u:p@example.test'},{DATABASE_URL:'sqlite://db'}]) assert.throws(()=>runtimeConfig({...env,...change}));
});
test('login throttles attempts at 21 per minute', async () => {
  const isolated = createApp(f.db,f.service,{jwtSecret:secret}).listen(0,'127.0.0.1'); await new Promise(r=>isolated.once('listening',r));
  try {
    for(let i=1;i<=21;i++){const r=await fetch(`http://127.0.0.1:${isolated.address().port}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,i<=20?400:429);}
  } finally {await new Promise(r=>isolated.close(r));}
});
test('real database unavailability returns 503 instead of misreporting JWT failure',async()=>{
  const url=new URL(process.env.DATABASE_URL);url.port='1';url.searchParams.set('connect_timeout','1');
  const down=new PrismaClient({datasources:{db:{url:url.toString()}}});
  const app=createApp(down,f.service,{jwtSecret:secret}).listen(0,'127.0.0.1');await new Promise(r=>app.once('listening',r));
  try{
    for(const path of ['/health','/me']){
      const r=await fetch(`http://127.0.0.1:${app.address().port}${path}`,{headers:{Authorization:`Bearer ${tokens.ADMIN}`}});
      assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'DATABASE_UNAVAILABLE'});
    }
  }finally{await new Promise(r=>app.close(r));await down.$disconnect();}
});
test('failed correction finalization rolls back second approval and all ledger writes',async()=>{
  const p=await f.service.propose(publication.resultId,{baseVersion:2,marks,reason:'Interrupted correction finalization'});
  const a=f.users.APPROVER_A.id,b=f.users.APPROVER_B.id;
  await f.service.approve(p.id,a,signValue('approval',{proposalDigest:p.digest},f.approverKeys[a]));
  const count=await f.db.ledgerEvent.count();
  await f.db.$executeRawUnsafe(`CREATE TRIGGER synthetic_interrupt BEFORE INSERT ON "Checkpoint" FOR EACH ROW EXECUTE FUNCTION "${f.schema}".reject_checkpoint()`);
  try{
    const r=await request(`/corrections/${p.id}/approvals`,{method:'POST',role:'APPROVER_B',body:{signature:signValue('approval',{proposalDigest:p.digest},f.approverKeys[b])}});
    assert.equal(r.status,500);assert.deepEqual(await r.json(),{error:'INTERNAL_ERROR'});
  }finally{await f.db.$executeRawUnsafe('DROP TRIGGER synthetic_interrupt ON "Checkpoint"');}
  assert.equal(await f.db.approval.count({where:{proposalId:p.id}}),1);assert.equal(await f.db.ledgerEvent.count(),count);
  assert.equal((await f.db.result.findUnique({where:{id:publication.resultId}})).currentVersion,2);
  assert.equal((await f.service.approve(p.id,b,signValue('approval',{proposalDigest:p.digest},f.approverKeys[b]))).applied,true);
});
