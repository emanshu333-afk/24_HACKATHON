import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/auth.js';
import { signed, keyId, FORMAT } from '../src/crypto.js';
const db = new PrismaClient();
try {
  if (process.env.NODE_ENV === 'production') throw new Error('Synthetic seed prohibited in production');
  const keys = process.env.KEY_DIRECTORY || '.local/keys';
  const privateKey = readFileSync(`${keys}/institution.private.pem`, 'utf8');
  const accounts = [ ['admin','ADMIN'], ['approver-a','APPROVER'], ['approver-b','APPROVER'], ['auditor','AUDITOR'], ['student','STUDENT'] ];
  const registry = existsSync(`${keys}/approvers.json`) ? JSON.parse(readFileSync(`${keys}/approvers.json`, 'utf8')) : {};
  const credentials = existsSync('.local/demo-credentials.json') ? JSON.parse(readFileSync('.local/demo-credentials.json', 'utf8')) : {};
  for (const [name, role] of accounts) {
    const email = `${name}@verimark.test`;
    const publicKey = role === 'APPROVER' ? readFileSync(`${keys}/${name}.public.pem`, 'utf8') : null;
    const password = credentials[email] || randomBytes(20).toString('base64url');
    credentials[email] = password;
    const user = await db.user.upsert({ where: { email }, update: {}, create: { email, role, passwordHash: hashPassword(password), publicKey } });
    if (role === 'APPROVER') {
      if (user.publicKey !== publicKey) throw new Error('Registered approver key differs; refusing silent rotation');
      registry[user.id] = signed('approver-certificate', { format: FORMAT, userId: user.id, role, keyId: keyId(publicKey), publicKey }, privateKey);
    }
    if (role === 'STUDENT') await db.student.upsert({ where: { code: 'UNI2026001' }, update: {}, create: { code: 'UNI2026001', name: 'Avery Example', userId: user.id } });
  }
  await db.exam.upsert({ where: { code: 'CS-SEM1-2026' }, update: {}, create: { code: 'CS-SEM1-2026', title: 'Computer Science — Semester 1, 2026' } });
  writeFileSync(`${keys}/approvers.json`, JSON.stringify(registry, null, 2), { mode: 0o600 });
  writeFileSync('.local/demo-credentials.json', JSON.stringify(credentials, null, 2), { mode: 0o600 });
  console.log('Synthetic users, student, exam and signed approver registry seeded. Credentials saved to ignored .local/demo-credentials.json.');
} finally { await db.$disconnect(); }
