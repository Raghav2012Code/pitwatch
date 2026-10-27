import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// Entrance animations start at opacity 0. Reduced motion is the app's own supported mode and
// keeps the scan on the steady state instead of a mid-fade frame.
test.use({ reducedMotion: 'reduce' })

/** Critical and serious WCAG A/AA violations, as readable lines. */
async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test('home has no critical or serious accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Open the dashboard' }).first()).toBeVisible()

  expect(await seriousViolations(page)).toEqual([])
})

for (const route of ['terms', 'license', 'contact']) {
  test(`${route} has no critical or serious accessibility violations`, async ({ page }) => {
    await page.goto(`/#/${route}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
}

// Every dashboard page, once the engine has reported, so the scan sees real content.
for (const route of ['overview', 'findings', 'rules', 'uncertainty', 'about']) {
  test(`${route} has no critical or serious accessibility violations`, async ({ page }) => {
    await page.goto(`/#/${route}`)
    await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    expect(await seriousViolations(page)).toEqual([])
  })
}

test('the phone navigation drawer is clean', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/overview')
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Dashboard' })).toBeVisible()

  expect(await seriousViolations(page)).toEqual([])
})

test('Keyboard stays inside the open phone navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/overview')
  const menu = page.getByRole('button', { name: 'Menu' })
  await menu.click()
  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  await expect(nav).toBeVisible()

  const insideNav = page.locator('#sidebar :focus')
  const stops = await nav.locator('a[href], button:not([disabled])').count()
  expect(stops).toBeGreaterThan(1)

  // Opening the drawer moved focus into it, and no number of Tabs walks out.
  await expect(insideNav).toHaveCount(1)
  for (let i = 0; i < stops + 2; i++) await page.keyboard.press('Tab')
  await expect(insideNav).toHaveCount(1)
  await page.keyboard.press('Shift+Tab')
  await expect(insideNav).toHaveCount(1)

  // Escape closes the drawer and focus returns to the button that opened it.
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await expect(menu).toBeFocused()
})

test('monitor has no critical or serious accessibility violations', async ({ page }) => {
  // The 513 × 513 terrain uses more software-rendering work than the former 257 × 257 grid.
  test.setTimeout(60_000)
  await page.goto('/#/monitor')
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText('Building the terrain model')).toHaveCount(0, { timeout: 60_000 })

  expect(await seriousViolations(page)).toEqual([])
})

test('the phone monitor and its open drawer are clean', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/monitor')
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })

  // The drawer holds the layer switches below `md`; it has to be open to be scanned.
  await page.getByRole('button', { name: 'Details' }).click()
  await expect(page.getByRole('complementary', { name: 'Details' })).toBeVisible()

  expect(await seriousViolations(page)).toEqual([])
})
