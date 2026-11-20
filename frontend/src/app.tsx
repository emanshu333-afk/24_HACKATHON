import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { AdminLayout, Exams, Overview, Results, Students } from './pages/Admin'
import { Audit, Integrity } from './pages/Audit'
import { Landing, PublicLayout } from './pages/Public'
import { Marksheet, Student } from './pages/Student'
import { Verify } from './pages/Verify'
import { Corrections, Publish } from './pages/Workflows'

function NotFound() { return <div className="container subpage"><h1>Page not found</h1><Link className="btn" to="/">Return home</Link></div> }
export function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <><a className="skip-link no-print" href="#main">Skip to content</a><Routes><Route element={<PublicLayout />}><Route index element={<Landing />} /><Route path="verify" element={<Verify />} /><Route path="student" element={<Student />} /><Route path="student/marksheet/:ref" element={<Marksheet />} /><Route path="*" element={<NotFound />} /></Route><Route path="admin" element={<AdminLayout />}><Route index element={<Overview />} /><Route path="students" element={<Students />} /><Route path="exams" element={<Exams />} /><Route path="results" element={<Results key="results" />} /><Route path="publish" element={<Publish />} /><Route path="history" element={<Results key="history" history />} /><Route path="ledger" element={<Audit key="ledger" ledger />} /><Route path="corrections" element={<Corrections />} /><Route path="integrity" element={<Integrity />} /><Route path="audit" element={<Audit key="audit" />} /><Route path="*" element={<NotFound />} /></Route></Routes></>
}
