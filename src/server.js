import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { loadKeys, loadWitness } from './config.js';
import { LedgerService } from './service.js';
const db = new PrismaClient();
await db.$connect();
const app = createApp(db, new LedgerService(db, loadKeys(), loadWitness()), { jwtSecret: process.env.JWT_SECRET, publicBaseUrl: process.env.PUBLIC_BASE_URL, frontendOrigin: process.env.FRONTEND_ORIGIN });
const server = app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('VeriMark API listening on loopback port ' + (process.env.PORT || 3000)));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.$disconnect(); process.exit(0); }));
