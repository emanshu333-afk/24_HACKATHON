import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, GraduationCap, Printer, QrCode, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useHref, useParams } from 'react-router-dom'
import { Marks, Score } from '../components/marks'
import { Brand, Chip, Heading, Notice, Panel } from '../components/ui'
import { mockMode } from '../services/api'
import { corrections, demoReference, results, students } from '../services/demo'
import { formatDate, percent } from '../services/model'

const student = students[0]
const studentResults = results.filter(result => result.student.id === student.id)

export function Student() {
  if (!mockMode) {
    return (
      <div className="container subpage">
        <Heading
          eyebrow="STUDENT PORTAL"
          title="Student portal unavailable"
          detail="Institution sign-in and student result access are not connected."
        />
      </div>
    )
  }

  const latest = studentResults[0]
  const avgScore = latest ? percent(latest.marks) : 0

  return (
    <div className="container subpage">
      <Heading
        eyebrow="STUDENT PORTAL"
        title="Your exam results"
        detail="Review your marks, publication history, and printable marksheets."
      />

      <Notice tone="warning">
        <strong>DEMO MODE</strong> · This student profile and its results are synthetic.
      </Notice>

      <div className="student-profile-banner">
        <div className="profile-badge-icon">
          <GraduationCap size={28} aria-hidden="true" />
        </div>
        <div className="profile-details">
          <h2>{student.name}</h2>
          <p>{student.programme} · Identifier: <code>{student.id}</code></p>
        </div>
        <div className="profile-stats">
          <div className="stat-pill">
            <span>Completed terms</span>
            <strong>{studentResults.length} sessions</strong>
          </div>
          <div className="stat-pill">
            <span>Latest term score</span>
            <strong>{avgScore}%</strong>
          </div>
        </div>
      </div>

      <div className="student-grid">
        <Panel className="student-history-panel">
          <div className="section-head">
            <span className="icon-tile" aria-hidden="true"><BookOpen size={21} /></span>
            <div>
              <h2>{student.name}</h2>
              <p>{student.programme} · {student.id}</p>
            </div>
          </div>

          <h3>Exam history</h3>
          <div className="history">
            {studentResults.map(result => (
              <Link key={result.ref} to={`/student/marksheet/${result.ref}`} className="exam-history-item">
                <div>
                  <strong>{result.exam.name}</strong>
                  <span>{result.exam.term} · {formatDate(result.date)}</span>
                </div>
                <div className="exam-history-tags">
                  <Chip tone="teal">
                    v{result.version} · {result.current ? 'Current sample' : 'Superseded sample'}
                  </Chip>
                  <ArrowRight size={17} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="student-corrections-panel">
          <h2>Correction history</h2>
          <p>Review requests separately from published marks.</p>
          {corrections
            .filter(c => studentResults.some(result => result.ref === c.ref))
            .map(c => (
              <div className="history-note" key={c.id}>
                <div className="correction-chip-row">
                  <Chip tone="amber">Demo {c.state}</Chip>
                  <span className="subject-badge">{c.subject}</span>
                </div>
                <h3>{c.subject}</h3>
                <p>
                  Published: <strong>{c.original}</strong> · Proposed: <strong>{c.proposed}</strong>
                </p>
                <p className="correction-reason">{c.reason}</p>
                <p className="correction-ref-link">
                  <code>{c.id}</code> ·{' '}
                  <Link className="inline-link" to={`/student/marksheet/${c.ref}`}>
                    Open original marksheet <ChevronRight size={14} />
                  </Link>
                </p>
              </div>
            ))}
        </Panel>
      </div>

      <Panel className="student-latest-card">
        <div className="page-heading">
          <div>
            <h2>Latest exam · {latest.exam.name}</h2>
            <p>Subject breakdown from the sample publication.</p>
          </div>
          <Link className="btn secondary" to={`/student/marksheet/${latest.ref}`}>
            <Printer size={17} /> Open latest marksheet
          </Link>
        </div>
        <Marks marks={latest.marks} />
        <Score marks={latest.marks} />
      </Panel>
    </div>
  )
}

export function Marksheet() {
  const { ref = demoReference } = useParams(),
    result = studentResults.find(entry => entry.ref === ref)
  const path = `/verify?ref=${encodeURIComponent(ref)}`
  const verificationHref = useHref(path)

  if (!mockMode || !result) {
    return (
      <div className="container subpage">
        <Notice error>Marksheet unavailable.</Notice>
        <Link className="inline-link" to="/student">
          Back to student portal
        </Link>
      </div>
    )
  }

  return (
    <div className="container subpage marksheet-shell">
      <div className="print-toolbar no-print">
        <Link className="btn secondary" to="/student">
          <ArrowLeft size={18} /> Student portal
        </Link>
        <button className="btn" onClick={() => window.print()}>
          <Printer size={18} /> Print marksheet
        </button>
      </div>

      <article className="marksheet" aria-label="Sample marksheet">
        <header className="sheet-head">
          <div className="sheet-brand-group">
            <Brand />
            <p>NORTHWIND INSTITUTE OF TECHNOLOGY</p>
          </div>
          <div className="sheet-status-tag">
            <Chip tone="amber">Sample · Not official</Chip>
          </div>
        </header>

        <div className="sheet-title">
          <div className="eyebrow">OFFICE OF THE REGISTRAR</div>
          <h1>Statement of Marks</h1>
          <p>{result.exam.name} · {result.exam.term}</p>
        </div>

        <dl className="sheet-meta">
          <div>
            <dt>Student</dt>
            <dd>{result.student.name}</dd>
          </div>
          <div>
            <dt>Student ID</dt>
            <dd><code>{result.student.id}</code></dd>
          </div>
          <div>
            <dt>Programme</dt>
            <dd>{result.student.programme}</dd>
          </div>
          <div>
            <dt>Publication date</dt>
            <dd>{formatDate(result.date)}</dd>
          </div>
          <div>
            <dt>Publication reference</dt>
            <dd><code>{result.ref}</code></dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{result.version} · {result.current ? 'Current sample' : 'Superseded sample'}</dd>
          </div>
        </dl>

        <Marks marks={result.marks} />
        <Score marks={result.marks} />

        <div className="sheet-qr">
          <QRCodeSVG
            value={`${window.location.origin}${verificationHref}`}
            title="QR link to sample verification"
            size={112}
            marginSize={4}
          />
          <div className="sheet-qr-info">
            <h2>
              <QrCode size={19} aria-hidden="true" /> Check this publication
            </h2>
            <p>
              Scan the QR or enter <code>{result.ref}</code> on the verification page. This sample QR links to the record; it does not contain signed evidence.
            </p>
            <Link className="inline-link no-print" to={path}>
              Open sample verification <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <footer>
          Fictitious institution · Synthetic academic record · No signed receipt attached
        </footer>
      </article>
    </div>
  )
}
