import { ArrowRight, CheckCircle2, ChevronRight, FileCheck, KeyRound, Lock, Shield, ShieldAlert, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Chip, Heading, Notice, Panel } from '../components/ui'

export function TrustModel() {
  return (
    <div className="container subpage editorial-page">
      <Heading
        eyebrow="SECURITY & GOVERNANCE"
        title="Trust & Security Model"
        detail="A transparent disclosure of VeriMark's cryptographic guarantees, threat model, trust assumptions, and operational boundaries."
        action={
          <Link to="/how-verification-works" className="btn secondary">
            System Architecture <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="trust-overview-card panel">
        <div className="overview-icon-ring">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h2>The Zero-Implicit-Trust Principle</h2>
          <p>
            In VeriMark, a server’s declaration of <code>"verified: true"</code> is never accepted as proof. Verification is performed client-side inside the user's browser using native Web Crypto primitives.
          </p>
        </div>
      </div>

      <section className="threat-model-section">
        <div className="section-head">
          <span className="icon-tile" aria-hidden="true"><Shield size={22} /></span>
          <div>
            <h2>Threat Model & Adversary Analysis</h2>
            <p>How VeriMark responds to common academic fraud vectors</p>
          </div>
        </div>

        <div className="threat-cards-grid">
          <Panel className="threat-card">
            <div className="threat-header">
              <span className="chip red">Adversary Vector 01</span>
              <h3>Rogue Database Administrator</h3>
            </div>
            <p className="threat-scenario">
              <strong>Attack:</strong> An attacker with direct SQL access modifies student grades directly inside the PostgreSQL database (e.g., changing 75 to 99).
            </p>
            <div className="threat-mitigation">
              <span className="mitigation-label"><CheckCircle2 size={16} /> VeriMark Defense:</span>
              <p>
                When a user verifies the marksheet, the client calculates the SHA-256 commitment of the database row and compares it against the immutable signed ledger checkpoint. The mismatch is instantly flagged as <code>RESULT_COMMITMENT_MISMATCH</code>.
              </p>
            </div>
          </Panel>

          <Panel className="threat-card">
            <div className="threat-header">
              <span className="chip red">Adversary Vector 02</span>
              <h3>Forged Printed Marksheet QR</h3>
            </div>
            <p className="threat-scenario">
              <strong>Attack:</strong> A rogue student prints a fake marksheet with inflated grades and encodes a malicious QR code pointing to a clone verification domain.
            </p>
            <div className="threat-mitigation">
              <span className="mitigation-label"><CheckCircle2 size={16} /> VeriMark Defense:</span>
              <p>
                The browser verifies the Ed25519 digital signature against the hardcoded/pinned public key of the genuine institution. Foreign domains and malformed signatures are rejected before any marks are displayed.
              </p>
            </div>
          </Panel>

          <Panel className="threat-card">
            <div className="threat-header">
              <span className="chip red">Adversary Vector 03</span>
              <h3>Unilateral Grade Manipulation</h3>
            </div>
            <p className="threat-scenario">
              <strong>Attack:</strong> A single compromised administrator attempts to silently modify a student's grade without audit trails.
            </p>
            <div className="threat-mitigation">
              <span className="mitigation-label"><CheckCircle2 size={16} /> VeriMark Defense:</span>
              <p>
                VeriMark requires dual-signature approval. A proposal digest must be independently signed by two distinct authorized signers (Approver A and Approver B) before a new publication version is appended to the ledger.
              </p>
            </div>
          </Panel>

          <Panel className="threat-card">
            <div className="threat-header">
              <span className="chip red">Adversary Vector 04</span>
              <h3>Retroactive Record Erasure</h3>
            </div>
            <p className="threat-scenario">
              <strong>Attack:</strong> An institution attempts to erase a controversial past publication to hide historical errors or disputes.
            </p>
            <div className="threat-mitigation">
              <span className="mitigation-label"><CheckCircle2 size={16} /> VeriMark Defense:</span>
              <p>
                The ledger is append-only. When a revision is approved, it creates Version 2. Version 1 remains cryptographically valid as a <code>Verified historical / superseded</code> record with transparent timestamps.
              </p>
            </div>
          </Panel>
        </div>
      </section>

      <section className="assumptions-section">
        <h2>Trust Assumptions & Environmental Dependencies</h2>
        <div className="assumptions-grid">
          <Panel className="assumption-item">
            <div className="assumption-head">
              <KeyRound size={20} />
              <h3>Root Institutional Key Custody</h3>
            </div>
            <p>
              Security depends on the institution keeping its private Ed25519 signing keys in hardware security modules (HSMs) or air-gapped signing machines.
            </p>
          </Panel>

          <Panel className="assumption-item">
            <div className="assumption-head">
              <Lock size={20} />
              <h3>Browser Cryptography API</h3>
            </div>
            <p>
              Verification depends on a modern browser implementing the W3C Web Cryptography API standards with correct Ed25519 and SHA-256 algorithms.
            </p>
          </Panel>

          <Panel className="assumption-item">
            <div className="assumption-head">
              <UserCheck size={20} />
              <h3>Dual Signer Independence</h3>
            </div>
            <p>
              Correction governance relies on Approver A and Approver B having independent institutional credentials and separate cryptographic keys.
            </p>
          </Panel>
        </div>
      </section>

      <div className="page-bottom-actions">
        <Link to="/admin/integrity" className="btn">
          Explore Tamper Detection Lab <ArrowRight size={16} />
        </Link>
        <Link to="/verify" className="btn secondary">
          Open Verification <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
