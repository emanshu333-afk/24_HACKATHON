import { demoReference, results } from './demo'
import type { Verification } from './model'

export const mockMode = (import.meta.env.VITE_MOCK_MODE ?? 'true') === 'true'
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')

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
  // No endpoint or proof verifier is registered until the backend contract is reviewed.
  const reason = apiBaseUrl ? 'The live proof protocol is not connected in this build.' : 'No live verification service is configured.'
  return { status: 'unavailable', reason, checks: unavailableChecks('Evidence unavailable') }
}

export function readQrReference(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.origin !== window.location.origin || url.pathname !== '/verify') return null
    return url.searchParams.get('ref')
  } catch { return null }
}

export { demoReference }
