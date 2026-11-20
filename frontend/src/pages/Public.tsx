import { ArrowDown, ArrowRight, Fingerprint, GitBranch, LockKeyhole, QrCode, ScanLine, ShieldCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Brand } from '../components/ui'
import { PublicationPreview } from '../components/PublicationPreview'
import { mockMode } from '../services/api'

export function PublicLayout() {
  return (
    <>
      <header className="public-nav no-print">
        <div className="container nav-content">
          <Brand />
          <nav aria-label="Public navigation">
            <Link className="nav-text" to="/student">Student portal</Link>
            <Link className="nav-text" to="/admin">Staff workspace</Link>
            <Link className="nav-text" to="/how-verification-works">Architecture</Link>
            <Link className="nav-text" to="/trust">Trust model</Link>
            <Link className="btn secondary compact nav-cta" to="/verify">
              Verify a result <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="public-footer no-print">
        <div className="container">
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-tagline">
              Cryptographic academic integrity platform. Tamper-evident publications, dual-signature governance, and client-side proof verification.
            </p>
          </div>
          <div className="footer-nav-col">
            <div className="footer-group">
              <strong>Verification</strong>
              <Link to="/verify">Public verification</Link>
              <Link to="/how-verification-works">How verification works</Link>
              <Link to="/trust">Trust & security model</Link>
            </div>
            <div className="footer-group">
              <strong>Workspaces</strong>
              <Link to="/student">Student portal</Link>
              <Link to="/admin">Staff workspace</Link>
              <Link to="/login">Institution sign-in</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <div className="container footer-bottom-inner">
            <span>VeriMark Academic Trust Platform</span>
            <span>Ed25519 Signatures · Append-Only Ledger · Zero-Login Client Verification</span>
          </div>
        </div>
      </footer>
    </>
  )
}

const steps = [
  {
    icon: Fingerprint,
    title: 'Publish with evidence',
    info: 'A commitment binds the marks to a specific publication. A ledger and signed checkpoint provide evidence of when that version was recorded.'
  },
  {
    icon: QrCode,
    title: 'Verify from the marksheet',
    info: 'Scan the printed QR or paste the receipt from the marksheet. Verification checks the evidence behind that exact version.'
  },
  {
    icon: GitBranch,
    title: 'Correct without erasing',
    info: 'Two distinct authorized signers must approve a correction. The reason and earlier result remain visible in the history.'
  },
]

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text-block">
            <div className="overline">
              <ShieldCheck size={14} aria-hidden="true" /> EXAM RESULT INTEGRITY
            </div>
            <h1>
              Every mark<br /> has <em>proof.</em>
            </h1>
            <p className="hero-copy">
              Publish exam results, trace every correction, and check a marksheet against its signed publication record.
            </p>
            <div className="actions">
              <Link className="btn" to="/verify">
                <ScanLine size={18} aria-hidden="true" /> Verify Result <ArrowRight size={17} aria-hidden="true" />
              </Link>
              {!mockMode && (
                <a className="btn secondary" href="/sample/">
                  Explore sample workspace
                </a>
              )}
              {mockMode && (
                <Link className="btn secondary" to="/admin/integrity">
                  Explore the demo
                </Link>
              )}
            </div>
            <p className="hero-note">
              <LockKeyhole size={14} aria-hidden="true" /> Public verification requires no student login.
            </p>
          </div>
          <div className="hero-visual-block">
            <PublicationPreview />
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="container trust-strip-inner">
          <span><Fingerprint size={18} aria-hidden="true" /> Versioned result evidence</span>
          <span><QrCode size={18} aria-hidden="true" /> QR-ready marksheets</span>
          <span><ShieldCheck size={18} aria-hidden="true" /> Dual approval for changes</span>
        </div>
      </div>

      <section className="container how">
        <div className="eyebrow"><ArrowDown size={14} aria-hidden="true" /> THE VERIMARK WORKFLOW</div>
        <h2>From publication to proof</h2>
        <p>Evidence at every step, from the original marks to the latest authorized correction.</p>

        <div className="feature-grid">
          {steps.map(({ icon: Icon, title, info }, idx) => (
            <article key={title} className="panel feature">
              <div className="feature-head">
                <span className="icon-tile"><Icon size={20} aria-hidden="true" /></span>
                <span className="step-count">0{idx + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{info}</p>
            </article>
          ))}
        </div>

        <div className="trust-panel">
          <div className="trust-panel-icon" aria-hidden="true">
            <ShieldCheck size={28} />
          </div>
          <div className="trust-panel-content">
            <h3>What makes a result trustworthy?</h3>
            <p>
              A QR code is a pointer, not proof. A verified result needs evidence that the marks match the publication, the signature and checkpoint are trusted, and the ledger identifies that version.
            </p>
          </div>
          <Link to="/verify" className="btn secondary trust-panel-btn">
            Open verification <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
