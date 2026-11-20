import { demoReference, results } from './demo'
import type { Verification } from './model'
import { apiBaseUrl } from './http'

import { sampleBase } from './sample'

export const mockMode = Boolean(sampleBase) || (import.meta.env.VITE_MOCK_MODE ?? 'true') === 'true'
export { apiBaseUrl }

export function demoVerification(ref: string): Verification {
  const result = results.find(entry => entry.ref === ref)
  return {
    status: 'unavailable',
    version: result?.version,
    exam: result?.exam.name,
    marks: result?.marks,
    reason: result
      ? 'This synthetic record has no signed receipt. Its marks and version are examples only.'
      : 'No matching record in the demo dataset. Try the sample reference.',
    checks: unavailableChecks('No signed demo evidence'),
  }
}

function unavailableChecks(detail: string) {
  return ['Result commitment', 'Digital signature', 'Ledger evidence', 'Trusted checkpoint', 'Version status']
    .map(label => ({ label, state: 'unavailable' as const, detail }))
}

export async function verifyReference(ref: string, signal: AbortSignal): Promise<Verification> {
  signal.throwIfAborted()
  if (mockMode) return demoVerification(ref)
  const reason = apiBaseUrl ? 'Live verification requires a signed receipt from a marksheet.' : 'No live verification service is configured.'
  return { status: 'unavailable', reason, checks: unavailableChecks('Evidence unavailable') }
}

export { demoReference }
