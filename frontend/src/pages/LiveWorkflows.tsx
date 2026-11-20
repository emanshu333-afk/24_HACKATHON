import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Confirm, DataTable, Empty, Heading, Loading, Notice, Panel } from '../components/ui'
import { Marks } from '../components/marks'
import { api, errorMessage } from '../services/http'
import { digest } from '../services/proof/browser-verifier.js'
import { receiptLink } from '../services/proof/receipt'
import { useLive, useSession } from '../services/session'
import type { CorrectionDetails, IntegrityAudit, Marks as WireMarks, PublicationResponse, PublishRequest, ResultListItem } from '../services/wire'
import { displayMarks, LiveError } from './LiveResults'

function parseMarks(value: FormDataEntryValue | null): WireMarks {
  const lines = String(value ?? '').trim().split(/\r?\n/).filter(line => line.trim())
  const seen = new Set<string>()
  if (!lines.length || lines.length > 30) throw new Error('Enter between 1 and 30 marks.')
  return lines.map(line => {
    const match = /^([A-Z0-9_-]{1,32})\s*:\s*(\d{1,3})$/.exec(line.trim())
    if (!match || +match[2] > 100 || seen.has(match[1])) throw new Error('Use unique subject codes and whole marks from 0 to 100, one per line (CS101: 85).')
    seen.add(match[1]); return { subject: match[1], score: +match[2], max: 100 }
  })
}
function useMutation() {
  const { call } = useSession(), locked = useRef(false)
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('')
  async function run<T>(operation: (token: string) => Promise<T>, onDone: (result: T) => void) {
    if (locked.current) return
    locked.current = true; setBusy(true); setFailure('')
    try { onDone(await call(operation)) } catch (error) { setFailure(errorMessage(error)) }
    finally { locked.current = false; setBusy(false) }
  }
  return { busy, failure, setFailure, run }
}
const directories = (token: string, signal: AbortSignal) => Promise.all([api.students(token, signal), api.exams(token, signal)])
export function LivePublish() {
  const state = useLive(directories), mutation = useMutation()
  const [pending, setPending] = useState<PublishRequest>(), [created, setCreated] = useState<PublicationResponse>()
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget)
    mutation.setFailure(''); setCreated(undefined)
    try { setPending({ studentId: String(fields.get('student')), examId: String(fields.get('exam')), marks: parseMarks(fields.get('marks')) }) }
    catch (error) { mutation.setFailure((error as Error).message) }
  }
  return <><Heading eyebrow="PUBLICATION WORKFLOW" title="Publish results" detail="Review a student’s marks before creating a signed publication." />{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading students and exams…</Loading> : <Panel><form className="stack" onSubmit={review}><div className="form-grid"><label>Student<select name="student" required defaultValue=""><option value="">Choose a student</option>{state.value[0].map(s => <option key={s.id} value={s.id}>{s.name} · {s.code}</option>)}</select></label><label>Exam<select name="exam" required defaultValue=""><option value="">Choose an exam</option>{state.value[1].map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label></div><label>Subject marks (one per line)<textarea name="marks" rows={5} required maxLength={1600} placeholder="CS101: 85" /></label><button className="btn" disabled={mutation.busy}>Review publication</button></form>{mutation.failure && <Notice error>{mutation.failure}</Notice>}{created && <div className="success-message" role="status">Publication v{created.version} recorded. <Link to={`/admin/results/${created.resultId}`}>Open result history</Link> · <Link to={receiptLink(created.receipt)}>Check receipt evidence</Link></div>}</Panel>}
    {pending && <Confirm title="Publish these marks?" action="Publish and sign" onDismiss={() => setPending(undefined)} onConfirm={() => { setPending(undefined); void mutation.run(token => api.publish(token, pending), setCreated) }}><p>{state.value?.[0].find(s => s.id === pending.studentId)?.name} · {state.value?.[1].find(e => e.id === pending.examId)?.title}</p><Marks marks={displayMarks(pending.marks)} /></Confirm>}
  </>
}

