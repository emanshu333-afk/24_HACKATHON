import { ArrowLeft, ArrowRight, GraduationCap, Printer, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import { Marks, Score } from '../components/marks'
import { Brand, Chip, Heading, Notice, Panel } from '../components/ui'
import { mockMode } from '../services/api'
import { corrections, demoReference, results, students } from '../services/demo'
import { formatDate } from '../services/model'

const student = students[0]
const studentResults = results.filter(result => result.student.id === student.id)

export function Student() {
  if (!mockMode) return <div className="container subpage"><Heading eyebrow="STUDENT PORTAL" title="Student portal unavailable" detail="Institution sign-in and student result access are not connected." /></div>
  return <div className="container subpage"><Heading eyebrow="STUDENT PORTAL" title="Your exam results" detail="Review your marks, publication history, and printable marksheets." /><Notice><strong>DEMO MODE</strong> · This student profile and its results are synthetic.</Notice><div className="student-grid"><Panel><div className="section-head"><span className="icon-tile"><GraduationCap size={23} /></span><div><h2>{student.name}</h2><p>{student.programme} · {student.id}</p></div></div><h3>Exam history</h3><div className="history">{studentResults.map(result => <Link key={result.ref} to={`/student/marksheet/${result.ref}`}><div><strong>{result.exam.name}</strong><span>{result.exam.term} · {formatDate(result.date)}</span></div><Chip tone="teal">v{result.version} · {result.current ? 'Current sample' : 'Superseded sample'}</Chip><ArrowRight size={17} /></Link>)}</div></Panel><Panel><h2>Correction history</h2><p>Changes are recorded separately so earlier results can remain available.</p>{corrections.filter(c => c.ref === demoReference).map(c => <div className="history-note" key={c.id}><Chip tone="amber">Demo {c.state}</Chip><h3>{c.subject}</h3><p>{c.reason}</p><code>{c.id}</code></div>)}</Panel></div><Panel><div className="section-head"><div><h2>Latest exam · {studentResults[0].exam.name}</h2><p>Subject breakdown from the sample publication.</p></div></div><Marks marks={studentResults[0].marks} /><Score marks={studentResults[0].marks} /></Panel></div>
}

export function Marksheet() {
  const { ref = demoReference } = useParams(), result = studentResults.find(entry => entry.ref === ref)
  if (!mockMode || !result) return <div className="container subpage"><Notice error>Marksheet unavailable.</Notice><Link className="inline-link" to="/student">Back to student portal</Link></div>
  const path = `/verify?ref=${encodeURIComponent(result.ref)}`
  return <div className="container subpage marksheet-shell"><div className="print-toolbar no-print"><Link className="btn secondary" to="/student"><ArrowLeft size={18} /> Student portal</Link><button className="btn" onClick={() => window.print()}><Printer size={18} /> Print marksheet</button></div><article className="marksheet" aria-label="Sample marksheet"><header className="sheet-head"><div><Brand /><p>NORTHWIND INSTITUTE OF TECHNOLOGY</p></div><Chip tone="amber">Sample · Not official</Chip></header><div className="sheet-title"><div className="eyebrow">OFFICE OF THE REGISTRAR</div><h1>Statement of Marks</h1><p>{result.exam.name} · {result.exam.term}</p></div><dl className="sheet-meta"><div><dt>Student</dt><dd>{result.student.name}</dd></div><div><dt>Student ID</dt><dd>{result.student.id}</dd></div><div><dt>Programme</dt><dd>{result.student.programme}</dd></div><div><dt>Publication date</dt><dd>{formatDate(result.date)}</dd></div><div><dt>Publication reference</dt><dd><code>{result.ref}</code></dd></div><div><dt>Version</dt><dd>{result.version} · {result.current ? 'Current sample' : 'Superseded sample'}</dd></div></dl><Marks marks={result.marks} /><Score marks={result.marks} /><div className="sheet-qr"><QRCodeSVG value={`${window.location.origin}${path}`} title="QR link to sample verification" size={112} marginSize={4} /><div><h2><QrCode size={19} /> Check this publication</h2><p>Scan the QR or enter <code>{result.ref}</code> on the verification page. This sample QR links to the record; it does not contain signed evidence.</p><Link className="inline-link no-print" to={path}>Open sample verification <ArrowRight size={16} /></Link></div></div><footer>Fictitious institution · Synthetic academic record · No signed receipt attached</footer></article></div>
}
