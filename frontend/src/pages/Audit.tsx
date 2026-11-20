import { ArrowRight, CheckCircle2, Copy, FileText, Fingerprint, Layers, ScanSearch, ShieldAlert, ShieldCheck, Sparkles, Terminal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, CopyableCode, DataTable, Heading, Notice, Panel } from '../components/ui'
import { demoReference } from '../services/demo'

const events = [
  { sequence: 104, type: 'Integrity finding', ref: demoReference, date: '16 Jun 2026', evidence: 'Field mismatch · marks.dataStructures', hash: '8a9df031c2e43187b5a1902c' },
  { sequence: 103, type: 'Correction', ref: 'VM-SP26-023-V2', date: '15 Jun 2026', evidence: 'CR-1042 · Version 2 example', hash: '5f3c1290e84b7218ca83910f' },
  { sequence: 102, type: 'Publication', ref: demoReference, date: '12 Jun 2026', evidence: 'Version 1 · Publication example', hash: 'd91a7834bc501239aa8091ef' },
  { sequence: 101, type: 'Publication', ref: 'VM-SP26-023-V1', date: '12 Jun 2026', evidence: 'Version 1 · Superseded example', hash: 'b12e9874cb3091823f9018aa' },
]

export function Audit({ ledger = false }: { ledger?: boolean }) {
  return (
    <>
      <Heading
        eyebrow="AUDITOR VIEW"
        title={ledger ? 'Ledger explorer' : 'Audit reports'}
        detail={
          ledger
            ? 'Inspect the illustrated event sequence for publications and corrections.'
            : 'Search sample findings by result reference, field, or event identifier.'
        }
      />

      <Notice tone="info">
        Example events only. No signatures, checkpoint, or hash relationships have been verified.
      </Notice>

      <div className="ledger-metrics-strip">
        <Panel className="ledger-stat-card">
          <div className="stat-head"><span className="dot teal" /> Event stream</div>
          <strong>{events.length} sample blocks</strong>
          <span>Sequential ledger sequence</span>
        </Panel>
        <Panel className="ledger-stat-card">
          <div className="stat-head"><span className="dot green" /> Cryptography</div>
          <strong>SHA-256 Hash Chained</strong>
          <span>Append-only integrity</span>
        </Panel>
        <Panel className="ledger-stat-card">
          <div className="stat-head"><span className="dot amber" /> Checkpoint</div>
          <strong>Offline Demo</strong>
          <span>Synthetic evidence</span>
        </Panel>
      </div>

      <DataTable
        label={ledger ? 'Ledger events' : 'Audit events'}
        rows={ledger ? events.filter(e => e.type !== 'Integrity finding') : events}
        rowKey={e => String(e.sequence)}
        search={e => `EVT-${e.sequence} ${e.ref} ${e.type} ${e.evidence}`}
        filters={{
          name: 'Event category',
          options: ledger ? ['Publication', 'Correction'] : ['Publication', 'Correction', 'Integrity finding'],
          value: e => e.type,
        }}
        columns={[
          {
            label: 'Sample event',
            display: e => <code className="sequence-badge">EVT-{e.sequence}</code>,
          },
          {
            label: 'Result reference',
            display: e => <code>{e.ref}</code>,
          },
          {
            label: 'Category',
            display: e => (
              <Chip tone={e.type === 'Integrity finding' ? 'red' : e.type === 'Correction' ? 'amber' : 'neutral'}>
                {e.type}
              </Chip>
            ),
          },
          {
            label: 'Finding / evidence',
            display: e =>
              e.type === 'Integrity finding' ? (
                <Link className="inline-link" to="/admin/integrity">
                  {e.evidence}
                </Link>
              ) : (
                e.evidence
              ),
          },
          {
            label: 'Checkpoint',
            display: () => <span className="muted">Not available</span>,
          },
          {
            label: 'Date (UTC)',
            display: e => <span className="timestamp-cell">{e.date}</span>,
          },
        ]}
      />
    </>
  )
}

const scenarios = {
  mark: {
    title: 'Changed subject mark',
    field: 'marks.dataStructures',
    published: '85',
    snapshot: '95',
    detail: 'A score changed outside the correction workflow. This comparison illustrates the discrepancy an audit should explain.',
  },
  unchanged: {
    title: 'Unmodified sample record',
    field: 'marks.dataStructures',
    published: '85',
    snapshot: '85',
    detail: 'The compared field agrees. A matching value alone does not establish that the underlying ledger is authentic.',
  },
  exam: {
    title: 'Changed examination reference',
    field: 'examId',
    published: 'EX-26-SP',
    snapshot: 'EX-26-SU',
    detail: 'A published result is tied to a specific exam. An unexpected exam reference changes the record even when marks are unchanged.',
  },
  missing: {
    title: 'Missing publication evidence',
    field: 'checkpoint',
    published: null,
    snapshot: null,
    detail: 'There is no signed checkpoint to compare. Missing evidence does not establish tampering.',
  },
} as const

