import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { disposable } from '../scripts/lib/disposable.js';
import { signValue } from '../src/crypto.js';
let f, publication;
const marks = [{ subject: 'CS101', score: 75, max: 100 }];
before(async () => { f = await disposable(); publication = await f.service.publish({ studentId: f.student.id, examId: f.exam.id, marks }); });
after(async () => { await f?.dispose(); });
test('audit detects array-to-object shape replacement with identical numeric keys', async () => {
  try {
    await f.db.$executeRaw`UPDATE "Result" SET marks = ${JSON.stringify({ 0: marks[0] })}::jsonb WHERE id = ${publication.resultId}`;
    assert.equal((await f.service.audit()).status, 'INVALID');
  } finally { await f.db.result.update({ where: { id: publication.resultId }, data: { marks } }); }
});
test('audit detects injected null property in committed data', async () => {
  const v = await f.db.resultVersion.findFirst();
  try {
    await f.db.$executeRaw`UPDATE "ResultVersion" SET data = data || '{"injected":null}'::jsonb WHERE id = ${v.id}`;
    assert.ok((await f.service.audit()).findings.some(x => x.field?.startsWith('version.data')));
  } finally { await f.db.resultVersion.update({ where: { id: v.id }, data: { data: v.data } }); }
});
test('audit detects removal of applied proposal and all approval records', async () => {
  const p = await f.service.propose(publication.resultId, { baseVersion: 1, marks: [{ ...marks[0], score: 80 }], reason: 'Recounted omitted answer' });
  for (const user of [f.users.APPROVER_A, f.users.APPROVER_B]) await f.service.approve(p.id, user.id, signValue('approval', { proposalDigest: p.digest }, f.approverKeys[user.id]));
  await f.db.approval.deleteMany({ where: { proposalId: p.id } });
  await f.db.correctionProposal.delete({ where: { id: p.id } });
  assert.ok((await f.service.audit()).findings.some(x => x.code === 'MISSING_CORRECTION_RECORD' && x.proposalId === p.id));
});
