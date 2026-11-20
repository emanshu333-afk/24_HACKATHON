import { z } from 'zod'
import { api } from '../http'
import type { ProofCheck, Verification } from '../model'
import type { ResultReceipt, VerificationResponse } from '../wire'
import { compareDisplayedResult, keyId, verifyEvidence, verifyValue } from './browser-verifier.js'

const hex = z.string().regex(/^[a-f0-9]{64}$/)
const receiptSchema = z.strictObject({
  body: z.strictObject({ format: z.literal('verimark-v1'), resultId: z.uuid(), version: z.number().int().positive(), commitment: hex, eventHash: hex, signer: hex }),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
})
const resultSchema = z.strictObject({
  format: z.literal('verimark-v1'), resultId: z.uuid(), studentId: z.uuid(), examId: z.uuid(), version: z.number().int().positive(),
  marks: z.array(z.strictObject({ subject: z.string().regex(/^[A-Z0-9_-]{1,32}$/), score: z.number().int().min(0).max(100), max: z.literal(100) })).min(1).max(30),
})
export const receiptPattern = /^[A-Za-z0-9_-]{200,2048}$/
const pinnedKey = (import.meta.env.VITE_INSTITUTION_PUBLIC_KEY ?? '').replace(/\\n/g, '\n').trim()
export function parseReceipt(token: string): ResultReceipt | null {
  if (!receiptPattern.test(token)) return null
  try {
    const bytes = Uint8Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    return receiptSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch { return null }
}
export function receiptLink(receipt: ResultReceipt) {
  const token = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(receiptSchema.parse(receipt)))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `/verify?receipt=${token}`
}
const labels = ['Result commitment', 'Digital signature', 'Ledger evidence', 'Trusted checkpoint', 'Version status']
export function unavailable(reason: string): Verification {
  return { status: 'unavailable', reason, checks: labels.map(label => ({ label, state: 'unavailable', detail: 'Not established' })) }
}
function invalid(reason: string, failures: string[]): Verification {
  return { ...unavailable(reason), status: 'invalid', failures }
}

export async function evaluateEvidence(response: VerificationResponse, receipt: ResultReceipt, key: string): Promise<Verification> {
  // The original parsed receipt, not response JSON, selects the target event.
  const verified = await verifyEvidence(response?.evidence, key, { receipt })
  const codes = verified.failures.map(f => f.code)
  if (verified.status === 'INCOMPLETE') return { ...unavailable('The evidence or browser cryptography needed for verification is unavailable.'), failures: codes }
  if (verified.status === 'INVALID' || codes.length) return invalid('The signed evidence did not pass independent checks.', codes)
  const displayed = resultSchema.safeParse(response?.verification?.result)
  if (!displayed.success) return unavailable('The service did not provide a valid result to compare with the signed evidence.')
  const comparison = compareDisplayedResult(verified, displayed.data)
  if (comparison.failures.length || !comparison.result) return invalid('The displayed result does not match the authenticated ledger record.', comparison.failures.map(f => f.code))
  if (response.verification.status !== verified.status || !Array.isArray(response.verification.failures) || response.verification.failures.length) {
    return unavailable('The service and browser did not agree on the verification outcome. No authenticity decision is shown.')
  }
  const checks: ProofCheck[] = labels.map((label, i) => ({ label, state: 'passed', detail: ['SHA-256 matches the result', 'Ed25519 signatures checked in this browser', 'Receipt and full hash chain match', `Signed checkpoint #${verified.checkpointSequence}`, `Latest signed version: ${verified.latestVersion}`][i] }))
  return {
    status: comparison.status === 'VALID_HISTORICAL' ? 'historical' : 'current',
    reason: 'Verified against the offered signed checkpoint. No independent freshness witness is configured.',
    version: displayed.data.version, resultId: displayed.data.resultId, checkedAt: verified.currentAsOf, checks,
    marks: displayed.data.marks.map(mark => ({ subject: mark.subject, scored: mark.score, maximum: mark.max })),
  }
}

export async function verifyReceipt(token: string, signal: AbortSignal): Promise<Verification> {
  const receipt = parseReceipt(token)
  if (!receipt) return unavailable('This is not a readable VeriMark v1 receipt.')
  if (!pinnedKey) return unavailable('No independently trusted institution key is configured.')
  let signer: string
  try { signer = await keyId(pinnedKey) } catch { return unavailable('The configured institution key or browser Ed25519 support is unavailable.') }
  if (receipt.body.signer !== signer) return unavailable('This receipt names an institution key that is not trusted by this deployment.')
  if (!await verifyValue('receipt', receipt.body, receipt.signature, pinnedKey)) return invalid('The receipt’s signature failed independent verification.', ['FORGED_RECEIPT'])
  if (signal.aborted) signal.throwIfAborted()
  return evaluateEvidence(await api.verify(token, signal), receipt, pinnedKey)
}