export function Integrity() {
  const [selected, setSelected] = useState<keyof typeof scenarios>('mark'),
    [compared, setCompared] = useState(false)
  const scenario = scenarios[selected]
  const comparable = scenario.published !== null && scenario.snapshot !== null
  const mismatch = comparable && scenario.published !== scenario.snapshot

  return (
    <>
      <Heading
        eyebrow="INTEGRITY MONITORING"
        title="Tamper Detection Lab"
        detail="Compare synthetic records and learn what an integrity finding can and cannot tell you."
      />

      <Notice tone="warning">
        <strong>MOCK DEMO</strong> · Every scenario uses fixed fixtures. No database is changed and no live audit is run.
      </Notice>

      <div className="lab-grid">
        <Panel className="lab-compare">
          <div className="section-head">
            <span className="icon-tile" aria-hidden="true">
              <ScanSearch size={23} />
            </span>
            <div>
              <h2>Compare the result</h2>
              <p>
                Sample publication <code>{demoReference}</code>
              </p>
            </div>
          </div>

          <label>
            Sample scenario
            <select
              value={selected}
              onChange={e => {
                const value = e.target.value
                if (Object.hasOwn(scenarios, value)) {
                  setSelected(value as keyof typeof scenarios)
                  setCompared(false)
                }
              }}
            >
              {Object.entries(scenarios).map(([id, item]) => (
                <option key={id} value={id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <div className="comparison">
            <div className="comparison-side published">
              <span className="comparison-label">Published record</span>
              <strong className="scenario-value">
                {scenario.published ?? 'Unavailable'}
                {(selected === 'mark' || selected === 'unchanged') && <small> / 100</small>}
              </strong>
              <span className="fixture-tag">Original fixture</span>
            </div>

            <div className="comparison-divider" aria-hidden="true">
              <ArrowRight size={22} />
            </div>

            <div className={`comparison-side snapshot ${compared && mismatch ? 'mismatch' : ''}`}>
              <span className="comparison-label">Snapshot</span>
              <strong className="scenario-value">
                {scenario.snapshot ?? 'Unavailable'}
                {(selected === 'mark' || selected === 'unchanged') && <small> / 100</small>}
              </strong>
              <span className="fixture-tag">Comparison fixture</span>
            </div>
          </div>

          <div className="lab-actions">
            <button className="btn" onClick={() => setCompared(!compared)}>
              <ScanSearch size={18} />
              {compared ? 'Reset comparison' : 'Compare sample records'}
            </button>
          </div>

          {compared && (
            <div className={`finding ${mismatch ? '' : 'finding-neutral'}`} role="status">
              <ShieldAlert size={20} aria-hidden="true" />
              <div>
                <strong>
                  {!comparable
                    ? 'Comparison unavailable'
                    : mismatch
                    ? 'Mock finding: field mismatch'
                    : 'No sample mismatch'}
                </strong>
                {comparable && (
                  <p>
                    <code>{scenario.field}</code> · Expected {scenario.published}, found {scenario.snapshot}.
                  </p>
                )}
                <p>{scenario.detail}</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="lab-checklist-card">
          <div className="section-head">
            <span className="icon-tile" aria-hidden="true">
              <Fingerprint size={22} />
            </span>
            <div>
              <h2>Evidence checklist</h2>
              <p>Checks a live audit or verifier would need</p>
            </div>
          </div>
          <ul className="evidence-list">
            {[
              { label: 'Result commitment', detail: 'SHA-256 digest of student, exam and marks' },
              { label: 'Ledger event authenticity', detail: 'Sequential parent hash verification' },
              { label: 'Digital signatures', detail: 'Ed25519 signature by institutional authority' },
              { label: 'Signed checkpoint', detail: 'Merkle tree root commitment' },
            ].map(({ label, detail }) => (
              <li key={label}>
                <div>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
                <Chip tone="neutral">Not checked</Chip>
              </li>
            ))}
          </ul>
          <Link className="inline-link" to={`/verify?ref=${demoReference}`}>
            Open sample evidence inspector <ArrowRight size={16} />
          </Link>
        </Panel>
      </div>

      <div className="student-grid">
        <Panel className="lab-timeline-card">
          <h2>Follow the audit trail</h2>
          <ol className="timeline">
            <li>
              <strong>EVT-102 · Original sample release</strong>
              <span>85 published for Data Structures</span>
            </li>
            <li className="tamper-event">
              <strong>Illustrated out-of-band change</strong>
              <span>Snapshot shows 95 for the same field</span>
            </li>
            <li>
              <strong>EVT-104 · Sample audit event</strong>
              <span>Field mismatch associated with {demoReference}</span>
            </li>
          </ol>
          <Link className="inline-link" to="/admin/audit">
            Open audit reports <ArrowRight size={16} />
          </Link>
        </Panel>

        <Panel className="lab-contrast-card">
          <h2>How a legitimate change differs</h2>
          <p>
            An authorized correction records a reason and two distinct signatures, then publishes a new version without erasing the old one.
          </p>
          <p>
            Separate sample <code>CR-1042</code> illustrates the transition from v1 to v2.
          </p>
          <Link className="inline-link" to="/admin/corrections?id=CR-1042">
            See example correction history <ArrowRight size={16} />
          </Link>
        </Panel>
      </div>
    </>
  )
}
