import { apiBaseUrl } from './http'
import { referencePattern } from './model'
import { parseReceipt } from './proof/receipt'

export type VerificationInput = { kind: 'reference' | 'receipt'; value: string }
const maxInput = 4096

function query(params: URLSearchParams, allowReference: boolean): VerificationInput | null {
  // Reject ambiguous inputs; a QR cannot smuggle additional query parameters.
  if (params.size !== 1) return null
  const receipt = params.get('receipt'), ref = params.get('ref')
  if (receipt && parseReceipt(receipt)) return { kind: 'receipt', value: receipt }
  if (allowReference && ref && referencePattern.test(ref)) return { kind: 'reference', value: ref }
  return null
}

export function readVerificationQuery(search: string) {
  return search.length <= maxInput ? query(new URLSearchParams(search), true) : null
}

export function readVerificationInput(raw: string, { demo = false, origin = window.location.origin, apiBase = apiBaseUrl }: { demo?: boolean; origin?: string; apiBase?: string } = {}): VerificationInput | null {
  if (raw.length > maxInput) return null
  const value = raw.trim()
  if (demo && referencePattern.test(value)) return { kind: 'reference', value }
  if (!demo && parseReceipt(value)) return { kind: 'receipt', value }
  if (!/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value)) return null
  try {
    const url = new URL(value)
    if (url.username || url.password || url.hash) return null
    const frontend = url.origin === origin && url.pathname === '/verify'
    const api = apiBase ? new URL(`${apiBase}/verify`, origin) : null
    const backend = api && url.origin === api.origin && url.pathname === api.pathname
    if (!frontend && (demo || !backend)) return null
    const input = query(url.searchParams, demo)
    return input?.kind === (demo ? 'reference' : 'receipt') ? input : null
  } catch { return null }
}
