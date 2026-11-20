import { expect, test } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'

test('all public and workspace routes render at five representative widths', async ({ page }) => {
  test.setTimeout(90_000)
  const routes = [['/', /Every mark\s*has proof/], ['/verify', 'Verify a result'], ['/student', 'Your exam results'], ['/student/marksheet/VM-SP26-017-V1', 'Statement of Marks'], ['/admin', 'Integrity overview'], ['/admin/students', 'Students'], ['/admin/exams', 'Exams'], ['/admin/results', 'Results'], ['/admin/publish', 'Publish results'], ['/admin/history', 'Publication history'], ['/admin/ledger', 'Ledger explorer'], ['/admin/corrections', 'Correction requests'], ['/admin/integrity', 'Tamper Detection Lab'], ['/admin/audit', 'Audit reports'], ['/not-a-route', 'Page not found']] as const
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    for (const [path, name] of routes) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
  }
})

test('mobile workspace and confirmation can be used from the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 })
  await page.goto('/admin')
  await page.locator('summary').filter({ hasText: 'Workspace menu' }).press('Enter')
  const menu = page.getByRole('navigation', { name: 'Workspace navigation' })
  await menu.getByRole('link', { name: 'Publish results' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Publish results' })).toBeVisible()
  await expect(menu).toBeHidden()
  await page.getByRole('combobox', { name: /^Student/ }).selectOption('NW-24017')
  await page.getByRole('combobox', { name: /^Exam/ }).selectOption('EX-26-SU')
  for (const field of ['Data Structures', 'Discrete Mathematics', 'Computer Networks', 'Database Systems', 'Technical Writing']) await page.getByLabel(field).fill('80')
  const review = page.getByRole('button', { name: 'Review sample publication' })
  await review.press('Enter')
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(review).toBeFocused()
  await expect(page.getByLabel('Data Structures')).toHaveValue('80')
})

test('hostile QR image is rejected without navigating', async ({ page }) => {
  await page.setContent(renderToStaticMarkup(createElement(QRCodeSVG, { value: 'javascript:alert(1)', size: 160, marginSize: 4 })))
  const png = await page.locator('svg').screenshot()
  await page.goto('/verify')
  await page.getByLabel('Read a QR image').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('alert')).toHaveText(/No supported VeriMark QR/)
  await expect(page).toHaveURL(/\/verify$/)
})

test('results search, filters and pagination report the records actually shown', async ({ page }) => {
  await page.goto('/admin/results')
  await expect(page.getByRole('status')).toHaveText('7 records · Page 1 of 2')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByRole('status')).toHaveText('7 records · Page 2 of 2')
  await page.getByLabel('Search results').fill('Avery')
  await expect(page.getByRole('status')).toHaveText('2 records · Page 1 of 1')
  await page.getByRole('combobox', { name: /^Exam/ }).selectOption('Semester I Finals')
  await expect(page.getByRole('status')).toHaveText('1 record · Page 1 of 1')
  await expect(page.getByText('VM-AU25-017-V1')).toBeVisible()
  await page.getByLabel('Search results').fill('not a student')
  await expect(page.getByText('No records match your search.')).toBeVisible()
})

