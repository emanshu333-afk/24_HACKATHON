import type { ApiError, ApprovalRequest, ApprovalResponse, CorrectionDetails, CorrectionHistory, CorrectionProposal, CorrectionRequest, Examination, IntegrityAudit, LedgerPage, LoginRequest, LoginResponse, Me, PublicationResponse, PublishRequest, ReceiptResponse, ResultListItem, Student, VerificationResponse } from './wire'

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}
type Options = { token?: string; method?: 'POST'; body?: object; signal?: AbortSignal }
async function request<T>(path: string, { token, method, body, signal }: Options = {}): Promise<T> {
  if (!apiBaseUrl) throw new HttpError(0, 'API_NOT_CONFIGURED')
  const timeout = AbortSignal.timeout(15000)
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method, credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok || json === null) {
    const code = (json as Partial<ApiError> | null)?.error
    throw new HttpError(response.status, typeof code === 'string' && /^[A-Z0-9_]{1,80}$/.test(code) ? code : `HTTP_${response.status}`)
  }
  return json as T
}

const pathId = encodeURIComponent
export const api = {
  login: (body: LoginRequest, signal?: AbortSignal) => request<LoginResponse>('/auth/login', { method: 'POST', body, signal }),
  me: (token: string, signal?: AbortSignal) => request<Me>('/me', { token, signal }),
  students: (token: string, signal?: AbortSignal) => request<Student[]>('/students', { token, signal }),
  exams: (token: string, signal?: AbortSignal) => request<Examination[]>('/exams', { token, signal }),
  results: (token: string, signal?: AbortSignal) => request<ResultListItem[]>('/results', { token, signal }),
  history: (token: string, id: string, signal?: AbortSignal) => request<CorrectionHistory>(`/results/${pathId(id)}/history`, { token, signal }),
  receipt: (token: string, id: string, version: number, signal?: AbortSignal) => request<ReceiptResponse>(`/results/${pathId(id)}/receipt/${version}`, { token, signal }),
  publish: (token: string, body: PublishRequest) => request<PublicationResponse>('/results', { token, method: 'POST', body }),
  verify: (receipt: string, signal?: AbortSignal) => request<VerificationResponse>(`/verify?${new URLSearchParams({ receipt })}`, { signal }),
  corrections: (token: string, signal?: AbortSignal) => request<CorrectionDetails[]>('/corrections', { token, signal }),
  propose: (token: string, id: string, body: CorrectionRequest) => request<CorrectionProposal>(`/results/${pathId(id)}/corrections`, { token, method: 'POST', body }),
  approve: (token: string, id: string, body: ApprovalRequest) => request<ApprovalResponse>(`/corrections/${pathId(id)}/approvals`, { token, method: 'POST', body }),
  ledger: (token: string, after: number, signal?: AbortSignal) => request<LedgerPage>(`/ledger/events?after=${after}&limit=25`, { token, signal }),
  audit: (token: string) => request<IntegrityAudit>('/audits', { token, method: 'POST' }),
}

export function errorMessage(error: unknown) {
  if (!(error instanceof HttpError)) return 'The service could not be reached or returned unreadable data. Try again.'
  if (error.code === 'API_NOT_CONFIGURED') return 'No live API has been configured.'
  if (error.code === 'INVALID_CREDENTIALS') return 'The email or password was not accepted.'
  if (error.status === 401) return 'Sign in again to continue.'
  if (error.status === 403) return 'This account is not authorized for this operation.'
  if (error.status === 429) return 'Too many requests. Wait a minute and try again.'
  if (error.code === 'STALE_BASE_VERSION') return 'The base version changed. Reload result history and create a new proposal; old signatures cannot be reused.'
  return `The service did not complete the request (${error.code}).`
}
