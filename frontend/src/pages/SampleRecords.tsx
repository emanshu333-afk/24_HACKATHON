import { Link, useParams } from 'react-router-dom'
import { Marks, Score } from '../components/marks'
import { Heading, Notice, Panel } from '../components/ui'
import { students } from '../services/demo'
import { useWorkspace } from '../services/workspace'
import { CorrectionDetail } from './Workflows'

export function SampleAccount() {
  const student = students[0]
  return <div className="container subpage">
    <Heading eyebrow="STUDENT ACCOUNT" title="My account" detail="Profile used for the sample student portal." />
    <Panel><h2>{student.name}</h2><dl className="sheet-meta">
      <div><dt>Student ID</dt><dd>{student.id}</dd></div>
      <div><dt>Programme</dt><dd>{student.programme}</dd></div>
      <div><dt>Role</dt><dd>Student</dd></div>
    </dl><Link className="btn secondary" to="/student">View exam results</Link></Panel>
  </div>
}

export function SampleResult() {
  const { id } = useParams()
  const { results } = useWorkspace()
  const result = results.find(record => record.ref === id)
  if (!result) return <Notice error>Sample result unavailable. <Link to="/admin/results">Browse results</Link></Notice>
  const versions = results.filter(record => record.student.id === result.student.id && record.exam.id === result.exam.id)
  return <>
    <Heading eyebrow="SAMPLE PUBLICATION" title="Result details" detail={result.student.name + ' · ' + result.exam.name} />
    <Panel><h2>Publication v{result.version}</h2><p><code>{result.ref}</code></p>
      <Marks marks={result.marks} /><Score marks={result.marks} />
    </Panel>
    <Panel><h2>Versions of this result</h2><ul>{versions.map(record => <li key={record.ref}>
      <Link to={'/admin/results/' + record.ref}>Version {record.version} · {record.current ? 'Current sample' : 'Historical sample'}</Link>
    </li>)}</ul></Panel>
  </>
}

export function SampleProposal() {
  const { id, stage } = useParams()
  const { corrections } = useWorkspace()
  const proposal = corrections.find(record => record.id === id)
  if (!proposal || (stage && !['first', 'second'].includes(stage))) return <Notice error>Sample review unavailable. <Link to="/admin/corrections">Browse proposals</Link></Notice>
  const base = '/admin/corrections/' + proposal.id
  const title = stage === 'first' ? 'First approval' : stage === 'second' ? 'Second approval' : 'Correction detail'
  return <>
    <Heading eyebrow="SAMPLE CORRECTION" title={title} detail={stage ? 'Review the proposed marks and the reason before signing in the live workflow.' : 'Inspect the proposed change and both review stages.'} />
    <Panel><CorrectionDetail correction={proposal} />
      {stage && <p>{stage === 'first' ? 'Approver A signs the digest of this exact proposal.' : 'Approver B must be a different signer and sign the same proposal digest.'}</p>}
      <nav className="actions" aria-label="Proposal review">
        {stage && <Link className="btn secondary" to={base}>Correction detail</Link>}
        {stage !== 'first' && <Link className="btn secondary" to={base + '/review/first'}>First approval</Link>}
        {stage !== 'second' && <Link className="btn secondary" to={base + '/review/second'}>Second approval</Link>}
      </nav>
    </Panel>
  </>
}
