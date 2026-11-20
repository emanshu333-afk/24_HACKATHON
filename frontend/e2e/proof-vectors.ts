import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { ResultReceipt, VerificationResponse } from '../src/services/wire'

export type Vectors = {
  publicKey: string; receipt: ResultReceipt; correctedReceipt: ResultReceipt;
  current: VerificationResponse; historical: VerificationResponse; corrected: VerificationResponse; tampered: VerificationResponse;
}
export function readVectors(): Vectors | undefined {
  const path = process.env.VERIMARK_PROOF_VECTORS
  if (path) return JSON.parse(readFileSync(path, 'utf8')) as Vectors
  try {
    return JSON.parse(execFileSync('git', ['show', '21e766c:fixtures/proof-vectors.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) as Vectors
  } catch { return undefined }
}
