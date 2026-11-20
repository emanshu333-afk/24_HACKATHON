export type Mark = { subject: string; scored: number; maximum: number }
export type Exam = { id: string; name: string; term: string }
export type Student = { id: string; name: string; programme: string }
export type Result = { ref: string; student: Student; exam: Exam; marks: Mark[]; date: string; version: number; current: boolean }
export type Correction = { id: string; ref: string; subject: string; original: number; proposed: number; reason: string; state: 'pending' | 'approved' | 'rejected'; reviewSteps: 0 | 1 | 2 }
export type ProofCheck = { label: string; state: 'passed' | 'failed' | 'unavailable'; detail: string }
export type Verification = {
  status: 'current' | 'historical' | 'invalid' | 'unavailable'; checks: ProofCheck[];
  reason: string; version?: number; marks?: Mark[]; exam?: string; resultId?: string; checkedAt?: string; failures?: string[];
}
export const totals = (marks: Mark[]) => marks.reduce((acc, m) => ({ scored: acc.scored + m.scored, maximum: acc.maximum + m.maximum }), { scored: 0, maximum: 0 })
export const percent = (marks: Mark[]) => { const { scored, maximum } = totals(marks); return maximum ? Math.round(1000 * scored / maximum) / 10 : 0 }
export const grade = (marks: Mark[]) => { const p = percent(marks); return p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F' }
export const referencePattern = /^[A-Za-z0-9_-]{6,80}$/
export const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
