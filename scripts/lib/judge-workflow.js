import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { disposable } from './disposable.js';
import { createApp } from '../../src/app.js';
import { signValue, verifyEvidence, compareDisplayedResult } from '../../src/crypto.js';
import { verifyEvidence as browserVerify } from '../../shared/browser-verifier.js';

export async function judgeWorkflow() {
  const f = await disposable();
  const secret = randomUUID() + randomUUID();
  const server = createApp(f.db, f.service, { jwtSecret: secret }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`, tokens = {}, captures = {}, timings = [];
  const marks = [{ subject: 'CS101', score: 75, max: 100 }];
  async function call(name, path, { method = 'GET', role = 'ADMIN', body, status = 200, html = false } = {}) {
    const started = performance.now();
    const r = await fetch(base + path, { method, headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(r.status, status, `${method} ${path}`);
    const data = html ? await r.text() : await r.json();
    timings.push(performance.now() - started);
    if (!html) captures[name] = { status: r.status, body: data };
    return data;
  }
  try {
    for (const role of ['ADMIN','STUDENT','AUDITOR','APPROVER_A','APPROVER_B']) {
      const login = await call('login', '/auth/login', { method:'POST', body:{email:f.users[role].email,password:f.passwords[role]} });
      tokens[role] = login.token;
      // Public fixtures must never contain live credentials or bearer tokens.
      captures.login = {status:200,body:{...login,token:'<JWT_FROM_LOGIN>'}};
    }
    await call('health','/health'); await call('me','/me'); await call('students','/students'); await call('exams','/exams');
    const publication = await call('publication','/results',{method:'POST',body:{studentId:f.student.id,examId:f.exam.id,marks},status:201});
    const receipt = publication.receipt;
    const current = await call('current','/verify',{method:'POST',role:null,body:{receipt}});
    const verified = verifyEvidence(current.evidence,f.keys.publicKey,{receipt});
    assert.equal(verified.status,'VALID_CURRENT'); assert.equal(verified.result.marks[0].score,75);
    assert.deepEqual(await browserVerify(current.evidence,f.keys.publicKey,{receipt}),verified);
    await call('results','/results'); await call('result',`/results/${publication.resultId}`);
    const receiptInfo = await call('receipt',`/results/${publication.resultId}/receipt/1`);
    const html = await call('marksheet',`/results/${publication.resultId}/marksheet/1`,{html:true});
    const png = PNG.sync.read(Buffer.from(html.match(/src="data:image\/png;base64,([^"]+)"/)[1],'base64'));
    const scan = jsQR(new Uint8ClampedArray(png.data),png.width,png.height); assert.equal(scan.data,receiptInfo.verificationUrl);
    const qr = new URL(scan.data); const viaQr = await call('qr', qr.pathname+qr.search,{role:null});
    assert.equal(verifyEvidence(viaQr.evidence,f.keys.publicKey,{receipt}).status,'VALID_CURRENT');
    await f.db.$executeRaw`UPDATE "Result" SET marks=jsonb_set(marks,'{0,score}','99'::jsonb) WHERE id=${publication.resultId}`;
    const tamperedProjection = await call('tamperedProjection',`/results/${publication.resultId}`);
    const originalProof = await call('proofDuringSqlTamper','/verify',{method:'POST',role:null,body:{receipt}});
    const signedCheck = verifyEvidence(originalProof.evidence,f.keys.publicKey,{receipt});
    assert.equal(signedCheck.status,'VALID_CURRENT'); // SQL projection is separate from authentic publication.
    const displayCheck = compareDisplayedResult(signedCheck,{...signedCheck.result,marks:tamperedProjection.marks});
    assert.equal(displayCheck.status,'INVALID');
    const audit = await call('tamperAudit','/audits',{method:'POST',role:'AUDITOR',body:{}});
    const finding = audit.findings.find(x=>x.field==='result.marks.0.score'); assert.equal(finding.expected,75);assert.equal(finding.actual,99);
    await f.db.result.update({where:{id:publication.resultId},data:{marks}});
    const proposal = await call('proposal',`/results/${publication.resultId}/corrections`,{method:'POST',body:{baseVersion:1,marks:[{...marks[0],score:80}],reason:'Committee recount confirmed omitted five marks'},status:201});
    await call('invalidApproval',`/corrections/${proposal.id}/approvals`,{method:'POST',role:'APPROVER_A',body:{signature:'A'.repeat(86)},status:400});
    assert.equal(await f.db.approval.count(),0);
    for(const [i,role] of ['APPROVER_A','APPROVER_B'].entries()){
      const response = await call(i?'secondApproval':'firstApproval',`/corrections/${proposal.id}/approvals`,{method:'POST',role,body:{signature:signValue('approval',{proposalDigest:proposal.digest},f.approverKeys[f.users[role].id])}});
      assert.equal(response.applied,i===1);
      assert.equal((await f.db.result.findUnique({where:{id:publication.resultId}})).currentVersion,i+1);
    }
    const correctedReceipt = captures.secondApproval.body.receipt;
    const corrected = await call('corrected','/verify',{method:'POST',role:null,body:{receipt:correctedReceipt}});
    const historical = await call('historical','/verify',{method:'POST',role:null,body:{receipt}});
    assert.equal(verifyEvidence(corrected.evidence,f.keys.publicKey,{receipt:correctedReceipt}).status,'VALID_CURRENT');
    assert.equal(verifyEvidence(historical.evidence,f.keys.publicKey,{receipt}).status,'VALID_HISTORICAL');
    await call('corrections','/corrections'); await call('correction',`/corrections/${proposal.id}`);
    const history = await call('history',`/results/${publication.resultId}/history`); assert.equal(history.length,2); assert.equal(history[0].data.marks[0].score,75);
    await call('correctedMarksheet',`/results/${publication.resultId}/marksheet/2`,{html:true});
    const checkpoint = await call('checkpoint','/checkpoints/latest',{role:null});
    await call('ledger','/ledger/events?limit=1');
    await call('missing',`/results/${randomUUID()}`,{status:404});
    const tamperedEvidence = structuredClone(corrected.evidence); tamperedEvidence.events[0].body.data.marks[0].score=99;
    const tamperedVerification = verifyEvidence(tamperedEvidence,f.keys.publicKey,{receipt}); assert.equal(tamperedVerification.status,'INVALID');
    // Retained checkpoint is outside SQL in runner memory. It is NOT an independent operator.
    const lastEvent=await f.db.ledgerEvent.findFirst({orderBy:{sequence:'desc'}}),lastCp=await f.db.checkpoint.findFirst({orderBy:{sequence:'desc'}});
    await f.db.checkpoint.delete({where:{sequence:lastCp.sequence}}); await f.db.ledgerEvent.delete({where:{id:lastEvent.id}});
    const rollback=await f.service.evidence();
    const unanchored=verifyEvidence(rollback,f.keys.publicKey,{receipt}); assert.equal(unanchored.status,'VALID_CURRENT');
    const anchored=verifyEvidence(rollback,f.keys.publicKey,{receipt,witness:checkpoint}); assert.ok(anchored.failures.some(x=>x.code==='ROLLBACK_BELOW_WITNESS'));
    await f.db.ledgerEvent.create({data:lastEvent}); await f.db.checkpoint.create({data:lastCp});
    const clean=await call('cleanAudit','/audits',{method:'POST',body:{}}); assert.equal(clean.status,'VALID');
    timings.sort((a,b)=>a-b);
    return { synthetic:true, publicKey:f.keys.publicKey, receipt, correctedReceipt, current, historical, corrected, tampered:{evidence:tamperedEvidence,verification:tamperedVerification}, displayCheck, rollback:{evidence:rollback,unanchored,anchored,witness:checkpoint}, captures, html, summary:{journeys:6,sqlTamper:finding,forgedApproval:'REJECTED',firstApprovalApplied:false,secondApprovalApplied:true,original:'VALID_HISTORICAL',corrected:'VALID_CURRENT',qrDecoded:true,rollbackWithWitness:'INVALID',rollbackWithoutWitness:'VALID_CURRENT',finalAudit:'VALID',disposableSchema:f.schema,httpRequests:timings.length,medianHttpMs:Number(timings[Math.floor(timings.length/2)].toFixed(2)),maxHttpMs:Number(timings.at(-1).toFixed(2))} };
  } finally {await new Promise(r=>server.close(r));await f.dispose();}
}
