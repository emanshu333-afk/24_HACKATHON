import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { loadKeys } from '../src/config.js';
import { LedgerService } from '../src/service.js';
const url = new URL(process.env.DATABASE_URL);
if (process.env.LOCAL_ATTACK_TESTS !== '1' || url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/verimark') throw new Error('Attack demo restricted to isolated local development database');
const db = new PrismaClient();
const service = new LedgerService(db, loadKeys());
let result;
try {
  const student = await db.student.create({ data: { code: `ATTACK-${randomUUID()}`, name: 'Synthetic attack demonstration' } });
  const exam = await db.exam.findFirst();
  if (!exam) throw new Error('Seed the database first');
  const publication = await service.publish({ studentId: student.id, examId: exam.id, marks: [{ subject: 'CS101', score: 75, max: 100 }] });
  result = await db.result.findUnique({ where: { id: publication.resultId } });
  await db.$executeRaw`UPDATE "Result" SET marks = jsonb_set(marks, '{0,score}', '99'::jsonb) WHERE id = ${result.id}`;
  const audit = await service.audit();
  const finding = audit.findings.find(f => f.resultId === result.id && f.field === 'result.marks.0.score');
  if (!finding || finding.expected !== 75 || finding.actual !== 99) throw new Error('Attack was not pinpointed');
  console.log(JSON.stringify({ attack: 'Direct PostgreSQL marks update bypassing API', detected: true, finding }, null, 2));
} finally {
  if (result) await db.result.update({ where: { id: result.id }, data: { marks: result.marks } });
  await db.$disconnect();
}
