import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { keyId, verifyValue, FORMAT } from './crypto.js';
export function loadKeys() {
  const dir = process.env.KEY_DIRECTORY || '.local/keys';
  const privateKey = readFileSync(join(dir, 'institution.private.pem'), 'utf8');
  const publicKey = readFileSync(join(dir, 'institution.public.pem'), 'utf8');
  if (keyId(privateKey) !== keyId(publicKey)) throw new Error('Institution key mismatch');
  const registry = JSON.parse(readFileSync(join(dir, 'approvers.json'), 'utf8'));
  for (const [id, cert] of Object.entries(registry)) {
    if (!verifyValue('approver-certificate', cert.body, cert.signature, publicKey) || cert.body.userId !== id || cert.body.role !== 'APPROVER' || cert.body.format !== FORMAT || keyId(cert.body.publicKey) !== cert.body.keyId) throw new Error('Invalid approver registry');
  }
  return { privateKey, publicKey, signer: keyId(publicKey), registry };
}
export const loadWitness = () => process.env.WITNESS_FILE ? JSON.parse(readFileSync(process.env.WITNESS_FILE, 'utf8')) : undefined;
export function runtimeConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');
  let database;
  try { database = new URL(env.DATABASE_URL); } catch { throw new Error('Invalid DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('PostgreSQL URL required');
  const origin = value => { try { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error(); return u.origin; } catch { throw new Error('HTTP origin configuration required'); } };
  return { port, host: env.HOST || '127.0.0.1', jwtSecret: env.JWT_SECRET, publicBaseUrl: origin(env.PUBLIC_BASE_URL || 'http://localhost:3000'), frontendOrigin: origin(env.FRONTEND_ORIGIN || 'http://localhost:5173') };
}
