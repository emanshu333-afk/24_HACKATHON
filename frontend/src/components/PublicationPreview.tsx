import { useId, useState } from 'react'
import {
  ArrowRight, CheckCircle2, Cpu, FileClock, FileText, Fingerprint,
  GitPullRequest, KeyRound, QrCode, ShieldCheck, Sparkles, Terminal
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { corrections, results } from '../services/demo'

// Grid Pattern adapted from Magic UI (21st.dev). License in public/licenses/magic-ui.txt.
function GridPattern() {
  const id = useId()
  return (
    <svg className="preview-grid" aria-hidden="true" width="100%" height="100%">
      <defs>
        <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 24V0H24" stroke="currentColor" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

const proposal = corrections.find(row => row.state === 'approved')!
const original = results.find(row => row.ref === proposal.ref)!
const versions = results.filter(row => row.exam.id === original.exam.id && row.student.id === original.student.id)
const record = versions.find(row => row.current)!

const views = [
  { title: 'Statement of marks', icon: FileText, desc: 'Student marksheet view' },
  { title: 'Cryptographic chain', icon: Cpu, desc: 'Proof pipeline' },
  { title: 'Dual governance', icon: GitPullRequest, desc: 'Two-person review' },
] as const

export function PublicationPreview() {
  const [selected, setSelected] = useState(0)

  return (
    <section className="product-preview" aria-label="Interactive cryptographic proof terminal">
      <GridPattern />
      
      {/* Terminal Titlebar */}
      <div className="preview-top">
        <div className="preview-terminal-status">
          <span className="terminal-dot green" aria-hidden="true" />
          <span className="terminal-title">ATTESTATION TERMINAL // VM-SP26-017-V1</span>
        </div>
        <span className="synthetic-badge">SYNTHETIC EVIDENCE</span>
      </div>

      {/* Main Terminal Body */}
      <div className="preview-paper">
        {/* Exam Title Banner */}
        <div className="preview-exam-banner">
          <div className="exam-banner-left">
            <span className="preview-icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <span className="banner-sub">Verified Examination Record</span>
              <strong className="banner-title">{record.exam.name}</strong>
            </div>
          </div>
          <span className="banner-version-badge">v{record.version}.0 Official</span>
        </div>

        {/* View Segmented Tabs */}
        <div className="preview-tabs" role="group" aria-label="Attestation views">
          {views.map(({ title, icon: Icon }, i) => (
            <button
              type="button"
              key={title}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className={selected === i ? 'active' : ''}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panes */}
        <div className="preview-body" aria-live="polite">
          {/* VIEW 0: Marksheet Document & QR Attestation */}
          {selected === 0 && (
            <div className="preview-sheet-view">
              <div className="preview-sheet-meta-strip">
                <div>
                  <span className="meta-label">Student</span>
                  <strong>{record.student.name}</strong>
                </div>
                <div>
                  <span className="meta-label">Identifier</span>
                  <code>{record.student.id}</code>
                </div>
                <div>
                  <span className="meta-label">Programme</span>
                  <span>{record.student.programme}</span>
                </div>
              </div>

              <div className="preview-marks-list">
                <div className="preview-label">
                  <span>Subject</span>
                  <span>Score / 100</span>
                </div>
                {record.marks.slice(0, 3).map(mark => (
                  <div className="preview-row" key={mark.subject}>
                    <span className="subject-name">{mark.subject}</span>
                    <span className="preview-score">
                      <i aria-hidden="true" style={{ width: `${(mark.scored / mark.maximum) * 100}%` }} />
                      <strong>{mark.scored}</strong>
                    </span>
                  </div>
                ))}
              </div>

              <div className="preview-qr-strip">
                <div className="mini-qr-frame">
                  <QRCodeSVG
                    value={`https://verimark.edu/verify?ref=${encodeURIComponent(record.ref)}`}
                    size={48}
                    marginSize={1}
                  />
                  <div className="qr-reticle-corner top-left" />
                  <div className="qr-reticle-corner bottom-right" />
                </div>
                <div className="mini-qr-text">
                  <span className="qr-title">Instant Browser Verification</span>
                  <span className="qr-desc">Scan or enter <code>{record.ref}</code> to check signed evidence.</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: Cryptographic Verification Pipeline */}
          {selected === 1 && (
            <div className="preview-pipeline-view">
              <div className="pipeline-nodes">
                <div className="pipeline-node passed">
                  <div className="node-marker"><CheckCircle2 size={13} /></div>
                  <div className="node-content">
                    <span className="node-title">1. Canonical Commitment</span>
                    <code>SHA-256: 8a9df031c2e4…</code>
                  </div>
                </div>

                <div className="pipeline-connector" />

                <div className="pipeline-node passed">
                  <div className="node-marker"><CheckCircle2 size={13} /></div>
                  <div className="node-content">
                    <span className="node-title">2. Institutional Signature</span>
                    <code>Ed25519: Pinned Root Key</code>
                  </div>
                </div>

                <div className="pipeline-connector" />

                <div className="pipeline-node passed">
                  <div className="node-marker"><CheckCircle2 size={13} /></div>
                  <div className="node-content">
                    <span className="node-title">3. Append-Only Ledger</span>
                    <code>Checkpoint Sequence #102</code>
                  </div>
                </div>

                <div className="pipeline-connector" />

                <div className="pipeline-node verified-final">
                  <div className="node-marker"><ShieldCheck size={14} /></div>
                  <div className="node-content">
                    <span className="node-title">4. Verification Outcome</span>
                    <strong className="outcome-text">Verified Current · 100% Authentic</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Dual Governance & Correction Diff */}
          {selected === 2 && (
            <div className="preview-governance-view">
              <div className="gov-header">
                <span className="gov-badge">Correction Proposal {proposal.id}</span>
                <span className="gov-status">Approved & Committed</span>
              </div>

              <div className="gov-diff-card">
                <div className="diff-subject-title">{proposal.subject}</div>
                <div className="diff-numbers">
                  <div className="diff-side old">
                    <span>Published (v1)</span>
                    <strong>{proposal.original}</strong>
                  </div>
                  <ArrowRight size={18} className="diff-arrow" />
                  <div className="diff-side new">
                    <span>Proposed (v2)</span>
                    <strong>{proposal.proposed}</strong>
                  </div>
                  <span className="diff-delta-pill">+10 marks</span>
                </div>
              </div>

              <div className="gov-signatures-row">
                <div className="sig-pill">
                  <KeyRound size={12} />
                  <span>Approver A: Signed</span>
                </div>
                <div className="sig-pill">
                  <KeyRound size={12} />
                  <span>Approver B: Signed</span>
                </div>
              </div>

              <p className="gov-note">
                Version 2 committed to ledger. Earlier Version 1 preserved in immutable audit history.
              </p>
            </div>
          )}
        </div>

        {/* Terminal Bottom Footer */}
        <div className="preview-foot">
          <div className="foot-ref">
            <span className="foot-label">Ref:</span>
            <code>{record.ref}</code>
          </div>
          <div className="foot-version">
            <span className="foot-dot" />
            <span>Immutable v{record.version}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