export function LiveCorrections() {
  const state = useLive(api.corrections), { signedIn } = useSession(), [id, setId] = useState('')
  const selected = state.value?.find(c => c.id === id) ?? state.value?.[0]
  return <><Heading eyebrow="CHANGE CONTROL" title="Correction requests" detail="Review the exact proposed marks and use two distinct authorized signatures to advance a result." />{signedIn?.user.role === 'ADMIN' && <Propose done={c => { setId(c); state.reload() }} />}
    {state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading correction proposals…</Loading> : !selected ? <Empty>No correction proposals.</Empty> : <div className="student-grid"><Panel><h2>Proposal history</h2><div className="history">{state.value.map(c => <button className="proposal-link" type="button" key={c.id} aria-pressed={c.id === selected.id} onClick={() => setId(c.id)}><code>{c.id}</code><Chip tone={c.applied ? 'neutral' : 'amber'}>{c.applied ? 'Recorded as applied' : 'Pending'}</Chip></button>)}</div></Panel><ProposalDetails key={selected.id} proposal={selected} reload={state.reload} /></div>}
  </>
}
function Propose({ done }: { done: (id: string) => void }) {
  const state = useLive(api.results), mutation = useMutation(), [selected, setSelected] = useState('')
  const result = state.value?.find(r => r.id === selected)
  return <Panel className="live-section"><h2>Propose a correction</h2>{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading results…</Loading> : <><label>Base result<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Choose a result</option>{state.value.map(r => <option key={r.id} value={r.id}>{r.exam.title} · {r.id} · v{r.currentVersion}</option>)}</select></label>{result && <ProposalForm key={`${result.id}:${result.currentVersion}`} result={result} done={done} mutation={mutation} />}</>}</Panel>
}
function ProposalForm({ result, done, mutation }: { result: ResultListItem; done: (id: string) => void; mutation: ReturnType<typeof useMutation> }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const reason = String(data.get('reason')).trim()
    if (reason.length < 5 || reason.length > 1000) return mutation.setFailure('Enter a reason between 5 and 1,000 characters.')
    try { const marks = parseMarks(data.get('marks')); void mutation.run(token => api.propose(token, result.id, { baseVersion: result.currentVersion, marks, reason }), c => done(c.id)) }
    catch (error) { mutation.setFailure((error as Error).message) }
  }
  return <form className="stack" onSubmit={submit}><h3>Recorded base marks · v{result.currentVersion}</h3><Marks marks={displayMarks(result.marks)} /><label>Full replacement marks<textarea name="marks" rows={4} required maxLength={1600} defaultValue={result.marks.map(m => `${m.subject}: ${m.score}`).join('\n')} /></label><label>Reason<textarea name="reason" required maxLength={1000} /></label>{mutation.failure && <Notice error>{mutation.failure}</Notice>}<button className="btn" disabled={mutation.busy}>Create proposal</button></form>
}
function ProposalDetails({ proposal, reload }: { proposal: CorrectionDetails; reload: () => void }) {
  const { signedIn } = useSession(), mutation = useMutation()
  const state = useLive(useCallback((token, signal) => api.history(token, proposal.resultId, signal), [proposal.resultId]))
  const base = state.value?.find(entry => entry.version === proposal.baseVersion)
  const allowed = signedIn?.user.role === 'APPROVER' && !proposal.applied && !proposal.approvals.some(a => a.userId === signedIn.user.id)
  async function checkDigest() { if (await digest('proposal', proposal.body) !== proposal.digest) throw new Error('PROPOSAL_DIGEST_MISMATCH') }
  async function download() {
    mutation.setFailure('')
    try {
      await checkDigest()
      const url = URL.createObjectURL(new Blob([JSON.stringify(proposal, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = 'verimark-proposal.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { mutation.setFailure('The proposal digest could not be confirmed in this browser.') }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const signature = String(new FormData(event.currentTarget).get('signature')).trim()
    if (!/^[A-Za-z0-9_-]{86}$/.test(signature)) return mutation.setFailure('Enter the detached Ed25519 signature (86 base64url characters).')
    await mutation.run(async token => { await checkDigest(); return api.approve(token, proposal.id, { signature }) }, reload)
  }
  return <Panel><h2>Proposal review</h2><p>Proposal ID: <code>{proposal.id}</code></p><p>{proposal.body.reason}</p><p>Digest: <code>{proposal.digest}</code></p><h3>Base version {proposal.baseVersion}</h3>{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading base version…</Loading> : base ? <Marks marks={displayMarks(base.data.marks)} /> : <Notice>Base version not found.</Notice>}<h3>Proposed marks</h3><Marks marks={displayMarks(proposal.body.marks)} /><ol className="timeline">{[0, 1].map(i => <li key={i}><strong>{i ? 'Second approval' : 'First approval'}</strong><span>{proposal.approvals[i] ? 'Signature recorded by the institution. Verify the final receipt for independent evidence.' : 'Awaiting signature'}</span></li>)}</ol>
    {proposal.applied && <Link className="inline-link" to={`/admin/marksheet/${proposal.resultId}/${proposal.baseVersion + 1}`}>Check corrected signed publication</Link>}
    {allowed && <form className="stack" onSubmit={submit}><p>Review the proposal, download it and sign using your institution’s offline signer. Paste only the detached signature.</p><button type="button" className="btn secondary" onClick={() => void download()}>Download proposal JSON</button><label>Detached signature<input name="signature" required maxLength={86} autoComplete="off" spellCheck={false} /></label><button className="btn" disabled={mutation.busy || !base}>Submit approval signature</button></form>}{mutation.failure && <Notice error>{mutation.failure}</Notice>}
  </Panel>
}

export function LiveLedger() {
  const [cursors, setCursors] = useState([0]), after = cursors.at(-1) ?? 0
  const state = useLive(useCallback((token, signal) => api.ledger(token, after, signal), [after]))
  return <><Heading eyebrow="AUDITOR VIEW" title="Ledger explorer" detail="Read ledger events from the API. Use a signed receipt for independent verification." />{state.failure ? <LiveError {...state} /> : !state.value ? <Loading>Loading ledger events…</Loading> : <><DataTable key={after} label="Ledger events on this slice" rows={state.value.events} rowKey={event => event.body.id} search={e => `${e.body.type} ${e.body.resultId} ${e.hash}`} columns={[{ label: 'Sequence', display: e => e.body.sequence }, { label: 'Event', display: e => e.body.type }, { label: 'Result', display: e => <code>{e.body.resultId}</code> }, { label: 'Version', display: e => e.body.version }, { label: 'Event hash', display: e => <code>{e.hash}</code> }]} /><div className="actions pagination"><button className="btn secondary" disabled={!after} onClick={() => setCursors(c => c.slice(0, -1))}>Previous ledger slice</button><button className="btn secondary" disabled={state.value.nextAfter == null} onClick={() => setCursors(c => [...c, state.value!.nextAfter!])}>Next ledger slice</button></div></>}</>
}

export function LiveAudit({ lab = false }: { lab?: boolean }) {
  const mutation = useMutation(), [report, setReport] = useState<IntegrityAudit>()
  const show = (value: unknown) => value === undefined ? 'Not present' : JSON.stringify(value)
  return <><Heading eyebrow="INTEGRITY MONITORING" title={lab ? 'Tamper Detection Lab' : 'Audit reports'} detail="Request an integrity comparison between recorded data and the signed ledger." action={<button className="btn" disabled={mutation.busy} onClick={() => { setReport(undefined); void mutation.run(api.audit, setReport) }}>Run integrity audit</button>} />{mutation.busy && <Loading>Running integrity checks…</Loading>}{mutation.failure && <Notice error>{mutation.failure}</Notice>}{report ? <><Notice error={report.status === 'INVALID'}>Institution audit: {report.status === 'VALID' ? 'No findings reported' : 'Integrity findings reported'}{report.checkpointSequence != null && ` · checkpoint #${report.checkpointSequence}`} · {report.freshness ?? 'No freshness assertion'}</Notice><DataTable label="Integrity findings" rows={report.findings.map((finding, i) => ({ ...finding, i }))} rowKey={f => String(f.i)} search={f => `${f.code} ${f.resultId ?? ''} ${f.field ?? ''}`} columns={[{ label: 'Finding code', display: f => <code>{f.code}</code> }, { label: 'Result / version', display: f => <code>{f.resultId ?? '—'}{f.version !== undefined && ` / v${f.version}`}</code> }, { label: 'Field', display: f => <code>{f.field ?? '—'}</code> }, { label: 'Expected', display: f => <code>{show(f.expected)}</code> }, { label: 'Observed', display: f => <code>{show(f.actual)}</code> }]} /></> : !mutation.busy && <Panel><h2>No audit run in this session</h2><p>Run the audit to see any field mismatches. Verified historical evidence and current database state are separate checks.</p></Panel>}</>
}
