import { readFileSync } from 'node:fs';
import { verifyEvidence } from '../src/crypto.js';
const [evidenceFile, trustedKeyFile, receiptFile, witnessFile] = process.argv.slice(2);
if (!evidenceFile || !trustedKeyFile) throw new Error('Usage: node scripts/verify-file.js evidence.json TRUSTED-public.pem [receipt.json] [witness.json]');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const input = json(evidenceFile);
const result = verifyEvidence(input.evidence || input, readFileSync(trustedKeyFile, 'utf8'), { receipt: receiptFile ? json(receiptFile) : undefined, witness: witnessFile ? json(witnessFile) : undefined });
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.status.startsWith('VALID_') ? 0 : 1;
