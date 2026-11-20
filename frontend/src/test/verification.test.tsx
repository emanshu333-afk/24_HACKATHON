import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from '../app'
import { Evidence } from '../pages/Verify'
import * as api from '../services/api'

afterEach(() => vi.restoreAllMocks())

test('rejects malformed input and reports the demo evidence as unavailable', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/verify']}><App /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Check evidence' }))
  expect(screen.getByRole('alert')).toHaveTextContent('6–80 character reference')
  await user.click(screen.getByRole('link', { name: 'Try the sample reference' }))
  expect(await screen.findByText('Verification unavailable')).toBeVisible()
  expect(screen.getByText('Unverified example marks')).toBeVisible()
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

test('rejects verification URLs from a different origin', () => {
  expect(api.readQrReference('https://example.test/verify?ref=VM-SP26-017-V1')).toBeNull()
  expect(api.readQrReference(`${location.origin}/verify?ref=VM-SP26-017-V1`)).toBe('VM-SP26-017-V1')
})
