import { readFileSync } from 'node:fs';
import { digest, signValue } from '../src/crypto.js';
const [proposalFile, privateKeyFile] = process.argv.slice(2);
if (!proposalFile || !privateKeyFile) throw new Error('Usage: node scripts/sign-proposal.js proposal.json own-private.pem');
const proposal = JSON.parse(readFileSync(proposalFile, 'utf8'));
const body = proposal.body || proposal;
const proposalDigest = digest('proposal', body);
if (proposal.digest && proposal.digest !== proposalDigest) throw new Error('Proposal digest mismatch; do not sign');
// Output contains a public signature, never private key material. Review proposal file before running.
console.log(JSON.stringify({ signature: signValue('approval', { proposalDigest }, readFileSync(privateKeyFile, 'utf8')) }));
