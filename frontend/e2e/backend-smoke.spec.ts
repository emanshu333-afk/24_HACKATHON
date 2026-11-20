import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'

const endpoint = process.env.VERIMARK_SMOKE_BACKEND
const credentialsPath = process.env.VERIMARK_SMOKE_CREDENTIALS_FILE
const publicKeyPath = process.env.VERIMARK_SMOKE_PUBLIC_KEY_FILE
test.skip(!endpoint || !credentialsPath || !publicKeyPath, 'Optional smoke test: point the three VERIMARK_SMOKE variables at a fresh, seeded disposable backend.')

test('real API: publication, checked marksheet, optional dual approval and auditor report', async ({ page, request }) => {
  test.setTimeout(60_000)
  const admin = 'admin@verimark.test', student = 'student@verimark.test', auditor = 'auditor@verimark.test'
  const credentials = JSON.parse(readFileSync(credentialsPath!, 'utf8')) as Record<string, string>
  const health = await request.get(`${endpoint}/health`)
  expect(health.ok()).toBe(true)
  const signIn = async (username: string) => {
    await page.goto('http://localhost:5173/login')
    await page.getByLabel('Email').fill(username)
    await page.getByLabel('Password').fill(credentials[username])
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  }
  await signIn(admin)
  await expect(page.getByRole('heading', { name: 'Integrity overview' })).toBeVisible()
  await page.getByRole('link', { name: 'Publish results' }).first().click()
  await page.getByRole('combobox', { name: /^Student/ }).selectOption({ index: 1 })
  await page.getByRole('combobox', { name: /^Exam/ }).selectOption({ index: 1 })
  await page.getByLabel('Subject marks (one per line)').fill('CS101: 85\nMA101: 90')
  await page.getByRole('button', { name: 'Review publication' }).click()
  await page.getByRole('button', { name: 'Publish and sign' }).click()
  await expect(page.getByRole('status')).toContainText('Publication v1 recorded')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(student)
  await page.getByRole('link', { name: /Open publication history/ }).click()
  await page.getByRole('link', { name: 'Open marksheet' }).click()
  await expect(page.getByRole('button', { name: 'Print marksheet' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR link to signed receipt verification' })).toBeVisible()
  await page.getByRole('link', { name: 'Open verification', exact: true }).click()
  await expect(page.getByText('Verified current', { exact: true })).toBeVisible()
  const original = page.url(), signer = process.env.VERIMARK_SMOKE_SIGNER
  if (signer) {
    await signIn(admin)
    await page.getByRole('link', { name: 'Corrections', exact: true }).click()
    await page.getByRole('combobox', { name: /^Base result/ }).selectOption({ index: 1 })
    await page.getByLabel('Full replacement marks').fill('CS101: 88\nMA101: 90')
    await page.getByLabel('Reason', { exact: true }).fill('Recount confirmed omitted points.')
    await page.getByRole('button', { name: 'Create proposal' }).click()
    await expect(page.getByRole('heading', { name: 'Proposal review' })).toBeVisible()
    for (const approver of ['approver-a', 'approver-b']) {
      await signIn(`${approver}@verimark.test`)
      await page.getByRole('link', { name: 'Corrections', exact: true }).click()
      const downloading = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download proposal JSON' }).click()
      const download = await downloading
      const { signature } = JSON.parse(execFileSync(process.execPath, [signer, (await download.path())!, join(dirname(publicKeyPath!), `${approver}.private.pem`)], { encoding: 'utf8' })) as { signature: string }
      await page.getByLabel('Detached signature').fill(signature)
      await page.getByRole('button', { name: 'Submit approval signature' }).click()
      if (approver === 'approver-a') {
        await expect(page.getByText('Awaiting signature')).toHaveCount(1)
        await expect(page.getByRole('link', { name: 'Check corrected signed publication' })).toHaveCount(0)
      } else {
        await page.getByRole('link', { name: 'Check corrected signed publication' }).click()
        await expect(page.getByRole('cell', { name: '88', exact: true })).toBeVisible()
      }
    }
    await page.goto(original)
    await expect(page.getByText('Verified historical / superseded', { exact: true })).toBeVisible()
  }
  await signIn(auditor) // full navigation clears the in-memory student session
  await page.getByRole('link', { name: 'Audit reports' }).click()
  await page.getByRole('button', { name: 'Run integrity audit' }).click()
  await expect(page.getByText(/Institution audit: No findings reported/)).toBeVisible()
})
