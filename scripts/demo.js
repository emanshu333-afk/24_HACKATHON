import { readFileSync, writeFileSync } from 'node:fs';
import { verifyEvidence } from '../src/crypto.js';
const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Demo credentials may only be sent to the local API');
const credentials = JSON.parse(readFileSync('.local/demo-credentials.json', 'utf8'));
async function call(path, { token, body, html = false } = {}) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`HTTP ${response.status} at ${path.split('?')[0]}`);
  return html ? response.text() : response.json();
}
const health = await call('/health');
const { token } = await call('/auth/login', { body: { email: 'admin@verimark.test', password: credentials['admin@verimark.test'] } });
const student = (await call('/students', { token })).find(s => s.code === 'UNI2026001');
const exam = (await call('/exams', { token })).find(e => e.code === 'CS-SEM1-2026');
let result = (await call('/results', { token })).find(r => r.studentId === student.id && r.examId === exam.id);
if (!result) {
  const published = await call('/results', { token, body: { studentId: student.id, examId: exam.id, marks: [{ subject: 'CS101', score: 86, max: 100 }, { subject: 'MA101', score: 79, max: 100 }, { subject: 'PH101', score: 83, max: 100 }] } });
  result = { id: published.resultId, currentVersion: published.version };
}
const { receipt, verificationUrl } = await call(`/results/${result.id}/receipt/${result.currentVersion}`, { token });
const response = await call(new URL(verificationUrl).pathname + new URL(verificationUrl).search);
const trustedKey = readFileSync(`${process.env.KEY_DIRECTORY || '.local/keys'}/institution.public.pem`, 'utf8');
const verification = verifyEvidence(response.evidence, trustedKey, { receipt });
if (!verification.status.startsWith('VALID_')) throw new Error('Independent demo verification failed');
writeFileSync('.local/demo-evidence.json', JSON.stringify(response, null, 2));
writeFileSync('.local/demo-receipt.json', JSON.stringify(receipt, null, 2));
writeFileSync('.local/demo-marksheet.html', await call(`/results/${result.id}/marksheet/${result.currentVersion}`, { token, html: true }));
console.log(JSON.stringify({ health: health.status, resultId: result.id, verification: verification.status, evidenceFile: '.local/demo-evidence.json', receiptFile: '.local/demo-receipt.json', marksheetFile: '.local/demo-marksheet.html' }, null, 2));
