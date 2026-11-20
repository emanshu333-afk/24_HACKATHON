import { expect, test } from '@playwright/test'
import type { CheckpointEvidence } from '../src/services/wire'
import type * as browserVerifier from '../src/services/proof/browser-verifier.js'

const api = process.env.VERIMARK_PUBLIC_SMOKE_URL
const key = process.env.VERIMARK_PUBLIC_SMOKE_KEY
test.skip(!api, 'Set VERIMARK_PUBLIC_SMOKE_URL to enable public HTTP checks.')

test('public tunnel: browser CORS and unauthenticated API responses', async ({ page }) => {
  await page.goto('http://localhost:5173/login')
  await expect(page.getByRole('heading', { name: 'Sign in to VeriMark' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  const observed = await page.evaluate(async api => {
    const options = { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' } as const
    const [health, checkpoint, invalid, unauthorized] = await Promise.all([
      fetch(`${api}/health`, options), fetch(`${api}/checkpoints/latest`, options),
      fetch(`${api}/verify`, options), fetch(`${api}/me`, options),
    ])
    return { statuses: [health.status, checkpoint.status, invalid.status, unauthorized.status], health: await health.json(), invalid: await invalid.json(), unauthorized: await unauthorized.json() }
  }, api!)
  expect(observed).toEqual({ statuses: [200, 200, 400, 401], health: { status: 'ok' }, invalid: { error: 'INVALID_RECEIPT_ENCODING' }, unauthorized: { error: 'UNAUTHORIZED' } })
})

test('public tunnel: known institution key verifies checkpoint and rejects a modified sequence', async ({ page }) => {
  test.skip(!key, 'Requires the complete, independently supplied SPKI PEM public key.')
  await page.goto('http://localhost:5173/verify')
  const observed = await page.evaluate(async ({ api, key }) => {
    const modulePath = '/src/services/proof/browser-verifier.js'
    const verifier = await import(modulePath) as typeof browserVerifier
    const checkpoint = await fetch(`${api}/checkpoints/latest`, { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' })
    const envelope = await checkpoint.json() as CheckpointEvidence
    const signerMatches = envelope.body?.signer === await verifier.keyId(key)
    const signatureValid = await verifier.verifyValue('checkpoint', envelope.body, envelope.signature, key)
    const changed = { ...envelope.body, sequence: envelope.body.sequence + 1 }
    const changedSignatureValid = await verifier.verifyValue('checkpoint', changed, envelope.signature, key)
    return { http: checkpoint.status, signerMatches, signatureValid, changedSignatureValid }
  }, { api: api!, key: key!.split(String.raw`\n`).join(String.fromCharCode(10)) })
  expect(observed).toEqual({ http: 200, signerMatches: true, signatureValid: true, changedSignatureValid: false })
})
