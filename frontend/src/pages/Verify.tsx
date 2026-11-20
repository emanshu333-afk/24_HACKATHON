import { ChevronRight, FileImage, Fingerprint, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Marks } from '../components/marks'
import { Chip, Heading, Loading, Notice, Panel } from '../components/ui'
import { demoReference, mockMode, readQrReference, verifyReference } from '../services/api'
import { referencePattern, type Verification } from '../services/model'

const statuses = { current: ['Verified current', 'green'], historical: ['Verified historical / superseded', 'teal'], invalid: ['Invalid / tampered', 'red'], unavailable: ['Verification unavailable', 'amber'] } as const

export function Evidence({ proof }: { proof: Verification }) {
  const [title, tone] = statuses[proof.status]
  const verified = proof.status === 'current' || proof.status === 'historical'
  return <Panel className="evidence" ><div className="section-head"><span className="icon-tile"><Fingerprint size={22} /></span><div><h2>Verification outcome</h2><Chip tone={tone}>{title}</Chip></div></div><p role="status">{proof.reason}</p>{proof.version !== undefined && <div className="reference-line"><span>{proof.exam}</span><Chip tone={verified ? 'teal' : 'neutral'}>Version {proof.version}</Chip></div>}
    <ul className="evidence-list">{proof.checks.map(check => <li key={check.label}><div><strong>{check.label}</strong><span>{check.detail}</span></div><Chip tone={check.state === 'passed' ? 'green' : check.state === 'failed' ? 'red' : 'neutral'}>{check.state}</Chip></li>)}</ul>
    {proof.marks && <><h3>{verified ? 'Published marks' : 'Unverified example marks'}</h3><Marks marks={proof.marks} /></>}
  </Panel>
}

export function Verify() {
  const [params, setParams] = useSearchParams(), reference = params.get('ref') ?? ''
  const [input, setInput] = useState(reference), [inputError, setInputError] = useState(''), [scanError, setScanError] = useState(''), [scanning, setScanning] = useState(false)
  const [response, setResponse] = useState<{ ref: string; proof?: Verification; error?: string }>(), qrGeneration = useRef(0)
  useEffect(() => { setInput(reference); setInputError(''); setScanError(''); return () => { qrGeneration.current++ } }, [reference])
  useEffect(() => {
    if (!referencePattern.test(reference)) return
    const controller = new AbortController()
    verifyReference(reference, controller.signal).then(proof => { if (!controller.signal.aborted) setResponse({ ref: reference, proof }) }).catch(() => { if (!controller.signal.aborted) setResponse({ ref: reference, error: 'The verification service could not be reached. No authenticity decision was made.' }) })
    return () => controller.abort()
  }, [reference])
  const submit = (value: string) => {
    const ref = value.trim()
    if (!referencePattern.test(ref)) { setInputError('Enter a 6–80 character reference using letters, digits, hyphens or underscores.'); return }
    setInputError(''); setScanError(''); setParams({ ref })
  }
  function onSubmit(event: FormEvent) { event.preventDefault(); qrGeneration.current++; setScanning(false); submit(input) }
  async function scan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    const generation = ++qrGeneration.current
    setInputError(''); setScanError(''); setScanning(true)
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000) throw new Error('Use a PNG, JPEG or WebP image under 5 MB.')
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image scanning is unavailable on this browser.')
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const { default: jsQR } = await import('jsqr'), { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const match = readQrReference(jsQR(data, canvas.width, canvas.height)?.data ?? '')
        if (!match || !referencePattern.test(match)) throw new Error('No readable VeriMark QR for this site was found. Try entering the reference manually.')
        if (generation === qrGeneration.current) { setScanning(false); submit(match) }
      } finally { bitmap.close() }
    } catch (error) { if (generation === qrGeneration.current) { setScanError(error instanceof Error ? error.message : 'Could not read the image.'); setScanning(false) } }
  }
  const outcome = response?.ref === reference ? response : undefined
  return <div className="container subpage"><Heading eyebrow="PUBLIC VERIFICATION" title="Verify a result" detail="Check the exact version printed on a marksheet. A reference alone does not establish authenticity." />{mockMode && <Notice><strong>DEMO MODE</strong> · These sample records are synthetic and cannot be cryptographically verified.</Notice>}<div className="verify-grid"><Panel><div className="section-head"><span className="icon-tile"><ScanLine size={21} /></span><div><h2>Find the publication</h2><p>Use the reference below the QR code.</p></div></div><form className="stack" onSubmit={onSubmit}><label>Result reference<input value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. VM-SP26-017-V1" maxLength={80} aria-invalid={!!inputError} aria-describedby={inputError ? 'ref-error' : undefined} autoCapitalize="off" spellCheck={false} /></label>{inputError && <p className="field-error" id="ref-error" role="alert">{inputError}</p>}<button className="btn">Check evidence <ChevronRight size={18} /></button></form><div className="qr-upload"><label><FileImage size={18} /> Read a QR image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={scan} /></label><p>Images are processed on this device.</p>{scanning && <Loading>Reading QR image…</Loading>}{scanError && <Notice error>{scanError}</Notice>}</div>{mockMode && <Link className="inline-link" onClick={() => { qrGeneration.current++; setScanning(false) }} to={`/verify?ref=${demoReference}`}>Try the sample reference <ChevronRight size={16} /></Link>}</Panel><div>{reference && !referencePattern.test(reference) ? <Notice error>This link contains an invalid result reference.</Notice> : reference ? outcome?.proof ? <Evidence proof={outcome.proof} /> : outcome?.error ? <Notice error>{outcome.error}</Notice> : <Loading>Checking evidence…</Loading> : <Panel className="verification-placeholder"><Fingerprint size={34} /><h2>No reference checked yet</h2><p>Evidence, version information, and any verification issues will appear here.</p></Panel>}</div></div></div>
}
