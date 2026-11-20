import { expect, test } from '@playwright/test'
import { readVectors } from './proof-vectors'

const vectors = readVectors()
test.skip(!vectors, 'Fetch the backend ref or set VERIMARK_PROOF_VECTORS to run signed-fixture tests.')
const address = 'http://127.0.0.1:4175'

for (const [name, verdict] of [['current', 'Verified current'], ['historical', 'Verified historical / superseded'], ['corrected', 'Verified current'], ['tampered', 'Invalid / tampered']] as const) {
  test(`browser verifies backend signed vector: ${name}`, async ({ page }) => {
    const token = Buffer.from(JSON.stringify(name === 'corrected' ? vectors!.correctedReceipt : vectors!.receipt)).toString('base64url')
    await page.route('**/fixture-api/verify?*', route => {
      expect(new URL(route.request().url()).searchParams.get('receipt')).toBe(token)
      return route.fulfill({ json: vectors![name] })
    })
    await page.goto(`${address}/verify?receipt=${token}`)
    await expect(page.getByText(verdict, { exact: true })).toBeVisible()
    if (name === 'tampered') await expect(page.getByRole('table', { name: 'Subject marks' })).toHaveCount(0)
    else await expect(page.getByRole('table', { name: 'Subject marks' })).toBeVisible()
  })
}

test('signed proof cannot authenticate a different server-displayed mark', async ({ page }) => {
  const response = structuredClone(vectors!.current)
  response.verification.result!.marks[0].score += 1
  const token = Buffer.from(JSON.stringify(vectors!.receipt)).toString('base64url')
  await page.route('**/fixture-api/verify?*', route => route.fulfill({ json: response }))
  await page.goto(`${address}/verify`)
  await page.getByLabel('Signed receipt or verification URL').fill(`${address}/verify?receipt=${token}`)
  await page.getByRole('button', { name: 'Check evidence' }).click()
  await expect(page.getByText('DISPLAYED_RESULT_MISMATCH')).toBeVisible()
  await expect(page).toHaveURL(`${address}/verify`)
  await expect(page.getByRole('table', { name: 'Subject marks' })).toHaveCount(0)
})

test('a structurally valid receipt embedded in a foreign URL is rejected before requesting evidence', async ({ page }) => {
  const token = Buffer.from(JSON.stringify(vectors!.receipt)).toString('base64url')
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('receipt=')) requests.push(request.url()) })
  await page.goto(`${address}/verify`)
  await page.getByLabel('Signed receipt or verification URL').fill(`https://other.test/verify?receipt=${token}`)
  await page.getByRole('button', { name: 'Check evidence' }).click()
  await expect(page.getByRole('alert')).toHaveText(/from this institution/)
  expect(requests).toEqual([])
})

test('a server success claim without evidence stays unavailable', async ({ page }) => {
  const token = Buffer.from(JSON.stringify(vectors!.receipt)).toString('base64url')
  await page.route('**/fixture-api/verify?*', route => route.fulfill({ json: { verification: vectors!.current.verification } }))
  await page.goto(`${address}/verify?receipt=${token}`)
  await expect(page.getByText('Verification unavailable', { exact: true })).toBeVisible()
  await expect(page.getByText('MISSING_EVIDENCE', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
})

test('a modified receipt signature is rejected before requesting evidence', async ({ page }) => {
  const receipt = structuredClone(vectors!.receipt)
  receipt.signature = (receipt.signature[0] === 'A' ? 'B' : 'A') + receipt.signature.slice(1)
  const token = Buffer.from(JSON.stringify(receipt)).toString('base64url')
  const requests: string[] = []
  await page.route('**/fixture-api/verify?*', route => { requests.push(route.request().url()); return route.abort() })
  await page.goto(`${address}/verify?receipt=${token}`)
  await expect(page.getByText('FORGED_RECEIPT', { exact: true })).toBeVisible()
  expect(requests).toEqual([])
})

test('login sends a bearer only to the configured API and expires on 401', async ({ page }) => {
  await page.route('**/fixture-api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const user = { id: 'fixture-user', role: 'STUDENT', email: 'student@example.test', studentId: 'fixture-student' }
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { token: 'fixture-token', expiresIn: 3600, user } })
    expect(route.request().headers().authorization).toBe('Bearer fixture-token')
    if (path.endsWith('/me')) return route.fulfill({ json: user })
    return route.fulfill({ status: 401, json: { error: 'UNAUTHORIZED' } })
  })
  await page.goto(`${address}/student`)
  await page.getByLabel('Email').fill('student@example.test')
  await page.getByLabel('Password').fill('fixture-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Your session expired. Sign in again to continue.')).toBeVisible()
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
})

for (const [role, landing, publish, audit] of [
  ['ADMIN', '/admin', true, true], ['APPROVER', '/admin', false, false],
  ['AUDITOR', '/admin', false, true], ['STUDENT', '/student', false, false],
] as const) {
  test(`uses the current-user response for ${role} navigation`, async ({ page }) => {
    const user = { id: 'fixture-user', role, email: 'fixture@example.test', studentId: null }
    await page.route('**/fixture-api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/auth/login')) return route.fulfill({ json: { token: 'fixture-token', expiresIn: 3600, user: { ...user, role: 'STUDENT' } } })
      if (path.endsWith('/me')) return route.fulfill({ json: user })
      return route.fulfill({ json: [] })
    })
    await page.goto(`${address}/login`)
    await page.getByLabel('Email').fill('fixture@example.test')
    await page.getByLabel('Password').fill('fixture-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL(`${address}${landing}`)
    const menu = page.getByRole('navigation', { name: 'Workspace navigation' })
    await expect(menu.getByRole('link', { name: 'Publish results' })).toHaveCount(publish ? 1 : 0)
    await expect(menu.getByRole('link', { name: 'Audit reports' })).toHaveCount(audit ? 1 : 0)
  })
}
