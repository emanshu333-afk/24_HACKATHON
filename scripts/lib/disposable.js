import { PrismaClient } from '@prisma/client';
import { randomUUID, generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { signed, keyId, FORMAT } from '../../src/crypto.js';
import { hashPassword } from '../../src/auth.js';
import { LedgerService } from '../../src/service.js';

export async function disposable() {
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/verimark' || process.env.LOCAL_ATTACK_TESTS !== '1') throw new Error('Disposable tests require the isolated local PostgreSQL cluster');
  const schema = `vmtest_${randomUUID().replaceAll('-', '')}`;
  url.searchParams.set('schema', schema);
  const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8' });
  if (migrated.status !== 0) throw new Error('Disposable migration failed (connection details suppressed)');
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const pair = () => {
    const p = generateKeyPairSync('ed25519');
    return { privateKey: p.privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKey: p.publicKey.export({ type: 'spki', format: 'pem' }) };
  };
  const keys = { ...pair(), registry: {} };
  keys.signer = keyId(keys.publicKey);
  const users = {}, passwords = {}, approverKeys = {};
  try {
    for (const role of ['ADMIN','STUDENT','AUDITOR','APPROVER_A','APPROVER_B']) {
      const k = role.startsWith('APPROVER') ? pair() : null;
      passwords[role] = randomBytes(24).toString('hex');
      const user = await db.user.create({ data: { email: `${role.toLowerCase()}@synthetic.test`, role: k ? 'APPROVER' : role, passwordHash: hashPassword(passwords[role]), publicKey: k?.publicKey } });
      users[role] = user;
      if (k) {
        approverKeys[user.id] = k.privateKey;
        keys.registry[user.id] = signed('approver-certificate', { format: FORMAT, userId: user.id, role: 'APPROVER', keyId: keyId(k.publicKey), publicKey: k.publicKey }, keys.privateKey);
      }
    }
    const student = await db.student.create({ data: { code: 'SYNTHETIC-001', name: 'Synthetic Student', userId: users.STUDENT.id } });
    const exam = await db.exam.create({ data: { code: 'SYNTHETIC-CS', title: 'Synthetic University Exam' } });
    return { db, keys, users, passwords, approverKeys, student, exam, schema, service: new LedgerService(db, keys), dispose: async () => { await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); await db.$disconnect(); } };
  } catch (error) { await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); await db.$disconnect(); throw error; }
}
