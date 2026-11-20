import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { keyId } from './crypto.js';
export function loadKeys() {
  const dir = process.env.KEY_DIRECTORY || '.local/keys';
  const privateKey = readFileSync(join(dir, 'institution.private.pem'), 'utf8');
  const publicKey = readFileSync(join(dir, 'institution.public.pem'), 'utf8');
  if (keyId(privateKey) !== keyId(publicKey)) throw new Error('Institution key mismatch');
  const registry = JSON.parse(readFileSync(join(dir, 'approvers.json'), 'utf8'));
  return { privateKey, publicKey, signer: keyId(publicKey), registry };
}
export const loadWitness = () => process.env.WITNESS_FILE ? JSON.parse(readFileSync(process.env.WITNESS_FILE, 'utf8')) : undefined;
