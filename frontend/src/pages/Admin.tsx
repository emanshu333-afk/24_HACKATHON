import { useEffect, useState } from 'react'
import {
  Activity, ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, Command,
  FileClock, FileText, Fingerprint, GraduationCap, LayoutDashboard, ListChecks,
  PanelLeftClose, PanelLeftOpen, Plus, ShieldAlert, ShieldCheck, Sparkles, Upload, Users
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brand, Chip, CommandPalette, DataTable, Heading, Notice, Panel } from '../components/ui'
import { mockMode } from '../services/api'
import { exams, students } from '../services/demo'
import { formatDate, percent } from '../services/model'
import { DemoWorkspace, useWorkspace } from '../services/workspace'
import { useSession } from '../services/session'
import { RequireAccount, SignOut } from './LiveAccount'

type NavItem = readonly [path: string, label: string, icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>]
interface NavGroup {
  category: string
  items: readonly NavItem[]
}

const navGroups: readonly NavGroup[] = [
  {
    category: 'Overview',
    items: [
      ['', 'Overview', LayoutDashboard],
    ],
  },
  {
    category: 'Academic records',
    items: [
      ['students', 'Students', Users],
      ['exams', 'Exams', GraduationCap],
      ['results', 'Results', ListChecks],
      ['publish', 'Publish results', Upload],
      ['history', 'Publication history', FileClock],
    ],
  },
  {
    category: 'Governance',
    items: [
      ['corrections', 'Corrections', ClipboardCheck],
    ],
  },
  {
    category: 'Integrity',
    items: [
      ['ledger', 'Ledger explorer', Fingerprint],
      ['integrity', 'Tamper Detection Lab', ShieldAlert],
      ['audit', 'Audit reports', FileText],
    ],
  },
]

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const role = useSession().signedIn?.user.role
  const { pathname } = useLocation()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filterItem = (path: string) => {
    if (mockMode) return true
    if (path === 'publish') return role === 'ADMIN'
    if (['audit', 'integrity'].includes(path)) return role === 'ADMIN' || role === 'AUDITOR'
    return true
  }

  const allNavItems = navGroups.flatMap(g => g.items)
  const visible = allNavItems.filter(([path]) => filterItem(path))
  const current = visible.find(([path]) => (path ? pathname.split('/')[2] === path : pathname === '/admin'))?.[1] ?? 'Staff workspace'

  const links = visible.map(([path, label, Icon]) => (
    <NavLink
      key={label}
      to={path ? `/admin/${path}` : '/admin'}
      end={!path}
      title={label}
      aria-label={label}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  ))

  return (
    <div className={collapsed ? 'workspace rail' : 'workspace'}>
      <aside className="sidebar no-print">
        <div className="sidebar-heading">
          <Brand />
          <button
            type="button"
            className="rail-toggle"
            aria-label={collapsed ? 'Expand staff navigation' : 'Collapse staff navigation'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <p>STAFF WORKSPACE</p>

        {/* Desktop Grouped Navigation */}
        <nav className="desktop-workspace-nav" aria-label="Workspace navigation">
          {navGroups.map(group => {
            const groupVisible = group.items.filter(([path]) => filterItem(path))
            if (!groupVisible.length) return null
            return (
              <div key={group.category} className="nav-group-section">
                {!collapsed && <span className="nav-group-title">{group.category}</span>}
                {groupVisible.map(([path, label, Icon]) => (
                  <NavLink
                    key={label}
                    to={path ? `/admin/${path}` : '/admin'}
                    end={!path}
                    title={label}
                    aria-label={label}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Mobile Navigation Dropdown (preserves exact test selectors) */}
        <details className="mobile-workspace-nav" key={pathname}>
          <summary>
            Workspace menu <span>· {current}</span>
          </summary>
          <nav aria-label="Workspace navigation">
            {links}
            <Link to="/verify">
              Public verification <ArrowRight size={15} />
            </Link>
          </nav>
        </details>

        <div className="sidebar-footer-links">
          <button
            type="button"
            className="sidebar-command-btn"
            onClick={() => setPaletteOpen(true)}
            aria-label="Quick jump (Ctrl+K)"
          >
            <Command size={15} aria-hidden="true" />
            <span>Quick search (⌘K)</span>
          </button>
          <Link className="sidebar-bottom" aria-label="Public verification" title="Public verification" to="/verify">
            <span>Public verification</span> <ArrowRight size={15} />
          </Link>
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="workspace-main">
        <div className="workspace-top no-print">
          <div className="workspace-top-left">
            <span className="current-location">
              <Activity size={17} aria-hidden="true" /> {current}
            </span>
          </div>

          <div className="workspace-top-right">
            <button
              type="button"
              className="topbar-search-btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Quick jump"
            >
              <Command size={14} aria-hidden="true" />
              <span>Jump to…</span>
              <kbd>⌘K</kbd>
            </button>

            {!mockMode && role ? (
              <div className="actions">
                <Chip tone="teal">{role}</Chip>
                <SignOut />
              </div>
            ) : (
              <div className="actions">
                <Chip tone={mockMode ? 'amber' : 'neutral'}>
                  {mockMode ? 'Demo workspace' : 'Signed out'}
                </Chip>
              </div>
            )}
          </div>
        </div>

        <div className="workspace-body">
          {mockMode ? (
            <DemoWorkspace>
              <Outlet />
            </DemoWorkspace>
          ) : (
            <RequireAccount roles={['ADMIN', 'APPROVER', 'AUDITOR']}>
              <Outlet />
            </RequireAccount>
          )}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

export function Overview() {
  const { results, corrections } = useWorkspace()
  const pendingCorrections = corrections.filter(c => c.state === 'pending')

  const metrics = [
    { icon: Users, label: 'Demo students', total: students.length, tone: 'neutral', trend: 'Active roster' },
    { icon: BookOpen, label: 'Exam sessions', total: exams.length, tone: 'neutral', trend: 'Current term' },
    { icon: FileClock, label: 'Publication versions', total: results.length, tone: 'teal', trend: 'All committed' },
    { icon: ClipboardCheck, label: 'Pending proposals', total: pendingCorrections.length, tone: pendingCorrections.length ? 'amber' : 'green', trend: 'Requires dual-sign' },
  ] as const

  return (
    <>
      <Heading
        eyebrow="STAFF WORKSPACE"
        title="Integrity overview"
        detail="Manage exam publications, review correction proposals, and inspect integrity findings."
        action={
          <Link to="/admin/publish" className="btn">
            <Plus size={19} /> Publish results
          </Link>
        }
      />

      <div className="metric-grid">
        {metrics.map(({ icon: Icon, label, total, tone, trend }) => (
          <Panel className="metric" key={label}>
            <div className="metric-header">
              <span className="icon-tile" aria-hidden="true"><Icon size={20} /></span>
              <span className={`metric-trend ${tone}`}>{trend}</span>
            </div>
            <strong>{total}</strong>
            <span className="metric-label">{label}</span>
          </Panel>
        ))}
      </div>

      <div className="review-queue">
        <div className="review-queue-title">
          <ClipboardCheck size={22} aria-hidden="true" />
          <h2>Awaiting approval</h2>
        </div>
        {pendingCorrections.map(c => (
          <Link key={c.id} to={`/admin/corrections/${c.id}`} className="queue-item">
            <span className="queue-item-meta">
              <strong>{c.subject}</strong>
              <small>{c.id} · {c.reviewSteps} of 2 reviews</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ))}
        {pendingCorrections.length === 0 && (
          <span className="queue-empty-note">
            <CheckCircle2 size={16} /> All correction proposals have been resolved.
          </span>
        )}
      </div>

      <div className="student-grid">
        <Panel className="recent-pub-panel">
          <div className="panel-title-row">
            <h2>Recent publications</h2>
            <Link to="/admin/history" className="view-all-link">
              View all history <ArrowRight size={14} />
            </Link>
          </div>
          <div className="history">
            {[...results]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 4)
              .map(r => (
                <Link key={r.ref} to={`/admin/results/${r.ref}`} className="history-row">
                  <div>
                    <strong>{r.exam.name} · {r.student.name}</strong>
                    <span><code>{r.ref}</code> · {formatDate(r.date)}</span>
                  </div>
                  <Chip tone={r.current ? 'teal' : 'neutral'}>v{r.version}</Chip>
                </Link>
              ))}
          </div>
        </Panel>

        <Panel className="integrity-spotlight-panel">
          <span className="icon-tile alert" aria-hidden="true"><ShieldAlert size={22} /></span>
          <h2>Investigate an integrity finding</h2>
          <p>
            Walk through a labeled scenario: compare a published score of 85 with a database snapshot showing 95. Understand how Merkle checkpoints expose uncommitted modifications.
          </p>
          <div className="spotlight-actions">
            <Link to="/admin/integrity" className="btn secondary compact">
              Open Tamper Detection Lab <ArrowRight size={16} />
            </Link>
          </div>
        </Panel>
      </div>
    </>
  )
}

export function Students() {
  return (
    <>
      <Heading
        eyebrow="REGISTRAR"
        title="Students"
        detail="Search synthetic student records by name, identifier, or programme."
      />
      <DataTable
        label="Students"
        rows={students}
        rowKey={s => s.id}
        search={s => `${s.id} ${s.name} ${s.programme}`}
        filters={{ name: 'Programme', options: [...new Set(students.map(s => s.programme))], value: s => s.programme }}
        columns={[
          { label: 'Student', display: s => <strong>{s.name}</strong> },
          { label: 'Identifier', display: s => <code>{s.id}</code> },
          { label: 'Programme', display: s => s.programme },
        ]}
      />
    </>
  )
}

export function Exams() {
  return (
    <>
      <Heading
        eyebrow="REGISTRAR"
        title="Exams"
        detail="Browse exam sessions used by the demonstration workspace."
      />
      <DataTable
        label="Exams"
        rows={exams}
        rowKey={exam => exam.id}
        search={exam => `${exam.id} ${exam.name} ${exam.term}`}
        columns={[
          { label: 'Exam', display: exam => <strong>{exam.name}</strong> },
          { label: 'Reference', display: exam => <code>{exam.id}</code> },
          { label: 'Term', display: exam => exam.term },
        ]}
      />
    </>
  )
}

export function Results({ history = false }: { history?: boolean }) {
  const { results } = useWorkspace()
  return (
    <>
      <Heading
        eyebrow="PUBLICATION RECORDS"
        title={history ? 'Publication history' : 'Results'}
        detail={
          history
            ? 'Inspect current and superseded versions. Earlier records are retained in the demo history.'
            : 'Browse current sample results by student, exam, or result reference.'
        }
        action={
          <Link className="btn" to="/admin/publish">
            <Plus size={18} /> New publication
          </Link>
        }
      />
      <DataTable
        label={history ? 'Publication history' : 'Results'}
        rows={history ? results : results.filter(r => r.current)}
        rowKey={r => r.ref}
        search={r => `${r.ref} ${r.student.name} ${r.exam.name} ${r.student.id}`}
        filters={
          history
            ? { name: 'Version state', options: ['Current', 'Superseded'], value: r => (r.current ? 'Current' : 'Superseded') }
            : { name: 'Exam', options: exams.map(e => e.name), value: r => r.exam.name }
        }
        columns={[
          {
            label: 'Result reference',
            display: r => (
              <Link to={`/admin/results/${r.ref}`}>
                <code>{r.ref}</code>
              </Link>
            ),
          },
          { label: 'Student', display: r => <strong>{r.student.name}</strong> },
          { label: 'Exam', display: r => r.exam.name },
          { label: 'Score', display: r => `${percent(r.marks)}%` },
          {
            label: 'Version',
            display: r => (
              <Chip tone={r.current ? 'teal' : 'neutral'}>
                v{r.version} · {r.current ? 'Current' : 'Superseded'}
              </Chip>
            ),
          },
          { label: 'Published', display: r => formatDate(r.date) },
        ]}
      />
    </>
  )
}
