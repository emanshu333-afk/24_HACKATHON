import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from '../app'
import { Evidence } from '../pages/Verify'
import * as api from '../services/api'
import { readVerificationInput, readVerificationQuery } from '../services/verification-input'

afterEach(() => vi.restoreAllMocks())

test('rejects malformed input and reports the demo evidence as unavailable', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/verify']}><App /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Check evidence' }))
  expect(screen.getByRole('alert')).toHaveTextContent('6–80 character reference')
  await user.click(screen.getByRole('link', { name: 'Try the sample reference' }))
  expect(await screen.findByText('Verification unavailable')).toBeVisible()
  expect(screen.getByText('Unverified example marks')).toBeVisible()
  await user.click(screen.getByText('Inspect evidence and trust assumptions'))
  expect(screen.getAllByText('No signed demo evidence')[0]).toBeVisible()
  expect(screen.queryByText('Verified current')).not.toBeInTheDocument()
  expect(screen.queryByText('Avery Patel')).not.toBeInTheDocument()
})

test('renders pending and transport error without an authenticity claim', async () => {
  let fail!: (reason: Error) => void
  vi.spyOn(api, 'verifyReference').mockImplementation(() => new Promise((_, reject) => { fail = reject }))
  render(<MemoryRouter initialEntries={['/verify?ref=VM-SP26-017-V1']}><App /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent('Checking evidence')
  fail(new Error('offline'))
  expect(await screen.findByRole('alert')).toHaveTextContent('No authenticity decision was made')
})

test.each([['current', 'Verified current'], ['historical', 'Verified historical / superseded'], ['invalid', 'Invalid / tampered']] as const)('renders the %s proof outcome from a test-only view model', (status, text) => {
  render(<Evidence proof={{ status, checks: [], reason: 'Rendering fixture' }} />)
  expect(screen.getByText(text)).toBeVisible()
})

test('verification retry does not resurrect a stale result', async () => {
  const user = userEvent.setup()
  const resolve: Array<(proof: Awaited<ReturnType<typeof api.verifyReference>>) => void> = []
  const signals: AbortSignal[] = []
  vi.spyOn(api, 'verifyReference').mockImplementation((_ref, signal) => new Promise(done => { resolve.push(done); signals.push(signal) }))
  render(<MemoryRouter initialEntries={['/verify?ref=VM-SP26-017-V1']}><App /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Check evidence' }))
  expect(signals[0].aborted).toBe(true)
  await act(async () => resolve[0]({ status: 'current', reason: 'Stale test response', checks: [] }))
  expect(screen.queryByText('Verified current')).not.toBeInTheDocument()
  await act(async () => resolve[1](api.demoVerification('VM-SP26-017-V1')))
  expect(await screen.findByText('Verification unavailable')).toBeVisible()
})

const ref = 'VM-SP26-017-V1', demo = { demo: true, origin: 'https://verimark.test' }
test('reads only the expected local verification route with a valid demo reference', () => {
  expect(readVerificationInput(`https://verimark.test/verify?ref=${ref}`, demo)).toEqual({ kind: 'reference', value: ref })
  expect(readVerificationInput(` ${ref} `, demo)).toEqual({ kind: 'reference', value: ref })
  expect(readVerificationQuery(`?ref=${ref}&receipt=invalid`)).toBeNull()
})

test.each([
  `https://example.test/verify?ref=${ref}`,
  `https://user:password@verimark.test/verify?ref=${ref}`,
  `https://verimark.test/another/verify?ref=${ref}`,
  `https://verimark.test/verify?ref=${ref}&ref=${ref}`,
  `https://verimark.test/verify?ref=${ref}#fragment`,
  `https:\\verimark.test\\verify?ref=${ref}`,
  `javascript:alert(1)`,
  `data:text/html,example`,
  `https://verimark.test/verify?ref=${'A'.repeat(4096)}`,
])('rejects an unsupported QR input (%#)', value => {
  expect(readVerificationInput(value, demo)).toBeNull()
})

test('hostile audit text stays text and a failed outcome cannot display marks as checked', () => {
  const hostile = '<img src=x onerror=alert(1)>'
  const { container } = render(<Evidence proof={{ status: 'invalid', reason: hostile, checks: [], marks: [{ subject: 'CS101', scored: 99, maximum: 100 }] }} />)
  expect(screen.getByRole('status')).toHaveTextContent(hostile)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
