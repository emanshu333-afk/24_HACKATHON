import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ClipboardCheck, FileUp, KeyRound } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Chip, Confirm, Heading, Notice, Panel } from '../components/ui'
import { exams, students, subjects } from '../services/demo'
import type { Correction } from '../services/model'
import { useWorkspace } from '../services/workspace'

type FieldAttrs = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }
function Field({ label, error, children }: { label: string; error?: string; children: (attrs: FieldAttrs) => ReactNode }) {
  const id = useId(), errorId = `${id}-error`
  return <div className="form-field"><label htmlFor={id}>{label}</label>{children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined })}{error && <p id={errorId} className="field-error" role="alert">{error}</p>}</div>
}

// These limits describe the fixed out-of-100 demo fixtures.
const score = z.number({ error: 'Enter a mark.' }).int('Use a whole number.').min(0, 'Minimum is 0.').max(100, 'Maximum is 100.')
const required = z.string().min(1, 'Choose an option.')
const publicationSchema = z.object({ student: required, exam: required, marks: z.array(score).length(subjects.length) })
type Publication = z.infer<typeof publicationSchema>

export function Publish() {
  const { results, addResult } = useWorkspace()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Publication>({ resolver: zodResolver(publicationSchema), defaultValues: { student: '', exam: '' } })
  const [pending, setPending] = useState<Publication>(), [created, setCreated] = useState('')
  const duplicate = (data: Publication) => results.some(r => r.student.id === data.student && r.exam.id === data.exam)
  function save() {
    if (!pending) return
    const student = students.find(s => s.id === pending.student), exam = exams.find(e => e.id === pending.exam)
    if (!student || !exam || duplicate(pending)) { setPending(undefined); setError('root', { message: 'This result could not be added. Review your selection.' }); return }
    const ref = `DEMO-${exam.id}-${student.id}-V1`
    addResult({ ref, student, exam, marks: subjects.map((subject, i) => ({ subject, scored: pending.marks[i], maximum: 100 })), current: true, version: 1, date: new Date().toISOString() })
    setCreated(ref); setPending(undefined); reset()
  }
  return <>
    <Heading eyebrow="PUBLICATION WORKFLOW" title="Publish results" detail="Prepare and review a sample publication. This workspace does not sign or submit results to a real ledger." />
    <div className="student-grid">
      <Panel><form className="stack" noValidate onSubmit={handleSubmit(data => { setCreated(''); if (duplicate(data)) setError('root', { message: 'A result already exists for this student and exam. Use the correction workflow.' }); else setPending(data) })}>
        <div className="form-grid">
          <Field label="Student" error={errors.student?.message}>{attrs => <select {...attrs} {...register('student')}><option value="">Select a student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</Field>
          <Field label="Exam" error={errors.exam?.message}>{attrs => <select {...attrs} {...register('exam')}><option value="">Select an exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>}</Field>
        </div>
        <fieldset><legend>Subject marks · out of 100</legend><div className="form-grid">{subjects.map((subject, i) => <Field key={subject} label={subject} error={errors.marks?.[i]?.message}>{attrs => <input {...attrs} type="number" min="0" max="100" {...register(`marks.${i}`, { valueAsNumber: true })} />}</Field>)}</div></fieldset>
        {errors.root && <Notice error>{errors.root.message}</Notice>}
        <button className="btn"><FileUp size={18} /> Review sample publication</button>
      </form></Panel>
      <Panel><h2>Before publishing</h2><p>Confirm the student, exam and marks. An official release must create a signed receipt and publish evidence to the institutional ledger.</p><p>CSV import is unavailable until a roster and import format are agreed.</p>{created && <div className="success-message" role="status">Added <code>{created}</code> to this session’s demo history. <Link to="/admin/history">View history</Link></div>}</Panel>
    </div>
    {pending && <Confirm title="Review sample publication" onDismiss={() => setPending(undefined)} onConfirm={save} action="Add to demo history"><p>{students.find(s => s.id === pending.student)?.name} · {exams.find(e => e.id === pending.exam)?.name}</p><ul>{subjects.map((subject, i) => <li key={subject}>{subject}: {pending.marks[i]} / 100</li>)}</ul><p>No signature or public receipt will be created.</p></Confirm>}
  </>
}

const correctionSchema = z.object({ ref: required, subject: required, proposed: score, reason: z.string().trim().min(12, 'Explain the reason in at least 12 characters.').max(500, 'Use at most 500 characters.') })
type Proposal = z.infer<typeof correctionSchema>

export function Corrections() {
  const { corrections, results, addCorrection } = useWorkspace()
  const [params, setParams] = useSearchParams(), selected = corrections.find(c => c.id === params.get('id')) ?? corrections[0]
  const { register, watch, setValue, setError, reset, handleSubmit, formState: { errors } } = useForm<Proposal>({ resolver: zodResolver(correctionSchema), defaultValues: { ref: '', subject: '', reason: '' } })
  const result = results.find(r => r.ref === watch('ref')), mark = result?.marks.find(m => m.subject === watch('subject'))
  const refField = register('ref')
  function create(data: Proposal) {
    const original = results.find(r => r.ref === data.ref && r.current)?.marks.find(m => m.subject === data.subject)
    if (!original || data.proposed > original.maximum || data.proposed === original.scored) { setError('proposed', { message: 'Enter a different mark within the subject’s maximum.' }, { shouldFocus: true }); return }
    if (corrections.some(c => c.ref === data.ref && c.subject === data.subject && c.state === 'pending')) { setError('root', { message: 'A proposal for this subject is already pending.' }); return }
    const id = `CR-DEMO-${String(corrections.length + 1).padStart(3, '0')}`
    addCorrection({ ...data, id, original: original.scored, state: 'pending', reviewSteps: 0 }); setParams({ id }); reset()
  }
  return <>
    <Heading eyebrow="CHANGE CONTROL" title="Correction requests" detail="Compare changes, record a reason, and track the two required approvals." />
    <Notice><strong>DEMO ONLY</strong> · Review steps are illustrative. Submitting a proposal does not sign or amend a result.</Notice>
    <div className="student-grid">
      <Panel><h2>Propose a correction</h2><form className="stack" noValidate onSubmit={handleSubmit(create)}>
        <Field label="Published result" error={errors.ref?.message}>{attrs => <select {...attrs} {...refField} onChange={e => { void refField.onChange(e); setValue('subject', '') }}><option value="">Select a current result</option>{results.filter(r => r.current).map(r => <option key={r.ref} value={r.ref}>{r.ref} · {r.student.name}</option>)}</select>}</Field>
        {result && <p className="muted">{result.exam.name} · Publication v{result.version}</p>}
        <Field label="Subject" error={errors.subject?.message}>{attrs => <select {...attrs} {...register('subject')}><option value="">Select a subject</option>{result?.marks.map(m => <option key={m.subject}>{m.subject}</option>)}</select>}</Field>
        {mark && <p className="muted">Current mark: <strong>{mark.scored} / {mark.maximum}</strong></p>}
        <Field label="Proposed mark" error={errors.proposed?.message}>{attrs => <input {...attrs} type="number" min="0" max={mark?.maximum ?? 100} {...register('proposed', { valueAsNumber: true })} />}</Field>
        <Field label="Reason" error={errors.reason?.message}>{attrs => <textarea {...attrs} rows={3} maxLength={500} {...register('reason')} />}</Field>
        {errors.root && <Notice error>{errors.root.message}</Notice>}
        <button className="btn"><ClipboardCheck size={18} /> Create demo proposal</button>
      </form></Panel>
      <Panel><h2>Proposal history</h2><div className="history">{corrections.map(c => <Link key={c.id} to={`?id=${c.id}`} aria-current={selected.id === c.id ? 'true' : undefined}><div><strong>{c.id}</strong><span>{c.subject}</span></div><Chip tone={c.state === 'pending' ? 'amber' : c.state === 'rejected' ? 'red' : 'neutral'}>Demo {c.state}</Chip></Link>)}</div><CorrectionDetail correction={selected} /></Panel>
    </div>
  </>
}

function CorrectionDetail({ correction: c }: { correction: Correction }) {
  return <section className="correction-detail" aria-labelledby="proposal-heading"><h3 id="proposal-heading">Proposal {c.id}</h3><p><code>{c.ref}</code> · {c.subject}</p><div className="comparison slim"><div><span>Published</span><strong>{c.original}</strong></div><ArrowRight size={21} /><div><span>Proposed</span><strong>{c.proposed}</strong></div></div><p>{c.reason}</p><ol className="timeline">{[1, 2].map(step => <li key={step}><strong>{step === 1 ? 'First approval' : 'Second approval'}</strong><span>{c.reviewSteps >= step ? 'Illustrated review · no signature' : c.state === 'rejected' ? 'Not completed' : 'Awaiting review'}</span></li>)}</ol><Notice><KeyRound size={15} /> Institutional signing is not connected.</Notice></section>
}
