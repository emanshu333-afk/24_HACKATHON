import { ArrowRight, Printer, ShieldCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Marks } from '../components/marks'
import { Brand, Chip, DataTable, Empty, Heading, Loading, Notice, Panel } from '../components/ui'
import { api, errorMessage } from '../services/http'
import { receiptLink, verifyReceipt } from '../services/proof/receipt'
import { useLive, useSession } from '../services/session'
import type { Marks as WireMarks } from '../services/wire'
import { RequireAccount, SignOut } from './LiveAccount'

const allRoles = ['STUDENT', 'ADMIN', 'APPROVER', 'AUDITOR'] as const
export const displayMarks = (marks: WireMarks) => marks.map(m => ({ subject: m.subject, scored: m.score, maximum: m.max }))
export function LiveError({ failure, reload }: { failure: unknown; reload?: () => void }) {
  return <Notice error>{errorMessage(failure)} {reload && <button className="btn secondary compact" onClick={reload}>Retry</button>}</Notice>
}
export function LiveDirectory({ students = false }: { students?: boolean }) {
  if (students) return <LiveStudents />
  return <LiveExams />
}
function LiveStudents() {
  const state = useLive(api.students)
  return <><Heading eyebrow="REGISTRAR" title="Students" detail="Institution roster." />{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading students…</Loading> : <DataTable label="Students" rows={state.value} rowKey={s => s.id} search={s => `${s.name} ${s.code}`} columns={[{ label: 'Student', display: s => s.name }, { label: 'Code', display: s => <code>{s.code}</code> }]} />}</>
}
function LiveExams() {
  const state = useLive(api.exams)
  return <><Heading eyebrow="REGISTRAR" title="Exams" detail="Institution examination sessions." />{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading exams…</Loading> : <DataTable label="Exams" rows={state.value} rowKey={e => e.id} search={e => `${e.title} ${e.code}`} columns={[{ label: 'Exam', display: e => e.title }, { label: 'Code', display: e => <code>{e.code}</code> }]} />}</>
}
export function LiveResults({ student = false, overview = false, history = false }: { student?: boolean; overview?: boolean; history?: boolean }) {
  if (student) return <div className="container subpage"><RequireAccount roles={['STUDENT']}><LiveResultList student /></RequireAccount></div>
  return <LiveResultList overview={overview} history={history} />
}
const staffData = (token: string, signal: AbortSignal) => Promise.all([api.results(token, signal), api.students(token, signal), api.exams(token, signal)])
const studentData = async (token: string, signal: AbortSignal): ReturnType<typeof staffData> => [await api.results(token, signal), [], []]
function LiveResultList({ student = false, overview = false, history = false }: { student?: boolean; overview?: boolean; history?: boolean }) {
  const { signedIn } = useSession()
  const state = useLive(student ? studentData : staffData)
  const [results, students, exams] = state.value ?? [[], [], []]
  const studentLabel = (id: string) => { const row = students.find(s => s.id === id); return row ? `${row.name} · ${row.code}` : id }
  return <><Heading eyebrow={student ? 'STUDENT PORTAL' : 'STAFF WORKSPACE'} title={student ? 'Your exam results' : overview ? 'Integrity overview' : history ? 'Publication history' : 'Results'} detail={student ? `Signed in as ${signedIn?.user.email}. Open a result to see versions and print a checked marksheet.` : 'Browse institution results and inspect their publication history.'} action={student ? <SignOut /> : signedIn?.user.role === 'ADMIN' ? <Link className="btn" to="/admin/publish">Publish results</Link> : undefined} />
    {state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading results…</Loading> : <>
      {overview && <div className="metric-grid">{[[results.length, 'Result records'], [students.length, 'Students'], [exams.length, 'Exams']].map(([total, label]) => <Panel className="metric" key={label}><strong>{total}</strong><span>{label}</span></Panel>)}</div>}
      <DataTable label="Results" rows={results} rowKey={r => r.id} search={r => `${r.exam.title} ${r.exam.code} ${student ? '' : studentLabel(r.studentId)}`} columns={[{ label: 'Exam', display: r => r.exam.title }, ...(!student ? [{ label: 'Student', display: (r: typeof results[number]) => studentLabel(r.studentId) }] : []), { label: 'Latest recorded version', display: r => <Chip>v{r.currentVersion}</Chip> }, { label: 'Versions', display: r => <Link className="inline-link" aria-label={`Open publication history for ${r.exam.title}`} to={`${student ? '/student' : '/admin'}/results/${r.id}`}>View history <ArrowRight size={16} /></Link> }]} />
    </>}
  </>
}

