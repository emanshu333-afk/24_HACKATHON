import { AlertCircle, ChevronLeft, ChevronRight, Inbox, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Brand() { return <Link className="brand" to="/" aria-label="VeriMark home"><span><ShieldCheck size={22} /></span>VeriMark<i>.</i></Link> }
export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'teal' }) { return <span className={`chip ${tone}`}><span className="dot" />{children}</span> }
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section> }
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : undefined}><AlertCircle size={18} /> <div>{children}</div></div> }
export function Loading({ children }: { children: ReactNode }) { return <div className="notice loading" role="status"><LoaderCircle size={18} />{children}</div> }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty"><Inbox size={24} />{children}</div> }
export function Heading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) { return <header className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{detail}</p></div>{action}</header> }
export function Confirm({ title, children, onDismiss, onConfirm, action = 'Confirm' }: { title: string; children: ReactNode; onDismiss: () => void; onConfirm: () => void; action?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null), titleId = useId()
  useEffect(() => {
    const dialog = ref.current, trigger = document.activeElement
    dialog?.showModal(); cancel.current?.focus()
    return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() }
  }, [])
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onDismiss() }}><h2 id={titleId}>{title}</h2><div className="muted">{children}</div><div className="actions"><button ref={cancel} className="btn secondary" type="button" onClick={onDismiss}>Cancel</button><button className="btn" type="button" onClick={onConfirm}>{action}</button></div></dialog>
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
  return <div ref={ref} className="table-scroll" tabIndex={overflow ? 0 : undefined} role={overflow ? 'region' : undefined} aria-label={overflow ? `${label} (scrollable table)` : undefined}>{children}</div>
}

export function DataTable<T>({ rows, columns, rowKey, search, filters, label }: {
  rows: T[]; columns: { label: string; display: (item: T) => ReactNode }[]; rowKey: (item: T) => string;
  search: (item: T) => string; filters?: { name: string; options: string[]; value: (item: T) => string }; label: string;
}) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(''), [page, setPage] = useState(1)
  const needle = query.trim().toLowerCase()
  const filtered = rows.filter(item => search(item).toLowerCase().includes(needle) && (!filter || filters?.value(item) === filter))
  const size = 5, pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages)
  return <Panel className="table-panel"><div className="table-tools"><label>Search {label.toLowerCase()}<input type="search" placeholder="Search records…" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label>{filters && <label>{filters.name}<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}><option value="">All</option>{filters.options.map(value => <option key={value}>{value}</option>)}</select></label>}</div>
    {filtered.length ? <TableScroll label={label}><table><caption className="sr-only">{label}</caption><thead><tr>{columns.map(col => <th key={col.label} scope="col">{col.label}</th>)}</tr></thead><tbody>{filtered.slice((current - 1) * size, current * size).map(item => <tr key={rowKey(item)}>{columns.map(col => <td key={col.label}>{col.display(item)}</td>)}</tr>)}</tbody></table></TableScroll> : <Empty>{rows.length ? <>No records match your search.<button className="btn secondary compact" onClick={() => { setQuery(''); setFilter(''); setPage(1) }}>Clear search and filters</button></> : 'No records are available yet.'}</Empty>}
    <div className="pagination"><span role="status">{filtered.length} {filtered.length === 1 ? 'record' : 'records'} · Page {current} of {pages}</span><div><button className="icon-button" aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={18} /></button></div></div>
  </Panel>
}
