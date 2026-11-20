import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { loadKeys, loadWitness, runtimeConfig } from './config.js';
import { LedgerService } from './service.js';
const db = new PrismaClient();
try {
  const config = runtimeConfig(), keys = loadKeys(), witness = loadWitness();
  if (witness) {
    const { verifyValue } = await import('./crypto.js');
    if (!verifyValue('checkpoint', witness.body, witness.signature, keys.publicKey) || witness.body.signer !== keys.signer || witness.body.format !== 'verimark-v1' || !Number.isSafeInteger(witness.body.sequence) || witness.body.sequence < 1) throw new Error('Invalid witness');
  }
  await db.$connect();
  const app = createApp(db, new LedgerService(db, keys, witness), config);
  const server = app.listen(config.port, config.host, () => console.log(`VeriMark API listening on ${config.host}:${config.port}`));
  server.on('error', async () => { console.error('Server listen failed (details suppressed)'); await db.$disconnect(); process.exitCode = 1; });
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.$disconnect(); process.exit(0); }));
} catch { console.error('Startup failed: check environment, database, keys and witness (secrets suppressed)'); await db.$disconnect(); process.exitCode = 1; }
