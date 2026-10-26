import { expect, test } from '@playwright/test'

// Phones had no layer control at all: the floating Map card is display-none below `md`, and the
// Details drawer held only data tabs. The switches now render in the drawer below `md`, from the
// same component the card uses, so exactly one set exists at any width.

const SWITCHES = [
  'Terrain',
  'Elevation tint',
  'Contours',
  'Lease boundary',
  'Safety buffer',
  'Permitted zones',
  'Change since baseline',
  'Findings',
]

test.use({ reducedMotion: 'reduce' })

test('every layer switch and the exaggeration slider are reachable from the phone drawer', async ({
  page,
}) => {
  // Building the larger site takes a while under a parallel browser run.
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/monitor')
  await page.getByRole('group', { name: 'Camera view' }).waitFor({ timeout: 60_000 })

  // The floating card is gone at this width.
  await expect(page.getByRole('navigation', { name: 'Map' })).toBeHidden()

  await page.getByRole('button', { name: 'Details' }).click()
  const drawer = page.getByRole('complementary', { name: 'Details' })
  await expect(drawer).toBeVisible()

  // The switches sit in a collapsed disclosure so the drawer opens on the findings.
  const layers = drawer.locator('details').filter({ hasText: 'Map layers and vertical scale' })
  await expect(layers.locator('summary')).toHaveAccessibleName('Map layers and vertical scale')
  await expect(drawer.getByRole('switch', { name: 'Terrain' })).toBeHidden()
  await layers.locator('summary').click()

  for (const label of SWITCHES) {
    const toggle = drawer.getByRole('switch', { name: label })
    await expect(toggle).toBeVisible()
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  }

  const slider = drawer.getByLabel('Vertical exaggeration')
  await expect(slider).toBeVisible()
  await slider.fill('2')
  await expect(slider).toHaveValue('2')
})

test('the first finding is visible when the drawer opens on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/monitor')
  await page.getByRole('group', { name: 'Camera view' }).waitFor({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Details' }).click()
  const drawer = page.getByRole('complementary', { name: 'Details' })
  await expect(drawer).toBeVisible()

  // The drawer opens on the findings: the first one is in view without scrolling, and it starts
  // near the tabs instead of under eight switches.
  const first = drawer.locator('#details-tabpanel li').first()
  await expect(first.getByRole('heading')).toBeVisible()
  const tabsBox = await drawer.getByRole('tablist').boundingBox()
  const findingBox = await first.boundingBox()
  const drawerBox = await drawer.boundingBox()
  expect(findingBox!.y).toBeLessThan(drawerBox!.y + drawerBox!.height)
  expect(findingBox!.y).toBeLessThanOrEqual(tabsBox!.y + 560)
})

test('no width shows two sets of layer controls', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/#/monitor')
  await page.getByRole('group', { name: 'Camera view' }).waitFor({ timeout: 30_000 })

  // Tablet: the floating card carries them, the drawer must not.
  await expect(page.getByRole('navigation', { name: 'Map' })).toBeVisible()
  await page.getByRole('button', { name: 'Details' }).click()
  const drawer = page.getByRole('complementary', { name: 'Details' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('switch')).toHaveCount(0)

  // Desktop: the drawer is permanent and still has none.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(drawer.getByRole('switch')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Map' }).getByRole('switch')).toHaveCount(8)
})
