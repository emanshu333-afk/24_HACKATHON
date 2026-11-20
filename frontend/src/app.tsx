import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { AdminLayout, Exams, Overview, Results, Students } from './pages/Admin'
import { Audit, Integrity } from './pages/Audit'
import { sampleBase } from './services/sample'
import { SampleAccount, SampleResult, SampleProposal } from './pages/SampleRecords'
import { SampleHome } from './pages/SampleHome'
import { Landing, PublicLayout } from './pages/Public'
import { HowItWorks } from './pages/HowItWorks'
import { TrustModel } from './pages/TrustModel'
import { Tour } from './pages/Tour'
import { Marksheet, Student } from './pages/Student'
import { Verify } from './pages/Verify'
import { mockMode } from './services/api'
import { SessionProvider } from './services/session'
import { Login, RequireAccount } from './pages/LiveAccount'
import { LiveDirectory, LiveHistory, LiveMarksheet, LiveResults } from './pages/LiveResults'
import { Loading } from './components/ui'
import { RouteFailure } from './components/RouteFailure'

const Publish = lazy(() => import('./pages/Workflows').then(module => ({ default: module.Publish })))
const Corrections = lazy(() => import('./pages/Workflows').then(module => ({ default: module.Corrections })))
const LiveAudit = lazy(() => import('./pages/LiveWorkflows').then(module => ({ default: module.LiveAudit })))
const LiveLedger = lazy(() => import('./pages/LiveWorkflows').then(module => ({ default: module.LiveLedger })))
const LiveCorrections = lazy(() => import('./pages/LiveWorkflows').then(module => ({ default: module.LiveCorrections })))
const LivePublish = lazy(() => import('./pages/LiveWorkflows').then(module => ({ default: module.LivePublish })))

function NotFound() { return <div className="container subpage"><h1>Page not found</h1><Link className="btn" to="/">Return home</Link></div> }

export function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <SessionProvider>
      <a className="skip-link no-print" href="#main">Skip to content</a>
      <RouteFailure route={pathname}>
        <Suspense fallback={<main id="main" className="container subpage"><Loading>Loading workspace page…</Loading></main>}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={sampleBase ? <SampleHome /> : <Landing />} />
              <Route path="verify" element={<Verify />} />
              <Route path="how-verification-works" element={<HowItWorks />} />
              <Route path="trust" element={<TrustModel />} />
              <Route path="sample/tour" element={<Tour />} />
              <Route path="tour" element={<Tour />} />
              <Route path="login" element={<Login />} />
              {mockMode && <Route path="account" element={<SampleAccount />} />}
              <Route path="student" element={mockMode ? <Student /> : <LiveResults student />} />
              <Route path="student/marksheet/:ref" element={<Marksheet />} />
              {!mockMode && (
                <>
                  <Route path="student/results/:id" element={<LiveHistory student />} />
                  <Route path="student/marksheet/:id/:version" element={<LiveMarksheet />} />
                </>
              )}
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route
              path="admin"
              element={
                mockMode
                  ? <AdminLayout />
                  : <RequireAccount roles={['ADMIN', 'AUDITOR', 'APPROVER']}><AdminLayout /></RequireAccount>
              }
            >
              <Route index element={mockMode ? <Overview /> : <LiveResults overview />} />
              <Route path="students" element={mockMode ? <Students /> : <LiveDirectory students />} />
              <Route path="exams" element={mockMode ? <Exams /> : <LiveDirectory />} />
              {mockMode && (
                <>
                  <Route path="results/:id" element={<SampleResult />} />
                  <Route path="corrections/:id" element={<SampleProposal />} />
                  <Route path="corrections/:id/review/:stage" element={<SampleProposal />} />
                </>
              )}
              <Route path="results" element={mockMode ? <Results key="results" /> : <LiveResults />} />
              <Route path="publish" element={mockMode ? <Publish /> : <RequireAccount roles={['ADMIN']}><LivePublish /></RequireAccount>} />
              <Route path="history" element={mockMode ? <Results key="history" history /> : <LiveResults history />} />
              <Route path="ledger" element={mockMode ? <Audit key="ledger" ledger /> : <LiveLedger />} />
              <Route path="corrections" element={mockMode ? <Corrections /> : <LiveCorrections />} />
              <Route path="integrity" element={mockMode ? <Integrity /> : <RequireAccount roles={['ADMIN', 'AUDITOR']}><LiveAudit key="lab" lab /></RequireAccount>} />
              <Route path="audit" element={mockMode ? <Audit key="audit" /> : <RequireAccount roles={['ADMIN', 'AUDITOR']}><LiveAudit key="audit" /></RequireAccount>} />
              {!mockMode && (
                <>
                  <Route path="results/:id" element={<LiveHistory />} />
                  <Route path="marksheet/:id/:version" element={<LiveMarksheet staff />} />
                </>
              )}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </RouteFailure>
    </SessionProvider>
  )
}