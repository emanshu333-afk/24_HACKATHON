import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Compass, FileText, Fingerprint, GraduationCap, History, KeyRound, Printer, QrCode, ScanLine, ShieldAlert, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Heading, Panel } from '../components/ui'
import { demoReference } from '../services/demo'

const tourSteps = [
  {
    step: 1,
    title: 'Inspect an Official Publication Record',
    badge: 'Step 1 of 5',
    category: 'Publication',
    desc: 'Examine how grades are committed to the academic record with a canonical SHA-256 fingerprint.',
    actionLabel: 'Open Result Details',
    actionTo: `/admin/results/${demoReference}`,
    icon: FileText,
    highlights: [
      'Canonical SHA-256 commitment of all student subject marks',
      'Immutable publication version number (v1)',
      'Associated examination term and student registration identifier',
    ],
  },
  {
    step: 2,
    title: 'Examine the Printable Statement of Marks',
    badge: 'Step 2 of 5',
    category: 'Marksheet',
    desc: 'View the formal A4 marksheet document with official registrar typography and verifiable QR receipt.',
    actionLabel: 'Open Printable Marksheet',
    actionTo: `/student/marksheet/${demoReference}`,
    icon: Printer,
    highlights: [
      'Document design engineered for A4 printing and export',
      'Embedded QR code encoding publication verification link',
      'Subject breakdowns with tabular score typography',
    ],
  },
  {
    step: 3,
    title: 'Verify Authenticity with Client-Side Cryptography',
    badge: 'Step 3 of 5',
    category: 'Verification',
    desc: 'Run a zero-login verification check directly in the browser to evaluate signatures and Merkle checkpoints.',
    actionLabel: 'Verify Sample Result',
    actionTo: `/verify?ref=${demoReference}`,
    icon: ScanLine,
    highlights: [
      'Client-side evaluation without student portal login',
      'Verification Inspector showing Ed25519 signature checks',
      'Status chips distinguishing Current vs Superseded vs Tampered records',
    ],
  },
  {
    step: 4,
    title: 'Govern Grade Revisions via Dual Approval',
    badge: 'Step 4 of 5',
    category: 'Governance',
    desc: 'Inspect how legitimate grade corrections require two distinct authorized signers instead of silent database updates.',
    actionLabel: 'Inspect Correction Proposal',
    actionTo: '/admin/corrections',
    icon: KeyRound,
    highlights: [
      'Side-by-side Before vs Proposed marks diff viewer',
      'Mandatory audit reason with character length minimum',
      'Two-stage approval workflow with distinct signature verification',
    ],
  },
  {
    step: 5,
    title: 'Test Forensic Integrity in the Tamper Lab',
    badge: 'Step 5 of 5',
    category: 'Forensics',
    desc: 'Simulate an out-of-band SQL modification (e.g., 85 changed to 95) and see how cryptographic checkpoints catch the discrepancy.',
    actionLabel: 'Launch Tamper Detection Lab',
    actionTo: '/admin/integrity',
    icon: ShieldAlert,
    highlights: [
      'Interactive side-by-side snapshot comparison',
      'Field mismatch alerts and checklist of required checks',
      'Forensic audit trail timeline contrasting valid vs illicit updates',
    ],
  },
]

export function Tour() {
  const [activeStep, setActiveStep] = useState(0)
  const current = tourSteps[activeStep]
  const Icon = current.icon

  return (
    <div className="container subpage tour-page">
      <Heading
        eyebrow="EVALUATION GUIDE"
        title="VeriMark 5-Step Guided Tour"
        detail="A structured walkthrough of VeriMark's flagship features for hackathon judges, auditors, and technical evaluators."
        action={
          <div className="actions">
            <Link to="/sample/" className="btn secondary">
              <ArrowLeft size={16} /> All Sample Screens
            </Link>
          </div>
        }
      />

      {/* Progress Navigation Stepper */}
      <div className="tour-stepper-track panel">
        {tourSteps.map((s, idx) => (
          <button
            key={s.step}
            type="button"
            className={`tour-step-tab ${idx === activeStep ? 'active' : idx < activeStep ? 'completed' : ''}`}
            onClick={() => setActiveStep(idx)}
          >
            <span className="step-tab-num">
              {idx < activeStep ? <CheckCircle2 size={15} /> : s.step}
            </span>
            <span className="step-tab-text">
              <strong>{s.category}</strong>
              <small>{s.title.slice(0, 24)}…</small>
            </span>
          </button>
        ))}
      </div>

      {/* Active Step Feature Showcase */}
      <Panel className="tour-hero-card">
        <div className="tour-hero-header">
          <div className="tour-icon-box">
            <Icon size={28} />
          </div>
          <div>
            <div className="tour-badge-row">
              <Chip tone="teal">{current.badge}</Chip>
              <span className="tour-category-tag">{current.category}</span>
            </div>
            <h2>{current.title}</h2>
            <p className="tour-hero-desc">{current.desc}</p>
          </div>
        </div>

        <div className="tour-highlights-box">
          <h3>Key Capabilities Demonstrated:</h3>
          <ul className="tour-highlights-list">
            {current.highlights.map((h, i) => (
              <li key={i}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="tour-actions-bar">
          <Link to={current.actionTo} className="btn">
            {current.actionLabel} <ArrowRight size={17} />
          </Link>
          <div className="tour-stepper-btns">
            <button
              type="button"
              className="btn secondary compact"
              disabled={activeStep === 0}
              onClick={() => setActiveStep(s => s - 1)}
            >
              Previous step
            </button>
            <button
              type="button"
              className="btn secondary compact"
              disabled={activeStep === tourSteps.length - 1}
              onClick={() => setActiveStep(s => s + 1)}
            >
              Next step <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
