import { randomUUID } from 'node:crypto';
import { canonical, digest, signed, signValue, verifyValue, verifyEvidence, checkApprovals, FORMAT, ZERO } from './crypto.js';
import { normalizedMarks, proposalSchema, publishSchema } from './validation.js';

export class Problem extends Error {
  constructor(code, status = 409) { super(code); this.status = status; }
}
export class LedgerService {
  constructor(db, keys, witness) { this.db = db; this.keys = keys; this.witness = witness; }
  async locked(fn) {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(78421309)`;
      return fn(tx);
    }, { timeout: 30000, maxWait: 30000 });
  }
  async evidence(db = this.db) {
    const events = await db.ledgerEvent.findMany({ orderBy: { sequence: 'asc' } });
    const cp = await db.checkpoint.findFirst({ orderBy: { sequence: 'desc' } });
    return { events: events.map(e => ({ body: e.body, hash: e.hash, signature: e.signature })), checkpoint: cp ? { body: cp.body, signature: cp.signature } : null };
  }
  async append(tx, result, data, correction = null) {
    const existing = await this.evidence(tx);
    if (existing.events.length || existing.checkpoint || this.witness) {
      const checked = verifyEvidence(existing, this.keys.publicKey, { witness: this.witness });
      if (checked.status !== 'VALID_CURRENT') throw new Problem('LEDGER_INTEGRITY_FAILURE');
    }
    const commitment = digest('result', data);
    const version = await tx.resultVersion.create({ data: { resultId: result.id, version: data.version, data, commitment } });
    const sequence = existing.events.length + 1;
    const body = { format: FORMAT, id: randomUUID(), sequence, type: correction ? 'CORRECT' : 'PUBLISH', resultId: result.id, version: data.version, data, commitment, previousHash: existing.events.at(-1)?.hash || ZERO, signer: this.keys.signer, issuedAt: new Date().toISOString(), correction };
    const hash = digest('event', body);
    const event = { body, hash, signature: signValue('event-signature', { hash }, this.keys.privateKey) };
    const checkpoint = signed('checkpoint', { format: FORMAT, sequence, headHash: hash, signer: this.keys.signer, issuedAt: body.issuedAt }, this.keys.privateKey);
    if (verifyEvidence({ events: [...existing.events, event], checkpoint }, this.keys.publicKey, { witness: this.witness }).status !== 'VALID_CURRENT') throw new Problem('PROPOSED_EVENT_INVALID');
    await tx.ledgerEvent.create({ data: { id: body.id, sequence, versionId: version.id, ...event } });
    await tx.checkpoint.create({ data: { sequence, ...checkpoint } });
    return { resultId: result.id, version: data.version, receipt: this.receipt(event), checkpoint };
  }
  receipt(event) {
    return signed('receipt', { format: FORMAT, resultId: event.body.resultId, version: event.body.version, commitment: event.body.commitment, eventHash: event.hash, signer: this.keys.signer }, this.keys.privateKey);
  }
  async publish(input) {
    const parsed = publishSchema.parse(input);
    return this.locked(async tx => {
      if (await tx.result.findUnique({ where: { studentId_examId: { studentId: parsed.studentId, examId: parsed.examId } } })) throw new Problem('ALREADY_PUBLISHED');
      const marks = normalizedMarks(parsed.marks);
      const result = await tx.result.create({ data: { studentId: parsed.studentId, examId: parsed.examId, currentVersion: 1, marks } });
      return this.append(tx, result, { format: FORMAT, resultId: result.id, studentId: result.studentId, examId: result.examId, version: 1, marks });
    });
  }
  async propose(resultId, input) {
    const parsed = proposalSchema.parse(input);
    return this.locked(async tx => {
      const result = await tx.result.findUnique({ where: { id: resultId } });
      if (!result) throw new Problem('RESULT_NOT_FOUND', 404);
      if (result.currentVersion !== parsed.baseVersion) throw new Problem('STALE_BASE_VERSION');
      const body = { format: FORMAT, id: randomUUID(), resultId, baseVersion: parsed.baseVersion, marks: normalizedMarks(parsed.marks), reason: parsed.reason, createdAt: new Date().toISOString() };
      return tx.correctionProposal.create({ data: { id: body.id, resultId, baseVersion: body.baseVersion, body, digest: digest('proposal', body) } });
    });
  }
  async approve(id, userId, signature) {
    return this.locked(async tx => {
      const p = await tx.correctionProposal.findUnique({ where: { id }, include: { approvals: true } });
      if (!p) throw new Problem('PROPOSAL_NOT_FOUND', 404);
      if (p.applied) throw new Problem('ALREADY_APPLIED');
      try {
        if (!p.body || p.digest !== digest('proposal', p.body) || p.body.id !== p.id || p.body.resultId !== p.resultId || p.body.baseVersion !== p.baseVersion) throw new Error();
      } catch { throw new Problem('PROPOSAL_TAMPERED'); }
      const result = await tx.result.findUnique({ where: { id: p.resultId } });
      if (result.currentVersion !== p.baseVersion) throw new Problem('STALE_BASE_VERSION');
      const user = await tx.user.findUnique({ where: { id: userId } });
      const certificate = this.keys.registry[userId];
      if (!user || user.role !== 'APPROVER' || !certificate || certificate.body.publicKey !== user.publicKey) throw new Problem('UNREGISTERED_APPROVER', 403);
      if (p.approvals.some(a => a.userId === userId)) throw new Problem('DUPLICATE_APPROVER');
      if (!verifyValue('approval', { proposalDigest: p.digest }, signature, certificate.body.publicKey)) throw new Problem('INVALID_APPROVAL', 400);
      await tx.approval.create({ data: { proposalId: id, userId, signature } });
      const approvals = [...p.approvals, { userId, signature }].map(a => ({ certificate: this.keys.registry[a.userId], signature: a.signature }));
      if (approvals.length < 2) return { proposalId: id, approvalCount: approvals.length, applied: false };
      const correction = { proposal: p.body, approvals };
      try { checkApprovals(correction, this.keys.publicKey); } catch (error) { throw new Problem(['DUPLICATE_APPROVER', 'TWO_APPROVALS_REQUIRED'].includes(error.message) ? error.message : 'INVALID_APPROVAL', 409); }
      const prior = await tx.resultVersion.findUnique({ where: { resultId_version: { resultId: result.id, version: p.baseVersion } } });
      if (!prior || prior.commitment !== digest('result', prior.data)) throw new Problem('RESULT_INTEGRITY_FAILURE');
      const data = { ...prior.data, version: p.baseVersion + 1, marks: normalizedMarks(p.body.marks) };
      const appended = await this.append(tx, result, data, correction);
      await tx.result.update({ where: { id: result.id }, data: { currentVersion: data.version, marks: data.marks } });
      await tx.correctionProposal.update({ where: { id }, data: { applied: true } });
      return { ...appended, proposalId: id, approvalCount: 2, applied: true };
    });
  }
  async verify(receipt) {
    return this.db.$transaction(async tx => {
      const evidence = await this.evidence(tx);
      return { verification: verifyEvidence(evidence, this.keys.publicKey, { witness: this.witness, receipt }), evidence };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async getReceipt(resultId, version) {
    const row = await this.db.resultVersion.findUnique({ where: { resultId_version: { resultId, version } }, include: { event: true } });
    if (!row?.event) throw new Problem('VERSION_NOT_FOUND', 404);
    if (row.event.body?.resultId !== resultId || row.event.body?.version !== version) throw new Problem('RESULT_INTEGRITY_FAILURE');
    // Never mint a fresh authentic receipt for a database-forged event.
    const proof = await this.verify();
    if (proof.verification.status !== 'VALID_CURRENT' || !proof.evidence.events.some(e => canonical(e) === canonical({ body: row.event.body, hash: row.event.hash, signature: row.event.signature }))) throw new Problem('LEDGER_INTEGRITY_FAILURE');
    return this.receipt(row.event);
  }
  async audit() {
    return this.db.$transaction(async tx => {
      const evidence = await this.evidence(tx);
      const verification = verifyEvidence(evidence, this.keys.publicKey, { witness: this.witness });
      const findings = [...verification.failures];
      const safeDigest = (domain, value) => { try { return digest(domain, value); } catch { return null; } };
      const same = (a, b) => { try { return canonical(a) === canonical(b); } catch { return false; } };
      const events = await tx.ledgerEvent.findMany({ include: { version: true }, orderBy: { sequence: 'asc' } });
      const latest = new Map();
      const compare = (expected, actual, path, detail) => {
        try { if (canonical(expected) === canonical(actual)) return; } catch { /* Noncanonical DB data is a mismatch, not a server error. */ }
        if (expected && actual && typeof expected === 'object' && typeof actual === 'object' && Array.isArray(expected) === Array.isArray(actual)) {
          for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
            if (!Object.hasOwn(expected, k) || !Object.hasOwn(actual, k)) findings.push({ code: 'DATABASE_FIELD_MISMATCH', ...detail, field: `${path}.${k}`, expected: expected[k] ?? null, actual: actual[k] ?? null, expectedPresent: Object.hasOwn(expected, k), actualPresent: Object.hasOwn(actual, k) });
            else compare(expected[k], actual[k], `${path}.${k}`, detail);
          }
        } else findings.push({ code: 'DATABASE_FIELD_MISMATCH', ...detail, field: path, expected, actual });
      };
      for (const e of events) {
        const b = e.body;
        if (!b || typeof b !== 'object' || !b.data || typeof b.data !== 'object') { findings.push({ code: 'MALFORMED_EVENT', eventId: e.id, sequence: e.sequence }); continue; }
        const detail = { resultId: b.resultId, version: b.version, eventId: e.id };
        // Only use authenticated event data as an expected published value.
        if (safeDigest('event', b) !== e.hash || !verifyValue('event-signature', { hash: e.hash }, e.signature, this.keys.publicKey)) continue;
        compare(b.id, e.id, 'event.id', detail);
        compare(b.sequence, e.sequence, 'event.sequence', detail);
        compare(b.data, e.version.data, 'version.data', detail);
        compare(b.commitment, e.version.commitment, 'version.commitment', detail);
        compare(b.resultId, e.version.resultId, 'version.resultId', detail);
        compare(b.version, e.version.version, 'version.version', detail);
        latest.set(b.resultId, b);
      }
      const results = await tx.result.findMany();
      for (const r of results) {
        const b = latest.get(r.id);
        if (!b) { findings.push({ code: 'UNCOMMITTED_RESULT', resultId: r.id }); continue; }
        for (const field of ['marks', 'studentId', 'examId']) compare(b.data[field], r[field], `result.${field}`, { resultId: r.id, version: b.version });
        compare(b.version, r.currentVersion, 'result.currentVersion', { resultId: r.id });
      }
      for (const v of await tx.resultVersion.findMany({ where: { event: null } })) findings.push({ code: 'UNCOMMITTED_VERSION', resultId: v.resultId, version: v.version });
      for (const cp of await tx.checkpoint.findMany()) {
        if (!cp.body || cp.sequence !== cp.body.sequence || !verifyValue('checkpoint', cp.body, cp.signature, this.keys.publicKey) || evidence.events[cp.sequence - 1]?.hash !== cp.body.headHash) findings.push({ code: 'STORED_CHECKPOINT_MISMATCH', sequence: cp.sequence });
      }
      const proposals = await tx.correctionProposal.findMany({ include: { approvals: true } });
      for (const event of evidence.events) {
        const id = event.body?.correction?.proposal?.id;
        if (id && !proposals.some(p => p.id === id)) findings.push({ code: 'MISSING_CORRECTION_RECORD', proposalId: id, eventId: event.body.id, resultId: event.body.resultId });
      }
      for (const p of proposals) {
        if (!p.body || safeDigest('proposal', p.body) !== p.digest || p.body.id !== p.id || p.body.resultId !== p.resultId || p.body.baseVersion !== p.baseVersion) findings.push({ code: 'PROPOSAL_TAMPERED', proposalId: p.id });
        for (const a of p.approvals) {
          const cert = this.keys.registry[a.userId];
          if (!cert || !verifyValue('approval', { proposalDigest: p.digest }, a.signature, cert.body.publicKey)) findings.push({ code: 'INVALID_STORED_APPROVAL', proposalId: p.id, userId: a.userId });
        }
        const appliedEvent = evidence.events.find(e => e.body?.correction?.proposal?.id === p.id);
        if (p.applied !== Boolean(appliedEvent) || (appliedEvent && (!same(appliedEvent.body.correction.proposal, p.body) || p.approvals.length !== 2))) findings.push({ code: 'CORRECTION_STATE_MISMATCH', proposalId: p.id });
      }
      return { status: findings.length ? 'INVALID' : 'VALID', findings, freshness: verification.freshness, checkpointSequence: verification.checkpointSequence };
    }, { isolationLevel: 'RepeatableRead', timeout: 30000 });
  }
}