test('publication requires valid marks and confirmation before adding to demo history', async ({ page }) => {
  await page.goto('/admin/publish')
  await page.getByRole('button', { name: 'Review sample publication' }).click()
  await expect(page.getByText('Choose an option.')).toHaveCount(2)
  await page.getByRole('combobox', { name: /^Student/ }).selectOption('NW-24017')
  await page.getByRole('combobox', { name: /^Exam/ }).selectOption('EX-26-SU')
  for (const field of ['Data Structures', 'Discrete Mathematics', 'Computer Networks', 'Database Systems', 'Technical Writing']) await page.getByLabel(field).fill('80')
  await page.getByLabel('Data Structures').fill('101')
  await page.getByRole('button', { name: 'Review sample publication' }).click()
  await expect(page.getByText('Maximum is 100.')).toBeVisible()
  await page.getByLabel('Data Structures').fill('85')
  await page.getByRole('button', { name: 'Review sample publication' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Data Structures: 85 / 100')).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Added')).toHaveCount(0)
  await page.getByRole('button', { name: 'Review sample publication' }).click()
  await dialog.getByRole('button', { name: 'Add to demo history' }).click()
  await page.getByRole('link', { name: 'View history' }).click()
  await expect(page.getByText('DEMO-EX-26-SU-NW-24017-V1')).toBeVisible()
  await page.getByRole('link', { name: 'New publication' }).click()
  await page.getByLabel('Student', { exact: true }).selectOption('NW-24017')
  await page.getByLabel('Exam', { exact: true }).selectOption('EX-26-SU')
  for (const field of ['Data Structures', 'Discrete Mathematics', 'Computer Networks', 'Database Systems', 'Technical Writing']) await page.getByLabel(field).fill('85')
  await page.getByRole('button', { name: 'Review sample publication' }).click()
  await expect(page.getByRole('alert')).toContainText('A result already exists')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('correction proposals require a reason and do not manufacture approvals', async ({ page }) => {
  await page.goto('/admin/corrections')
  await expect(page.getByText('Demo approved')).toBeVisible()
  await expect(page.getByText('Demo rejected')).toBeVisible()
  await page.getByLabel('Published result').selectOption('VM-SP26-017-V1')
  await page.getByRole('combobox', { name: /^Subject/ }).selectOption('Data Structures')
  await page.getByLabel('Proposed mark').fill('86')
  await page.getByRole('button', { name: 'Create demo proposal' }).click()
  await expect(page.getByText('Explain the reason in at least 12 characters.')).toBeVisible()
  await page.getByLabel('Reason').fill('One point on the final page was omitted.')
  await page.getByRole('button', { name: 'Create demo proposal' }).click()
  await expect(page.getByRole('heading', { name: 'Proposal CR-DEMO-004' })).toBeVisible()
  await expect(page.getByText('Awaiting review')).toHaveCount(2)
  await expect(page.getByText('Institutional signing is not connected.')).toBeVisible()
})

test('tamper lab identifies the fixed field and values', async ({ page }) => {
  await page.goto('/admin/integrity')
  await page.getByRole('button', { name: 'Compare sample records' }).click()
  await expect(page.getByRole('status')).toHaveText(/marks\.dataStructures · Expected 85, found 95/)
  await page.getByRole('button', { name: 'Reset comparison' }).click()
  await expect(page.getByText('Mock finding: field mismatch')).toHaveCount(0)
  await page.getByRole('combobox', { name: /^Sample scenario/ }).selectOption('missing')
  await page.getByRole('button', { name: 'Compare sample records' }).click()
  await expect(page.getByRole('status')).toContainText('Comparison unavailable')
  await expect(page.getByText('Mock finding: field mismatch')).toHaveCount(0)
})

test('marksheet prints as one A4 page and its QR opens the exact demo reference', async ({ page }) => {
  await page.goto('/student/marksheet/VM-SP26-017-V1')
  const qr = page.getByRole('img', { name: 'QR link to sample verification' })
  const png = await qr.screenshot()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Print marksheet' })).toBeHidden()
  await expect(page.getByText('Sample · Not official')).toBeVisible()
  await expect(qr).toBeVisible()
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1')
  expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(1)
  const size = pdf.match(/\/MediaBox\s*\[0\s+0\s+([\d.]+)\s+([\d.]+)\]/)
  expect(Math.abs(Number(size?.[1]) - 595.28)).toBeLessThan(2)
  expect(Math.abs(Number(size?.[2]) - 841.89)).toBeLessThan(2)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('link', { name: 'Open sample verification' }).click()
  await expect(page.getByText('Verification unavailable', { exact: true })).toBeVisible()
  await page.goto('/verify')
  await page.getByLabel('Read a QR image').setInputFiles({ name: 'marksheet.png', mimeType: 'image/png', buffer: png })
  await expect(page).toHaveURL(/ref=VM-SP26-017-V1/)
  await expect(page.getByText('Verification unavailable', { exact: true })).toBeVisible()
})

test('live mode without backend shows no mock marks or private workspace', async ({ page }) => {
  await page.goto('http://127.0.0.1:4174/verify?ref=VM-SP26-017-V1')
  await expect(page.getByText('Verification unavailable', { exact: true })).toBeVisible()
  await expect(page.getByText('No live verification service is configured.')).toBeVisible()
  await expect(page.getByText('Unverified example marks')).toHaveCount(0)
  await page.goto('http://127.0.0.1:4174/admin/results')
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await page.goto('http://127.0.0.1:4174/student/marksheet/VM-SP26-017-V1')
  await expect(page.getByRole('alert')).toHaveText('Marksheet unavailable.')
})

test('sample workspace opens from the live site without contacting the API', async ({ page }) => {
  const remoteRequests: string[] = []
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4174/')) remoteRequests.push(request.resourceType())
  })
  await page.goto('http://127.0.0.1:4174/')
  await page.getByRole('link', { name: 'Explore sample workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Sample workspace' })).toBeVisible()
  await page.getByRole('link', { name: /Printable marksheet/ }).click()
  await page.getByRole('link', { name: 'Open sample verification' }).click()
  await expect(page).toHaveURL(/\/sample\/verify\?ref=/)
  await expect(page.getByText('DEMO MODE', { exact: true })).toBeVisible()
  expect(remoteRequests).toEqual([])
})

test('every sample directory link opens a dedicated page and survives refresh', async ({ page }) => {
  test.setTimeout(90_000)
  const headings = [
    'Sign in to VeriMark', 'My account', 'Integrity overview', 'Students', 'Exams',
    'Publish results', 'Results', 'Your exam results', 'Result details', 'Statement of Marks',
    'Verify a result', 'Correction requests', 'Correction detail', 'First approval',
    'Second approval', 'Tamper Detection Lab', 'Publication history', 'Ledger explorer', 'Audit reports',
  ]
  const home = 'http://127.0.0.1:4174/sample/'
  await page.goto(home)
  const links = page.locator('.sample-sections a')
  await expect(links).toHaveCount(headings.length)
  const destinations = await links.evaluateAll(items => items.map(item => item.getAttribute('href')))
  expect(new Set(destinations).size).toBe(headings.length)
  for (const [index, heading] of headings.entries()) {
    await links.nth(index).click()
    const title = page.getByRole('heading', { level: 1, name: heading, exact: true })
    await expect(title).toBeVisible()
    await page.reload()
    await expect(title).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Sample workspace' })).toBeVisible()
  }
})

test('demo account choices open the corresponding sample workspaces without login', async ({ page }) => {
  const choices = [
    ['Administrator', 'Integrity overview'], ['Student', 'Your exam results'],
    ['Approver A', 'First approval'], ['Approver B', 'Second approval'], ['Auditor', 'Audit reports'],
  ]
  const authRequests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/auth/login') authRequests.push(request.method())
  })
  for (const [role, title] of choices) {
    await page.goto('http://127.0.0.1:4174/login')
    await page.getByRole('navigation', { name: 'Demo accounts' }).getByRole('link', { name: new RegExp(role) }).click()
    await expect(page).toHaveURL(/\/sample\//)
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible()
  }
  expect(authRequests).toEqual([])
})
