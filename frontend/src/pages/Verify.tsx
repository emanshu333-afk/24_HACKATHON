import { ChevronRight, FileImage, Fingerprint, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Marks } from '../components/marks'
import { Chip, Heading, Loading, Notice, Panel } from '../components/ui'
import { demoReference, mockMode, readQrReceipt, readQrReference, verifyReference } from '../services/api'
import { referencePattern, type Verification } from '../services/model'
import { parseReceipt, unavailable, verifyReceipt } from '../services/proof/receipt'

const statuses = { current: ['Verified current', 'green'], historical: ['Verified historical / superseded', 'teal'], invalid: ['Invalid / tampered', 'red'], unavailable: ['Verification unavailable', 'amber'] } as const

export function Evidence({ proof }: { proof: Verification }) {
  const [title, tone] = statuses[proof.status]
  const verified = proof.status === 'current' || proof.status === 'historical'
  return <Panel className="evidence" ><div className="section-head"><span className="icon-tile"><Fingerprint size={22} /></span><div><h2>Verification outcome</h2><Chip tone={tone}>{title}</Chip></div></div><p role="status">{proof.reason}</p>{proof.version !== undefined && <div className="reference-line"><span>{proof.exam}</span><Chip tone={verified ? 'teal' : 'neutral'}>Version {proof.version}</Chip></div>}
    {proof.resultId && <p>Result ID: <code>{proof.resultId}</code></p>}{proof.checkedAt && <p>Checkpoint time (institution assertion): <code>{proof.checkedAt}</code></p>}
    {!!proof.failures?.length && <ul className="evidence-list" aria-label="Failure codes">{[...new Set(proof.failures)].map(code => <li key={code}><code>{code}</code></li>)}</ul>}
    <ul className="evidence-list">{proof.checks.map(check => <li key={check.label}><div><strong>{check.label}</strong><span>{check.detail}</span></div><Chip tone={check.state === 'passed' ? 'green' : check.state === 'failed' ? 'red' : 'neutral'}>{check.state}</Chip></li>)}</ul>
    {proof.marks && <><h3>{verified ? 'Published marks' : 'Unverified example marks'}</h3><Marks marks={proof.marks} /></>}
  </Panel>
}

export function Verify() {
  const [params, setParams] = useSearchParams(), receipt = params.get('receipt'), reference = receipt ?? params.get('ref') ?? ''
  const [input, setInput] = useState(reference), [inputError, setInputError] = useState(''), [scanError, setScanError] = useState(''), [scanning, setScanning] = useState(false)
  const [response, setResponse] = useState<{ ref: string; proof?: Verification; error?: string }>(), qrGeneration = useRef(0)
  useEffect(() => { setInput(reference); setInputError(''); setScanError(''); return () => { qrGeneration.current++ } }, [reference])
  useEffect(() => {
    if (!reference || (receipt !== null ? !parseReceipt(receipt) : !referencePattern.test(reference))) return
    const controller = new AbortController()
    const work = receipt !== null ? mockMode ? Promise.resolve(unavailable('Switch out of demo mode to verify signed receipts.')) : verifyReceipt(receipt, controller.signal) : verifyReference(reference, controller.signal)
    work.then(proof => { if (!controller.signal.aborted) setResponse({ ref: reference, proof }) }).catch(() => { if (!controller.signal.aborted) setResponse({ ref: reference, error: 'The verification service could not be reached. No authenticity decision was made.' }) })
    return () => controller.abort()
  }, [reference, receipt])
  const submit = (value: string) => {
    const ref = value.trim()
    const token = readQrReceipt(ref)
    if (token) { setInputError(''); setScanError(''); setParams({ receipt: token }); return }
    if (!mockMode || !referencePattern.test(ref)) { setInputError(mockMode ? 'Enter a 6–80 character reference using letters, digits, hyphens or underscores.' : 'Enter a signed receipt token or marksheet verification URL.'); return }
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
        const value = jsQR(data, canvas.width, canvas.height)?.data ?? ''
        const match = readQrReceipt(value) ?? (mockMode ? readQrReference(value) : null)
        if (!match) throw new Error('No readable VeriMark QR was found. Try entering the receipt manually.')
        if (generation === qrGeneration.current) { setScanning(false); submit(match) }
      } finally { bitmap.close() }
    } catch (error) { if (generation === qrGeneration.current) { setScanError(error instanceof Error ? error.message : 'Could not read the image.'); setScanning(false) } }
  }
  const outcome = response?.ref === reference ? response : undefined
  return <div className="container subpage"><Heading eyebrow="PUBLIC VERIFICATION" title="Verify a result" detail="Check the exact version printed on a marksheet. A reference alone does not establish authenticity." />{mockMode && <Notice><strong>DEMO MODE</strong> · These sample records are synthetic and cannot be cryptographically verified.</Notice>}<div className="verify-grid"><Panel><div className="section-head"><span className="icon-tile"><ScanLine size={21} /></span><div><h2>Find the publication</h2><p>{mockMode ? 'Use the reference below the QR code.' : 'Paste a signed receipt or upload a photo of the marksheet QR.'}</p></div></div><form className="stack" onSubmit={onSubmit}><label>{mockMode ? 'Result reference' : 'Signed receipt or verification URL'}<input value={input} onChange={e => setInput(e.target.value)} placeholder={mockMode ? 'e.g. VM-SP26-017-V1' : 'Paste receipt or URL'} maxLength={mockMode ? 80 : 4096} aria-invalid={!!inputError} aria-describedby={inputError ? 'ref-error' : undefined} autoCapitalize="off" spellCheck={false} /></label>{inputError && <p className="field-error" id="ref-error" role="alert">{inputError}</p>}<button className="btn">Check evidence <ChevronRight size={18} /></button></form><div className="qr-upload"><label><FileImage size={18} /> Read a QR image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={scan} /></label><p>Images are processed on this device.</p>{scanning && <Loading>Reading QR image…</Loading>}{scanError && <Notice error>{scanError}</Notice>}</div>{mockMode && <Link className="inline-link" onClick={() => { qrGeneration.current++; setScanning(false) }} to={`/verify?ref=${demoReference}`}>Try the sample reference <ChevronRight size={16} /></Link>}</Panel><div>{receipt !== null && !parseReceipt(receipt) ? <Evidence proof={unavailable('This link contains a malformed receipt.')} /> : reference && receipt === null && !referencePattern.test(reference) ? <Notice error>This link contains an invalid result reference.</Notice> : reference ? outcome?.proof ? <Evidence proof={outcome.proof} /> : outcome?.error ? <><Notice error>{outcome.error}</Notice>{receipt !== null && <Evidence proof={unavailable('No proof response was available to check.')} />}</> : <Loading>Checking evidence…</Loading> : <Panel className="verification-placeholder"><Fingerprint size={34} /><h2>No reference checked yet</h2><p>Evidence, version information, and any verification issues will appear here.</p></Panel>}</div></div></div>
}
