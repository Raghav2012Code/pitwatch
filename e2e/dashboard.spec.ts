import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

const PAGES = [
  ['Overview', 'overview'],
  ['3D map', 'monitor'],
  ['Findings', 'findings'],
  ['Permit rules', 'rules'],
  ['Uncertainty', 'uncertainty'],
  ['About the data', 'about'],
] as const

test('every sidebar link opens its page and marks it current', async ({ page }) => {
  await page.goto('/#/overview')
  const nav = page.getByRole('navigation', { name: 'Dashboard' })

  for (const [label, route] of PAGES) {
    await nav.getByRole('link', { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`#/${route}$`))
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
  }
})

test('the sidebar counts the findings and the home link leaves the dashboard', async ({ page }) => {
  await page.goto('/#/overview')
  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  await expect(nav.getByRole('link', { name: /Findings/ })).toContainText('5', {
    timeout: 60_000,
  })

  await page.getByRole('link', { name: 'Back to home page' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See where a simulated mine')
})

test('the overview reports the engine result and the figures behind it', async ({ page }) => {
  await page.goto('/#/overview')
  await expect(
    page.getByRole('heading', { level: 2, name: '2 violations, 3 warnings' }),
  ).toBeVisible({ timeout: 60_000 })

  const figures = page.locator('dl[aria-label="Headline figures"]')
  await expect(figures).toContainText('281 days')
  await expect(figures).toContainText('m³')

  // R1 to R3 each report a result.
  for (const rule of ['Lease boundary and buffer', 'Approved pit floor', 'Permitted dump zones'])
    await expect(page.locator('.rule-result', { hasText: rule })).toBeVisible()
})

test('Show on map from the findings page lands on the map with that finding selected', async ({
  page,
}) => {
  await page.goto('/#/findings')
  const cards = page.locator('li.frow')
  await expect(cards).toHaveCount(5, { timeout: 60_000 })

  await cards.first().getByRole('button', { name: 'Show on map' }).click()

  await expect(page).toHaveURL(/#\/monitor(\?finding=[\w-]+)?$/)
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('tab', { name: 'Findings' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toHaveCount(1)
})

test('the sidebar opens as a slim rail and expanding it sticks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/overview')
  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  const width = async () => (await page.locator('#sidebar').boundingBox())?.width ?? 0

  // Content gets the width; link names stay for screen readers.
  await expect.poll(width).toBeLessThan(100)
  await expect(nav.getByRole('link', { name: '3D map' })).toBeVisible()
  await nav.getByRole('link', { name: '3D map' }).click()
  await expect.poll(width).toBeLessThan(100)

  // Expanding it by hand is remembered on the other pages too.
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect.poll(width).toBeGreaterThan(200)
  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect.poll(width).toBeGreaterThan(200)

  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect.poll(width).toBeLessThan(100)
})

test('on a phone the menu button opens the navigation drawer and Escape closes it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/overview')

  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  await expect(nav).toBeHidden()

  const menu = page.getByRole('button', { name: 'Menu' })
  await menu.click()
  await expect(nav).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await expect(menu).toBeFocused()

  await menu.click()
  await nav.getByRole('link', { name: 'Permit rules' }).click()
  await expect(page).toHaveURL(/#\/rules$/)
  await expect(nav).toBeHidden()
})

test('leaving the map forgets the fly-to, so the next visit opens with the intro', async ({
  page,
}) => {
  await page.goto('/#/findings')
  await page.locator('li.frow').first().getByRole('button', { name: 'Show on map' }).click()
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })

  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  await nav.getByRole('link', { name: 'Overview' }).click()
  await nav.getByRole('link', { name: '3D map' }).click()
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })

  // The selection (what the viewer chose) survives; only the camera request is dropped.
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toHaveCount(1)
})

test('the findings can be downloaded as a CSV that says it is simulated', async ({ page }) => {
  await page.goto('/#/findings')
  await expect(page.locator('li.frow')).toHaveCount(5, { timeout: 60_000 })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^pitwatch-findings-.*\.csv$/)
  const text = await (await import('node:fs/promises')).readFile((await download.path())!, 'utf8')
  const lines = text.trim().split(/\r?\n/)
  expect(lines).toHaveLength(6)
  expect(lines[0]).toContain('id,rule,status,severity')
  for (const line of lines.slice(1)) expect(line.endsWith(',simulated')).toBe(true)
})