export function LiveHistory({ student = false }: { student?: boolean }) {
  const { id = '' } = useParams()
  const content = <History id={id} student={student} />
  return student ? <div className="container subpage"><RequireAccount roles={['STUDENT']}>{content}</RequireAccount></div> : content
}
function History({ id, student }: { id: string; student: boolean }) {
  const state = useLive(useCallback((token, signal) => api.history(token, id, signal), [id]))
  const root = student ? '/student' : '/admin'
  return <><Heading eyebrow="PUBLICATION RECORDS" title="Result history" detail="Versions returned by the institution. Open a marksheet to check its signed marks before printing." action={<Link className="btn secondary" to={student ? root : '/admin/results'}>Back to results</Link>} /><p>Result ID: <code>{id}</code></p>
    {state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading publication history…</Loading> : !state.value.length ? <Empty>No published versions.</Empty> : <div className="stack">{state.value.map(entry => <Panel key={entry.id}><div className="page-heading"><div><h2>Version {entry.version}</h2><p>Commitment: <code>{entry.commitment}</code></p></div><Link className="btn secondary" to={`${root}/marksheet/${id}/${entry.version}`}><Printer size={17} /> Open marksheet</Link></div><Marks marks={displayMarks(entry.data.marks)} /></Panel>)}</div>}
  </>
}

export function LiveMarksheet({ staff = false }: { staff?: boolean }) {
  const { id = '', version = '' } = useParams()
  const page = <div className="container subpage marksheet-shell"><RequireAccount roles={[...allRoles]}><CheckedMarksheet id={id} version={Number(version)} staff={staff} /></RequireAccount></div>
  return page
}
function CheckedMarksheet({ id, version, staff }: { id: string; version: number; staff: boolean }) {
  const state = useLive(useCallback(async (token, signal) => {
    if (!Number.isSafeInteger(version) || version <= 0) throw new Error('Invalid version')
    const { receipt } = await api.receipt(token, id, version, signal)
    if (receipt.body.resultId !== id || receipt.body.version !== version) throw new Error('Receipt did not match the requested version')
    const path = receiptLink(receipt)
    const proof = await verifyReceipt(new URLSearchParams(path.split('?')[1]).get('receipt')!, signal)
    return { proof, path }
  }, [id, version]))
  return <><div className="print-toolbar no-print"><Link className="btn secondary" to={`${staff ? '/admin' : '/student'}/results/${id}`}>Back to history</Link>{state.value?.proof.marks && <button className="btn" onClick={() => window.print()}><Printer size={17} /> Print marksheet</button>}</div>
    {state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Checking receipt and signed marks…</Loading> : !state.value.proof.marks ? <Notice error>{state.value.proof.reason}</Notice> : <article className="marksheet"><header className="sheet-head"><Brand /><Chip tone="teal">Signed version {version}</Chip></header><div className="sheet-title"><h1>Statement of Marks</h1><p>Result ID: <code>{id}</code></p><p>Checkpoint time: <code>{state.value.proof.checkedAt}</code></p></div><Marks marks={state.value.proof.marks} /><div className="sheet-qr"><QRCodeSVG title="QR link to signed receipt verification" value={`${window.location.origin}${state.value.path}`} size={160} marginSize={4} /><div><h2><ShieldCheck size={19} /> Check this publication</h2><p>Scan the QR to check the signed evidence for the exact marks above. Anyone holding the QR can access the verification evidence.</p><Link className="inline-link no-print" to={state.value.path}>Open verification <ArrowRight size={16} /></Link></div></div><footer>VeriMark · {state.value.proof.status === 'historical' ? 'Historical version' : 'Current as of the offered signed checkpoint'}</footer></article>}
  </>
}
