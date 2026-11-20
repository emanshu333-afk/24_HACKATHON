import { ArrowRight, CheckCircle2, ChevronRight, Cpu, Eye, FileCheck, FileClock, Fingerprint, GitBranch, KeyRound, LockKeyhole, QrCode, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Chip, Heading, Notice, Panel } from '../components/ui'

export function HowItWorks() {
  return (
    <div className="container subpage editorial-page">
      <Heading
        eyebrow="SYSTEM ARCHITECTURE"
        title="How VeriMark Verification Works"
        detail="A technical guide to cryptographic commitments, append-only ledgers, Ed25519 signatures, and zero-login client-side verification."
        action={
          <Link to="/verify" className="btn">
            Try verification now <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="editorial-lead panel">
        <p>
          Conventional academic marksheets rely on paper watermarks or simple QR codes that point to an unauthenticated webpage. If an attacker controls the database, the hosting server, or intercepts network traffic, they can forge or tamper with marks undetected.
        </p>
        <p>
          VeriMark replaces blind institutional trust with <strong>verifiable cryptographic evidence</strong>. Every published mark is mathematically bound to a release commitment, signed by the university’s offline key, and recorded in an append-only ledger.
        </p>
      </div>

      <div className="architecture-grid">
        <Panel className="arch-card">
          <div className="arch-step-num">01</div>
          <div className="arch-icon"><Cpu size={24} /></div>
          <h3>Canonical Result Commitment</h3>
          <p>
            When examination marks are finalized, VeriMark normalizes the student ID, exam session, and subject scores into a canonical byte sequence and calculates its SHA-256 hash.
          </p>
          <code>Commitment = SHA256(studentId || examId || sortedMarks)</code>
          <p className="arch-note">
            Even a single altered digit produces an entirely different commitment, immediately signaling tampering.
          </p>
        </Panel>

        <Panel className="arch-card">
          <div className="arch-step-num">02</div>
          <div className="arch-icon"><KeyRound size={24} /></div>
          <h3>Ed25519 Institutional Signature</h3>
          <p>
            The institution signs the publication commitment using its private Ed25519 signing key. The corresponding public key is widely distributed and pinned across institutional registers.
          </p>
          <code>Signature = Ed25519_Sign(Private_Key, Commitment)</code>
          <p className="arch-note">
            The verification client uses the Web Cryptography API natively in the browser to confirm the signature without sending credentials to any server.
          </p>
        </Panel>

        <Panel className="arch-card">
          <div className="arch-step-num">03</div>
          <div className="arch-icon"><Fingerprint size={24} /></div>
          <h3>Append-Only Publication Ledger</h3>
          <p>
            Each publication is appended to a tamper-evident event log. Every block references the cryptographic hash of its predecessor, creating an unbroken chain of custody.
          </p>
          <code>Event_Hash = SHA256(Parent_Hash || Sequence || Event_Body)</code>
          <p className="arch-note">
            Past events cannot be retroactively modified or reordered without invalidating all downstream block hashes.
          </p>
        </Panel>

        <Panel className="arch-card">
          <div className="arch-step-num">04</div>
          <div className="arch-icon"><GitBranch size={24} /></div>
          <h3>Dual-Key Correction Governance</h3>
          <p>
            Mistakes happen, but silent database edits destroy trust. VeriMark enforces a strict 2-person rule: grade amendments require two distinct authorized signers.
          </p>
          <code>New_Version = Apply(Base_Version, Signer_A, Signer_B)</code>
          <p className="arch-note">
            The previous version remains fully visible as a valid historical record. History is never erased.
          </p>
        </Panel>

        <Panel className="arch-card">
          <div className="arch-step-num">05</div>
          <div className="arch-icon"><QrCode size={24} /></div>
          <h3>Cryptographic Marksheet QR</h3>
          <p>
            The printed marksheet contains a QR code encoding a signed verification receipt. Anyone with a smartphone camera can verify the marks directly on their device.
          </p>
          <code>Receipt = &#123; resultId, version, commitment, signature &#125;</code>
          <p className="arch-note">
            No login, student portal account, or proprietary app is required for verification.
          </p>
        </Panel>

        <Panel className="arch-card">
          <div className="arch-step-num">06</div>
          <div className="arch-icon"><Eye size={24} /></div>
          <h3>Zero-Trust Browser Verification</h3>
          <p>
            The browser executes all cryptographic verification checks independently using JavaScript and WebCrypto:
          </p>
          <ul className="arch-checklist">
            <li><CheckCircle2 size={16} /> Verifies Ed25519 digital signature</li>
            <li><CheckCircle2 size={16} /> Validates SHA-256 commitment hash</li>
            <li><CheckCircle2 size={16} /> Verifies Merkle checkpoint root</li>
            <li><CheckCircle2 size={16} /> Confirms ledger sequence integrity</li>
          </ul>
        </Panel>
      </div>

      <div className="honesty-section panel">
        <div className="honesty-header">
          <ShieldAlert size={26} className="honesty-icon" />
          <div>
            <h2>Cryptographic Truthfulness & Limitations</h2>
            <p>What cryptography proves — and what it does not.</p>
          </div>
        </div>

        <div className="honesty-grid">
          <div className="honesty-column proves">
            <h3>What VeriMark Proves</h3>
            <ul>
              <li>The published marks match the exact bytes signed by the institution.</li>
              <li>The publication was recorded at a specific ledger sequence number.</li>
              <li>Any subsequent correction was authorized by two separate signers with recorded justification.</li>
              <li>The marksheet in hand has not been altered since official release.</li>
            </ul>
          </div>
          <div className="honesty-column limitations">
            <h3>What Cryptography Cannot Prove</h3>
            <ul>
              <li>Whether the original grade entered by the professor was academically fair or accurate.</li>
              <li>Whether an institutional private key was securely stored offline without key compromise.</li>
              <li>Whether a student was rightfully enrolled without external institutional accreditation checks.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="page-bottom-actions">
        <Link to="/trust" className="btn secondary">
          Read Trust & Security Model <ChevronRight size={16} />
        </Link>
        <Link to="/verify" className="btn">
          Verify a Marksheet <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
