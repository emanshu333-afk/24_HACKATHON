import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { AdminLayout, Exams, Overview, Results, Students } from './pages/Admin'
import { Audit, Integrity } from './pages/Audit'
import { Landing, PublicLayout } from './pages/Public'
import { Marksheet, Student } from './pages/Student'
import { Verify } from './pages/Verify'
import { Corrections, Publish } from './pages/Workflows'
import { mockMode } from './services/api'
import { SessionProvider } from './services/session'
import { Login, RequireAccount } from './pages/LiveAccount'
import { LiveDirectory, LiveHistory, LiveMarksheet, LiveResults } from './pages/LiveResults'
import { LiveAudit, LiveCorrections, LiveLedger, LivePublish } from './pages/LiveWorkflows'

function NotFound() { return <div className="container subpage"><h1>Page not found</h1><Link className="btn" to="/">Return home</Link></div> }
export function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <SessionProvider><a className="skip-link no-print" href="#main">Skip to content</a><Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<Landing />} /><Route path="verify" element={<Verify />} /><Route path="login" element={<Login />} />
      <Route path="student" element={mockMode ? <Student /> : <LiveResults student />} />
      <Route path="student/marksheet/:ref" element={<Marksheet />} />
      {!mockMode && <><Route path="student/results/:id" element={<LiveHistory student />} /><Route path="student/marksheet/:id/:version" element={<LiveMarksheet />} /></>}
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="admin" element={<AdminLayout />}>
      <Route index element={mockMode ? <Overview /> : <LiveResults overview />} />
      <Route path="students" element={mockMode ? <Students /> : <LiveDirectory students />} />
      <Route path="exams" element={mockMode ? <Exams /> : <LiveDirectory />} />
      <Route path="results" element={mockMode ? <Results key="results" /> : <LiveResults />} />
      <Route path="publish" element={mockMode ? <Publish /> : <RequireAccount roles={['ADMIN']}><LivePublish /></RequireAccount>} />
      <Route path="history" element={mockMode ? <Results key="history" history /> : <LiveResults history />} />
      <Route path="ledger" element={mockMode ? <Audit key="ledger" ledger /> : <LiveLedger />} />
      <Route path="corrections" element={mockMode ? <Corrections /> : <LiveCorrections />} />
      <Route path="integrity" element={mockMode ? <Integrity /> : <RequireAccount roles={['ADMIN', 'AUDITOR']}><LiveAudit key="lab" lab /></RequireAccount>} />
      <Route path="audit" element={mockMode ? <Audit key="audit" /> : <RequireAccount roles={['ADMIN', 'AUDITOR']}><LiveAudit key="audit" /></RequireAccount>} />
      {!mockMode && <><Route path="results/:id" element={<LiveHistory />} /><Route path="marksheet/:id/:version" element={<LiveMarksheet staff />} /></>}
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes></SessionProvider>
}
