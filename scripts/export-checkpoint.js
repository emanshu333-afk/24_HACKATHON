import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { loadKeys, loadWitness } from '../src/config.js';
import { LedgerService } from '../src/service.js';
const dest = process.argv[2];
if (!dest) throw new Error('Usage: node --env-file=.env scripts/export-checkpoint.js NEW-output.json');
const db = new PrismaClient();
try {
  const service = new LedgerService(db, loadKeys(), loadWitness());
  const { evidence, verification } = await service.verify();
  if (verification.status !== 'VALID_CURRENT') throw new Error('Refusing export of invalid ledger');
  writeFileSync(dest, JSON.stringify(evidence.checkpoint, null, 2), { flag: 'wx' });
  console.log('Signed checkpoint exported. Publish through an independently controlled channel; local storage alone is not rollback protection.');
} finally { await db.$disconnect(); }
