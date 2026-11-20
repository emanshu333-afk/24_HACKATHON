import { ChevronRight, FileImage, Fingerprint, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Evidence } from '../components/EvidenceInspector'
import { Heading, Loading, Notice, Panel } from '../components/ui'
import { demoReference, mockMode, verifyReference } from '../services/api'
import type { Verification } from '../services/model'
import { unavailable, verifyReceipt } from '../services/proof/receipt'
import { readVerificationInput, readVerificationQuery, type VerificationInput } from '../services/verification-input'

export { Evidence }
const connectionError = 'The verification service could not be reached. No authenticity decision was made.'

export function Verify() {
  const location = useLocation()
  // Different history entries own separate form, requests, and image decoding state.
  return <VerificationForm key={location.key} search={location.search} />
}

function VerificationForm({ search }: { search: string }) {
  const [, setParams] = useSearchParams()
  const [attempt, setAttempt] = useState(() => ({ input: readVerificationQuery(search) }))
  const [input, setInput] = useState(() => attempt.input?.kind === 'reference' ? attempt.input.value : '')
  const [inputError, setInputError] = useState(''), [scanError, setScanError] = useState(''), [scanning, setScanning] = useState(false)
  const [response, setResponse] = useState<{ attempt: typeof attempt; proof?: Verification; error?: boolean }>()
  const scanGeneration = useRef(0)
  useEffect(() => () => { scanGeneration.current++ }, [])
  useEffect(() => {
    if (!attempt.input) return
    const target = attempt.input
    const controller = new AbortController()
    async function check() {
      try {
        const proof = target.kind === 'reference' ? await verifyReference(target.value, controller.signal)
          : mockMode ? unavailable('Demo mode cannot authenticate a signed receipt.') : await verifyReceipt(target.value, controller.signal)
        if (!controller.signal.aborted) setResponse({ attempt, proof })
      } catch {
        if (!controller.signal.aborted) setResponse({ attempt, error: true })
      }
    }
    void check()
    return () => controller.abort()
  }, [attempt])

  function accept(value: VerificationInput) {
    setScanError(''); setInputError('')
    if (value.kind === 'reference') {
      setInput(value.value)
      if (search !== `?ref=${value.value}`) { setParams({ ref: value.value }); return }
    } else {
      // Pasted/scanned receipts are capabilities; don't copy them into history or the form.
      setInput('')
    }
    setAttempt({ input: value })
  }
  function onSubmit(event: FormEvent) {
    event.preventDefault(); scanGeneration.current++; setScanning(false); setScanError('')
    const target = readVerificationInput(input, { demo: mockMode })
    if (!target) {
      setAttempt({ input: null })
      setInputError(mockMode ? 'Enter a 6–80 character reference using letters, digits, hyphens or underscores.' : 'Enter a signed receipt or a verification URL from this institution.')
    } else accept(target)
  }
  async function scan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    const generation = ++scanGeneration.current
    setInputError(''); setScanError(''); setScanning(true)
    let message = 'Could not read this image. Try a clear photo or enter the code manually.'
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5_000_000) { message = 'Use a PNG, JPEG or WebP image no larger than 5 MB.'; return }
      if (typeof createImageBitmap !== 'function') { message = 'QR image reading is unavailable in this browser.'; return }
      const bitmap = await createImageBitmap(file)
      try {
        if (generation !== scanGeneration.current) return
        if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 32_000_000) { message = 'Use a smaller image (up to 32 megapixels).'; return }
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const ctx = canvas.getContext('2d'); if (!ctx) return
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const { default: jsQR } = await import('jsqr')
        if (generation !== scanGeneration.current) return
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const target = readVerificationInput(jsQR(data, canvas.width, canvas.height)?.data ?? '', { demo: mockMode })
        if (!target) { message = 'No supported VeriMark QR was found. Use a marksheet from this institution or enter the code manually.'; return }
        message = ''; accept(target)
      } finally { bitmap.close() }
    } catch { /* Show the safe image error; never echo decoder or QR content. */ }
    finally { if (generation === scanGeneration.current) { setScanning(false); setScanError(message) } }
  }

  const outcome = response?.attempt === attempt ? response : undefined
  const reference = attempt.input?.kind === 'reference' ? attempt.input.value : undefined
  return <div className="container subpage">
    <Heading eyebrow="PUBLIC VERIFICATION" title="Verify a result" detail="Check the exact version printed on a marksheet. A reference alone does not establish authenticity." />
    {mockMode && <Notice><strong>DEMO MODE</strong> · These sample records are synthetic and cannot be cryptographically verified.</Notice>}
    <div className="verify-grid">
      <Panel>
        <div className="section-head"><span className="icon-tile"><ScanLine size={21} /></span><div><h2>Find the publication</h2><p>{mockMode ? 'Enter the reference below the QR code.' : 'Paste a signed receipt or upload a photo of the marksheet QR.'}</p></div></div>
        <form className="stack" onSubmit={onSubmit}>
          <label>{mockMode ? 'Result reference' : 'Signed receipt or verification URL'}<input value={input} onChange={e => setInput(e.target.value)} placeholder={mockMode ? 'e.g. VM-SP26-017-V1' : 'Paste receipt or URL'} maxLength={4096} aria-invalid={!!inputError} aria-describedby={inputError ? 'ref-error' : undefined} autoCapitalize="off" autoComplete="off" spellCheck={false} /></label>
          {inputError && <p className="field-error" id="ref-error" role="alert">{inputError}</p>}
          <button className="btn">Check evidence <ChevronRight size={18} /></button>
        </form>
        <div className="qr-upload">
          <label><FileImage size={18} /> Read a QR image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={scan} /></label>
          <p>Images are processed on this device.</p>
          {scanning && <Loading>Reading QR image… <button className="btn secondary compact" type="button" onClick={() => { scanGeneration.current++; setScanning(false) }}>Cancel scan</button></Loading>}
          {scanError && <Notice error>{scanError}</Notice>}
        </div>
        {mockMode && <Link className="inline-link" to={`/verify?ref=${demoReference}`}>Try the sample reference <ChevronRight size={16} /></Link>}
        {!mockMode && search && <Link className="inline-link" to="/verify" replace>Clear verification link <ChevronRight size={16} /></Link>}
      </Panel>
      <div>{outcome?.proof ? <Evidence proof={outcome.proof} reference={reference} />
        : outcome?.error ? <><Notice error>{connectionError}</Notice><button className="btn secondary" onClick={() => setAttempt({ ...attempt })}>Retry evidence check</button></>
        : attempt.input ? <Loading>Checking evidence…</Loading>
        : search && !inputError ? <Evidence proof={unavailable('The link does not contain one supported receipt or result reference.')} />
        : <Panel className="verification-placeholder"><Fingerprint size={34} /><h2>No reference checked yet</h2><p>Evidence, version information, and any verification issues will appear here.</p></Panel>}
      </div>
    </div>
  </div>
}
