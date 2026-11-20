import { CheckCircle2, ChevronDown, Fingerprint, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Marks } from './marks'
import { Chip, CopyableCode, Panel } from './ui'
import type { Verification } from '../services/model'

const statuses = {
  current: ['Verified current', 'green'],
  historical: ['Verified historical / superseded', 'teal'],
  invalid: ['Invalid / tampered', 'red'],
  unavailable: ['Verification unavailable', 'amber']
} as const

const explanations: Record<string, string> = {
  FORGED_RECEIPT: 'The receipt signature does not match the trusted signing key.',
  RESULT_COMMITMENT_MISMATCH: 'The result data no longer matches its recorded commitment.',
  DISPLAYED_RESULT_MISMATCH: 'The returned marks differ from the signed publication.',
  INVALID_EVENT_SIGNATURE: 'A ledger event signature did not verify.',
  INVALID_APPROVAL: 'A correction approval signature did not verify.',
  INCOMPLETE_CHAIN: 'The supplied history does not reach its declared checkpoint.',
  BROKEN_LINK: 'A ledger event does not link to its expected predecessor.',
  INVALID_CHECKPOINT_SIGNATURE: 'The checkpoint signature did not verify.',
  CHECKPOINT_HEAD_MISMATCH: 'The checkpoint does not match the end of the supplied ledger.',
  MISSING_EVIDENCE: 'The response did not include a ledger and checkpoint to check.',
  WEBCRYPTO_UNAVAILABLE: 'Browser cryptography is unavailable in this context.',
  ED25519_UNAVAILABLE: 'This browser does not support the required Ed25519 checks.',
}

export function Evidence({ proof, reference }: { proof: Verification; reference?: string }) {
  const [title, tone] = statuses[proof.status]
  const verified = proof.status === 'current' || proof.status === 'historical'
  const isInvalid = proof.status === 'invalid'
  const technical = verified ? proof.evidence : undefined
  const failures = [...new Set(proof.failures)]
  const hasDemoMarks = !!reference && proof.status === 'unavailable' && !!proof.exam

  const StatusIcon = verified ? ShieldCheck : isInvalid ? ShieldAlert : Fingerprint

  return (
    <Panel className={`evidence outcome-${proof.status}`}>
      <div className="section-head">
        <span className={`icon-tile ${tone}`} aria-hidden="true">
          <StatusIcon size={22} />
        </span>
        <div className="outcome-meta">
          <div className="outcome-meta-top">
            <h2>Verification outcome</h2>
            <Chip tone={tone}>{title}</Chip>
          </div>
          <p role="status">
            <span className="sr-only">{title}. </span>
            {proof.reason}
          </p>
        </div>
      </div>

      {(reference || proof.resultId || proof.version !== undefined) && (
        <dl className="evidence-summary">
          {(reference || proof.resultId) && (
            <div>
              <dt>{reference ? 'Publication reference' : 'Result ID'}</dt>
              <dd>
                <CopyableCode value={reference ?? proof.resultId!} truncate={false} label="publication reference" />
              </dd>
            </div>
          )}
          {proof.version !== undefined && (
            <div>
              <dt>Publication version</dt>
              <dd className="version-info">
                <strong>v{proof.version}</strong>
                {proof.exam && <span className="exam-tag">· {proof.exam}</span>}
              </dd>
            </div>
          )}
        </dl>
      )}

      {failures.length > 0 && (
        <div className="verification-failures">
          <ul className="evidence-list" aria-label="Verification findings">
            {failures.map(code => (
              <li key={code} className="failure-item">
                <div>
                  <strong>{explanations[code] ?? 'The verifier reported an evidence problem.'}</strong>
                  <span><code>{code}</code></span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verified && (
        <div className="verification-pill-bar">
          <span className="trust-badge">
            <KeyRound size={13} aria-hidden="true" /> Ed25519 Signed
          </span>
          <span className="trust-badge">
            <ShieldCheck size={13} aria-hidden="true" /> Merkle Head Verified
          </span>
          <span className="trust-badge">
            <CheckCircle2 size={13} aria-hidden="true" /> Unbroken Ledger Chain
          </span>
        </div>
      )}

      {(verified || hasDemoMarks) && proof.marks && (
        <div className="evidence-marks-section">
          <h3>{verified ? 'Published marks' : 'Unverified example marks'}</h3>
          <Marks marks={proof.marks} />
        </div>
      )}

      <details className="evidence-inspector">
        <summary>
          <span>Inspect evidence and trust assumptions</span>
          <ChevronDown size={16} className="summary-chevron" aria-hidden="true" />
        </summary>
        <ol className="evidence-list">
          {proof.checks.map(check => (
            <li key={check.label}>
              <div>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
              </div>
              <Chip tone={check.state === 'passed' ? 'green' : check.state === 'failed' ? 'red' : 'neutral'}>
                {check.state}
              </Chip>
            </li>
          ))}
        </ol>
        {technical && (
          <dl className="evidence-summary technical-values">
            <div>
              <dt>Signature algorithm</dt>
              <dd>Ed25519</dd>
            </div>
            <div>
              <dt>Checkpoint sequence</dt>
              <dd>#{technical.checkpointSequence ?? 'Unavailable'}</dd>
            </div>
            <div className="full-col">
              <dt>Signing key fingerprint (SHA-256)</dt>
              <dd>
                <CopyableCode value={technical.keyFingerprint} truncate label="key fingerprint" />
              </dd>
            </div>
            <div className="full-col">
              <dt>Result commitment (SHA-256)</dt>
              <dd>
                <CopyableCode value={technical.commitment} truncate label="commitment hash" />
              </dd>
            </div>
            <div>
              <dt>Checkpoint time (institution assertion)</dt>
              <dd>{proof.checkedAt ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Latest version in checkpoint</dt>
              <dd>{technical.latestVersion ?? 'Unavailable'}</dd>
            </div>
          </dl>
        )}
        <p className="trust-footnote">
          {technical
            ? 'No independent freshness witness is configured. The signed checkpoint does not prove that the original marks were entered correctly.'
            : 'A reference or QR link can locate a record, but it cannot establish authenticity without trusted evidence.'}
        </p>
      </details>
    </Panel>
  )
}
