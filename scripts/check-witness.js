import { readFileSync } from 'node:fs';
import { verifyValue, keyId, FORMAT } from '../src/crypto.js';
const [checkpointFile, trustedKeyFile, minimum = '1'] = process.argv.slice(2);
if (!checkpointFile || !trustedKeyFile) throw new Error('Usage: node scripts/check-witness.js obtained-checkpoint.json TRUSTED-public.pem [minimum-sequence]');
const cp = JSON.parse(readFileSync(checkpointFile,'utf8')), key = readFileSync(trustedKeyFile,'utf8');
if (!Number.isSafeInteger(Number(minimum)) || Number(minimum)<1 || !verifyValue('checkpoint',cp.body,cp.signature,key) || cp.body.format!==FORMAT || cp.body.signer!==keyId(key) || !Number.isSafeInteger(cp.body.sequence) || cp.body.sequence<Number(minimum) || !/^[0-9a-f]{64}$/.test(cp.body.headHash)) throw new Error('Invalid or stale checkpoint');
console.log(JSON.stringify({signatureValid:true,sequence:cp.body.sequence,headHash:cp.body.headHash,note:'Signature authenticity only. Compare against ledger proof and independently retained minimum sequence.'}));
