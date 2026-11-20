import express from 'express';
import QRCode from 'qrcode';
import { ZodError, z } from 'zod';
import { auth, checkPassword, tokenFor, hashPassword } from './auth.js';
import { loginSchema, approvalSchema } from './validation.js';
import { Problem } from './service.js';
import { verifyValue } from './crypto.js';

const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const encodeReceipt = receipt => Buffer.from(JSON.stringify(receipt)).toString('base64url');
export function decodeReceipt(value) {
  if (typeof value !== 'string' || value.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Problem('INVALID_RECEIPT_ENCODING', 400);
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { throw new Problem('INVALID_RECEIPT_ENCODING', 400); }
}
export function createApp(db, service, { jwtSecret, publicBaseUrl = 'http://localhost:3000', frontendOrigin = 'http://localhost:5173' }) {
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 random characters');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'" });
    if (req.headers.origin === frontendOrigin) res.set({ 'Access-Control-Allow-Origin': frontendOrigin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  const access = (...roles) => auth(db, jwtSecret, roles);
  const staff = access('ADMIN', 'AUDITOR', 'APPROVER');
  const readers = access('ADMIN', 'AUDITOR', 'APPROVER', 'STUDENT');
  async function ownResult(req) {
    const id = z.uuid().parse(req.params.id);
    const result = await db.result.findUnique({ where: { id } });
    if (!result) throw new Problem('RESULT_NOT_FOUND', 404);
    if (req.user.role === 'STUDENT' && result.studentId !== req.user.student?.id) throw new Problem('FORBIDDEN', 403);
    return result;
  }
  const attempts = new Map();
  const dummyPasswordHash = hashPassword('not-an-account-password');
  app.get('/health', async (req, res) => { await db.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); });
  app.post('/auth/login', async (req, res) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const attempt = attempts.get(req.ip) || { count: 0, until: now + 60000 };
    if (++attempt.count > 20) throw new Problem('RATE_LIMITED', 429);
    attempts.set(req.ip, attempt);
    const input = loginSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    const passwordMatches = checkPassword(input.password, user?.passwordHash || dummyPasswordHash);
    if (!user || !passwordMatches) throw new Problem('INVALID_CREDENTIALS', 401);
    res.json({ token: tokenFor(user, jwtSecret), expiresIn: 3600, user: { id: user.id, role: user.role, email: user.email } });
  });
  app.get('/me', readers, (req, res) => res.json({ id: req.user.id, email: req.user.email, role: req.user.role, studentId: req.user.student?.id ?? null }));
  app.get('/students', staff, async (req, res) => res.json(await db.student.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } })));
  app.get('/exams', readers, async (req, res) => res.json(await db.exam.findMany({ orderBy: { code: 'asc' } })));
  app.post('/results', access('ADMIN'), async (req, res) => res.status(201).json(await service.publish(req.body)));
  app.get('/results', readers, async (req, res) => res.json(await db.result.findMany({ where: req.user.role === 'STUDENT' ? { studentId: req.user.student?.id || 'none' } : {}, include: { exam: true } })));
  app.get('/results/:id', readers, async (req, res) => res.json(await ownResult(req)));
  app.get('/results/:id/history', readers, async (req, res) => {
    await ownResult(req);
    res.json(await db.resultVersion.findMany({ where: { resultId: req.params.id }, orderBy: { version: 'asc' }, include: { event: true } }));
  });
  app.get('/results/:id/receipt/:version', readers, async (req, res) => {
    await ownResult(req);
    const version = z.coerce.number().int().positive().parse(req.params.version);
    const receipt = await service.getReceipt(req.params.id, version);
    res.json({ receipt, verificationUrl: `${publicBaseUrl}/verify?receipt=${encodeReceipt(receipt)}` });
  });
  app.get('/results/:id/marksheet/:version', readers, async (req, res) => {
    await ownResult(req);
    const version = z.coerce.number().int().positive().parse(req.params.version);
    const receipt = await service.getReceipt(req.params.id, version);
    const proof = await service.verify(receipt);
    if (!['VALID_CURRENT', 'VALID_HISTORICAL'].includes(proof.verification.status)) throw new Problem('LEDGER_INTEGRITY_FAILURE');
    const data = proof.verification.result;
    const url = `${publicBaseUrl}/verify?receipt=${encodeReceipt(receipt)}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 480 });
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>VeriMark marksheet</title><style>body{font:16px sans-serif;margin:3rem}td,th{padding:8px;border:1px solid #bbb}table{border-collapse:collapse}img{width:320px}</style></head><body><h1>VeriMark — published result</h1><p>Result ${escape(data.resultId)}, version ${data.version}</p><p>Exam ${escape(data.examId)}</p><table><tr><th>Subject</th><th>Score</th><th>Maximum</th></tr>${data.marks.map(m => `<tr><td>${escape(m.subject)}</td><td>${m.score}</td><td>${m.max}</td></tr>`).join('')}</table><p>${escape(proof.verification.status)} as of ${escape(proof.verification.currentAsOf)}</p><img alt="Scan to obtain signed verification evidence" src="${qr}"><p>Scan to obtain evidence. Verify with the independently pinned institution key.</p></body></html>`);
  });
  async function publicVerification(req, res, receipt) {
    if (!receipt?.body || !verifyValue('receipt', receipt.body, receipt.signature, service.keys.publicKey)) return res.status(400).json({ verification: { status: 'INVALID', failures: [{ code: 'FORGED_RECEIPT' }] } });
    res.json(await service.verify(receipt));
  }
  app.get('/verify', (req, res) => publicVerification(req, res, decodeReceipt(req.query.receipt)));
  app.post('/verify', (req, res) => publicVerification(req, res, req.body?.receipt));
  app.post('/results/:id/corrections', access('ADMIN'), async (req, res) => { await ownResult(req); res.status(201).json(await service.propose(req.params.id, req.body)); });
  app.get('/corrections', staff, async (req, res) => res.json(await db.correctionProposal.findMany({ include: { approvals: true }, orderBy: { id: 'asc' } })));
  app.get('/corrections/:id', staff, async (req, res) => {
    const proposal = await db.correctionProposal.findUnique({ where: { id: z.uuid().parse(req.params.id) }, include: { approvals: true } });
    if (!proposal) throw new Problem('PROPOSAL_NOT_FOUND', 404);
    res.json(proposal);
  });
  app.post('/corrections/:id/approvals', access('APPROVER'), async (req, res) => res.json(await service.approve(z.uuid().parse(req.params.id), req.user.id, approvalSchema.parse(req.body).signature)));
  app.get('/checkpoints/latest', async (req, res) => {
    const cp = await db.checkpoint.findFirst({ orderBy: { sequence: 'desc' } });
    if (!cp) throw new Problem('NO_CHECKPOINT', 404);
    res.json({ body: cp.body, signature: cp.signature });
  });
  app.post('/audits', access('ADMIN', 'AUDITOR'), async (req, res) => res.json(await service.audit()));
  app.get('/ledger/events', staff, async (req, res) => {
    const query = z.object({ after: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict().parse(req.query);
    const rows = await db.ledgerEvent.findMany({ where: { sequence: { gt: query.after } }, orderBy: { sequence: 'asc' }, take: query.limit });
    res.json({ events: rows.map(({ body, hash, signature }) => ({ body, hash, signature })), nextAfter: rows.length === query.limit ? rows.at(-1).sequence : null });
  });
  app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use((error, req, res, next) => {
    if (error instanceof ZodError) return res.status(400).json({ error: 'VALIDATION_FAILED', issues: error.issues.map(i => ({ path: i.path, message: i.message })) });
    if (error instanceof Problem) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2003') return res.status(400).json({ error: 'UNKNOWN_REFERENCE' });
    if (error.code === 'P2002') return res.status(409).json({ error: 'CONFLICT' });
    if (['P1001', 'P1002', 'P1017', 'P2024'].includes(error.code) || error.constructor.name === 'PrismaClientInitializationError') return res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'BODY_TOO_LARGE' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON' });
    // Do not log request bodies, bearer tokens, database URLs or Prisma errors containing queries.
    console.error('Request failed:', error.constructor.name);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });
  return app;
}
