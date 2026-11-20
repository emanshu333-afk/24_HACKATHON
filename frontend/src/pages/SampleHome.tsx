import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Compass, FileText,
  Fingerprint, GraduationCap, History, KeyRound, ListChecks, ScanLine, Sparkles, Upload
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Chip, Heading } from '../components/ui'
import { corrections, demoReference } from '../services/demo'

const proposal = `/admin/corrections/${corrections[0].id}`

const sections = [
  {
    title: 'Access and publication',
    desc: 'Identity, student directories, and initial grade publication workflows.',
    screens: [
      { name: 'Institution sign-in', role: 'Account holder', to: '/login', icon: KeyRound },
      { name: 'My account', role: 'Student', to: '/account', icon: KeyRound },
      { name: 'Staff overview', role: 'Staff', to: '/admin', icon: BookOpen },
      { name: 'Student directory', role: 'Registrar', to: '/admin/students', icon: GraduationCap },
      { name: 'Exam directory', role: 'Registrar', to: '/admin/exams', icon: BookOpen },
      { name: 'Publish results', role: 'Administrator', to: '/admin/publish', icon: Upload },
      { name: 'Result directory', role: 'Registrar', to: '/admin/results', icon: BookOpen },
    ],
  },
  {
    title: 'Marks and receipts',
    desc: 'Student examination records, statements of marks, and public verification.',
    screens: [
      { name: 'Student portal', role: 'Student', to: '/student', icon: GraduationCap },
      { name: 'Result details', role: 'Staff', to: `/admin/results/${demoReference}`, icon: FileText },
      { name: 'Printable marksheet', role: 'Student', to: `/student/marksheet/${demoReference}`, icon: FileText },
      { name: 'Verify a receipt', role: 'Public', to: '/verify', icon: ScanLine },
    ],
  },
  {
    title: 'Corrections and oversight',
    desc: 'Dual-signature change control, forensic tamper lab, and ledger history.',
    screens: [
      { name: 'Correction proposals', role: 'Administrator and approvers', to: '/admin/corrections', icon: ClipboardCheck },
      { name: 'Correction detail', role: 'Staff', to: proposal, icon: FileText },
      { name: 'First approval', role: 'Approver A', to: proposal + '/review/first', icon: ClipboardCheck },
      { name: 'Second approval', role: 'Approver B', to: proposal + '/review/second', icon: ClipboardCheck },
      { name: 'Tamper detection lab', role: 'Auditor', to: '/admin/integrity', icon: Fingerprint },
      { name: 'Publication history', role: 'Staff', to: '/admin/history', icon: History },
      { name: 'Ledger explorer', role: 'Staff', to: '/admin/ledger', icon: Fingerprint },
      { name: 'Integrity audit', role: 'Auditor', to: '/admin/audit', icon: ListChecks },
    ],
  },
]

export function SampleHome() {
  return (
    <div className="container subpage directory-page">
      <Heading
        eyebrow="VERIMARK"
        title="Sample workspace"
        detail="Follow an exam result from publication to review. All records here are synthetic."
        action={
          <div className="actions">
            <Link className="btn" to="/sample/tour">
              <Compass size={17} /> Take 5-step guided tour
            </Link>
            <a className="btn secondary" href="/">
              Return to live site
            </a>
          </div>
        }
      />

      <div className="tour-teaser-card panel">
        <div className="tour-teaser-left">
          <span className="icon-tile highlight"><Sparkles size={22} /></span>
          <div>
            <h3>Evaluating VeriMark for the hackathon or audit?</h3>
            <p>
              Take the guided interactive tour that walks you through publication, marksheet printing, public verification, two-person correction approval, and database tamper detection.
            </p>
          </div>
        </div>
        <Link to="/sample/tour" className="btn secondary">
          Start tour <ArrowRight size={16} />
        </Link>
      </div>

      <div className="sample-sections">
        {sections.map(section => (
          <section key={section.title} className="panel sample-section-card">
            <div className="sample-section-header">
              <h2>{section.title}</h2>
              <p className="section-desc">{section.desc}</p>
            </div>
            <ul>
              {section.screens.map(({ name, role, to, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="sample-screen-link">
                    <Icon size={20} aria-hidden="true" />
                    <span>
                      <strong>{name}</strong>
                      <small>{role}</small>
                    </span>
                    <ArrowRight size={15} className="link-arrow" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
