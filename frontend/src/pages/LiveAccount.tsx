import { GraduationCap, KeyRound, ListChecks, LogIn, LogOut, Users } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Heading, Notice, Panel } from '../components/ui'
import { mockMode } from '../services/api'
import { apiBaseUrl, errorMessage } from '../services/http'
import { useSession } from '../services/session'
import type { Role } from '../services/wire'

const home = (role: Role) => role === 'STUDENT' ? '/student' : '/admin'
const demoAccounts = [
  [Users, 'Administrator', 'Staff workspace', '/admin'],
  [GraduationCap, 'Student', 'My exam results', '/student'],
  [KeyRound, 'Approver A', 'First approval', '/admin/corrections/CR-1043/review/first'],
  [KeyRound, 'Approver B', 'Second approval', '/admin/corrections/CR-1043/review/second'],
  [ListChecks, 'Auditor', 'Audit reports', '/admin/audit'],
] as const

function DemoAccounts() {
  return <Panel className="login-panel demo-picker">
    <h2>Demo accounts</h2>
    <p>Choose a role to explore sample records. No password is required.</p>
    <nav className="history" aria-label="Demo accounts">
      {demoAccounts.map(([Icon, role, destination, path]) => <a key={role} href={'/sample' + path}>
        <span className="account-icon"><Icon size={19} /></span><div><strong>{role}</strong><span>{destination}</span></div><LogIn size={18} aria-hidden="true" />
      </a>)}
    </nav>
  </Panel>
}

export function Login() {
  const { signedIn, expired, signIn } = useSession(), navigate = useNavigate()
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState('')
  const request = useRef<AbortController>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (request.current) return
    const data = new FormData(e.currentTarget), controller = new AbortController()
    request.current = controller; setBusy(true); setFailure('')
    try { const user = await signIn({ email: String(data.get('email')).trim(), password: String(data.get('password')) }, controller.signal); navigate(home(user.role), { replace: true }) }
    catch (error) { if (!controller.signal.aborted) setFailure(errorMessage(error)) }
    finally { request.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  if (signedIn) return <Navigate replace to={home(signedIn.user.role)} />
  return <div className="container subpage">
    <Heading eyebrow="INSTITUTION ACCESS" title="Sign in to VeriMark"
      detail={mockMode ? 'Choose a demo account to open its workspace.' : 'Use your institution account or explore a demo workspace.'} />
    {expired && <Notice>Your session expired. Sign in again to continue.</Notice>}
    <div className="signin-layout">
      {!mockMode && (apiBaseUrl ? <Panel className="login-panel">
        <h2>Institution account</h2>
        <form className="stack" onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
          {failure && <Notice error>{failure}</Notice>}
          <button disabled={busy} className="btn"><LogIn size={17} />{busy ? 'Signing in?' : 'Sign in'}</button>
        </form>
      </Panel> : <Notice>No live API has been configured.</Notice>)}
      <DemoAccounts />
    </div>
  </div>
}

export function RequireAccount({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { signedIn } = useSession()
  if (!signedIn) return apiBaseUrl ? <Navigate replace to="/login" /> : <section><Heading eyebrow="INSTITUTION ACCESS" title={roles.includes('STUDENT') ? 'Student portal unavailable' : 'Workspace unavailable'} detail="No live API has been configured." /><Notice>No records are shown.</Notice></section>
  if (!roles.includes(signedIn.user.role)) return <Notice error>This account cannot access this page. <Link className="inline-link" to={home(signedIn.user.role)}>Return to your workspace</Link></Notice>
  return children
}

export function SignOut() {
  const { signOut } = useSession(), navigate = useNavigate()
  return <button type="button" className="btn secondary compact" onClick={() => { signOut(); navigate('/login', { replace: true }) }}><LogOut size={16} /> Sign out</button>
}
