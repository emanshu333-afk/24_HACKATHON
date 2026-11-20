import { AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Info, Inbox, LoaderCircle, Search, ShieldCheck, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="VeriMark home">
      <span className="brand-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
      <span className="brand-name">VeriMark<i className="brand-dot">.</i></span>
    </Link>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'teal' }) {
  return (
    <span className={`chip ${tone}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function Notice({ children, error = false, tone }: { children: ReactNode; error?: boolean; tone?: 'error' | 'warning' | 'info' | 'success' }) {
  const isError = error || tone === 'error'
  const isWarning = tone === 'warning'
  const isSuccess = tone === 'success'
  const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : isSuccess ? CheckCircle2 : Info
  return (
    <div className={`notice ${isError ? 'error' : isWarning ? 'warning' : isSuccess ? 'success' : ''}`} role={isError ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <div className="notice loading" role="status">
      <LoaderCircle size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon-wrap"><Inbox size={26} aria-hidden="true" /></div>
      <div className="empty-content">{children}</div>
    </div>
  )
}

export function Heading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </header>
  )
}

export function Confirm({ title, children, onDismiss, onConfirm, action = 'Confirm' }: {
  title: string; children: ReactNode; onDismiss: () => void; onConfirm: () => void; action?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null), titleId = useId()
  useEffect(() => {
    const dialog = ref.current, trigger = document.activeElement
    dialog?.showModal(); cancel.current?.focus()
    return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onDismiss() }}>
      <h2 id={titleId}>{title}</h2>
      <div className="muted">{children}</div>
      <div className="actions">
        <button ref={cancel} className="btn secondary" type="button" onClick={onDismiss}>Cancel</button>
        <button className="btn" type="button" onClick={onConfirm}>{action}</button>
      </div>
    </dialog>
  )
}

export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const region = ref.current
    if (!region) return
    const measure = () => setOverflow(region.scrollWidth > region.clientWidth + 1)
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(region)
    if (region.firstElementChild) observer.observe(region.firstElementChild)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="table-scroll" tabIndex={overflow ? 0 : undefined} role={overflow ? 'region' : undefined} aria-label={overflow ? `${label} (scrollable table)` : undefined}>
      {children}
    </div>
  )
}

export function DataTable<T>({ rows, columns, rowKey, search, filters, label }: {
  rows: T[]; columns: { label: string; display: (item: T) => ReactNode }[]; rowKey: (item: T) => string;
  search: (item: T) => string; filters?: { name: string; options: string[]; value: (item: T) => string }; label: string;
}) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(''), [page, setPage] = useState(1)
  const needle = query.trim().toLowerCase()
  const filtered = rows.filter(item => search(item).toLowerCase().includes(needle) && (!filter || filters?.value(item) === filter))
  const size = 5, pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages)
  return (
    <Panel className="table-panel">
      <div className="table-tools">
        <label>
          Search {label.toLowerCase()}
          <span className="filter-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search records…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
            />
            {query && (
              <button
                type="button"
                className="filter-clear"
                aria-label="Clear search"
                onClick={() => { setQuery(''); setPage(1) }}
              >
                <X size={14} />
              </button>
            )}
          </span>
        </label>
        {filters && (
          <label>
            {filters.name}
            <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {filters.options.map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
        )}
      </div>
      {filtered.length ? (
        <TableScroll label={label}>
          <table>
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr>
                {columns.map(col => <th key={col.label} scope="col">{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * size, current * size).map(item => (
                <tr key={rowKey(item)}>
                  {columns.map(col => <td key={col.label}>{col.display(item)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <Empty>
          {rows.length ? (
            <>
              No records match your search.
              <button className="btn secondary compact" onClick={() => { setQuery(''); setFilter(''); setPage(1) }}>
                Clear search and filters
              </button>
            </>
          ) : (
            'No records are available yet.'
          )}
        </Empty>
      )}
      <div className="pagination">
        <span role="status">{filtered.length} {filtered.length === 1 ? 'record' : 'records'} · Page {current} of {pages}</span>
        <div>
          <button className="icon-button" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={18} />
          </button>
          <button className="icon-button" aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </Panel>
  )
}

/* =========================================================================
   NEXT-GENERATION CRAFTED DESIGN PRIMITIVES
   ========================================================================= */

export function CopyButton({ text, label = 'Copy to clipboard' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : label}
      title={copied ? 'Copied!' : label}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span className="copy-text">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export function CopyableCode({ value, truncate = true, label }: { value: string; truncate?: boolean; label?: string }) {
  const display = truncate && value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value
  return (
    <span className="copyable-code">
      <code title={value}>{display}</code>
      <CopyButton text={value} label={label ? `Copy ${label}` : 'Copy value'} />
    </span>
  )
}

export interface StepItem {
  id: string
  label: string
  detail?: string
  status: 'complete' | 'current' | 'upcoming' | 'error'
}

export function Stepper({ steps }: { steps: StepItem[] }) {
  return (
    <ol className="stepper" aria-label="Workflow progress">
      {steps.map((step, index) => (
        <li key={step.id} className={`step-item ${step.status}`}>
          <div className="step-marker" aria-hidden="true">
            {step.status === 'complete' ? <Check size={14} /> : index + 1}
          </div>
          <div className="step-body">
            <strong className="step-label">{step.label}</strong>
            {step.detail && <span className="step-detail">{step.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label = 'View selection'
}: {
  tabs: { id: T; label: string; icon?: ReactNode; badge?: string | number }[]
  value: T
  onChange: (val: T) => void
  label?: string
}) {
  return (
    <div className="segmented-tabs" role="tablist" aria-label={label}>
      {tabs.map(tab => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`tab-btn ${selected ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="tab-icon" aria-hidden="true">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="tab-badge">{tab.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open])

  if (!open) return null

  const items = [
    { label: 'Verify a result', category: 'Public', to: '/verify', desc: 'Scan QR or check signed receipt' },
    { label: 'Public Landing Page', category: 'Public', to: '/', desc: 'Overview of academic trust platform' },
    { label: 'How Verification Works', category: 'Education', to: '/how-verification-works', desc: 'Cryptographic architecture explainer' },
    { label: 'Trust & Security Model', category: 'Security', to: '/trust', desc: 'Assumptions and threat models' },
    { label: 'Staff Overview Dashboard', category: 'Staff', to: '/admin', desc: 'Publication statistics and review queue' },
    { label: 'Publish Results', category: 'Staff', to: '/admin/publish', desc: 'Prepare and sign examination results' },
    { label: 'Students Directory', category: 'Registrar', to: '/admin/students', desc: 'Student enrollment list' },
    { label: 'Exams Directory', category: 'Registrar', to: '/admin/exams', desc: 'Examination sessions roster' },
    { label: 'Results Directory', category: 'Registrar', to: '/admin/results', desc: 'All published grade records' },
    { label: 'Publication History', category: 'Registrar', to: '/admin/history', desc: 'Immutable versioned record history' },
    { label: 'Correction Requests', category: 'Governance', to: '/admin/corrections', desc: 'Two-person approval workflows' },
    { label: 'Tamper Detection Lab', category: 'Integrity', to: '/admin/integrity', desc: 'Simulated forensics & database mismatch checks' },
    { label: 'Ledger Explorer', category: 'Integrity', to: '/admin/ledger', desc: 'Append-only event chain' },
    { label: 'Audit Reports', category: 'Integrity', to: '/admin/audit', desc: 'Discrepancy inspection reports' },
    { label: 'Student Portal', category: 'Student', to: '/student', desc: 'Academic profile and marksheet' },
    { label: 'Guided Demo Tour', category: 'Guide', to: '/sample/tour', desc: '5-step walkthrough of features' },
  ]

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.desc.toLowerCase().includes(search.toLowerCase())
  )

  function selectItem(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose} role="presentation">
      <div className="command-palette" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command search">
        <div className="command-header">
          <Search size={18} className="command-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Type a command or search screens…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && filtered.length > 0) selectItem(filtered[0].to)
            }}
          />
          <kbd className="command-kbd">ESC</kbd>
        </div>
        <div className="command-list" role="listbox">
          {filtered.length ? (
            filtered.map((item, index) => (
              <button
                key={item.to + index}
                type="button"
                className="command-item"
                onClick={() => selectItem(item.to)}
              >
                <div className="command-item-main">
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </div>
                <span className="command-category-chip">{item.category}</span>
              </button>
            ))
          ) : (
            <div className="command-empty">No matching screens or commands found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
