import { expect, test, type Page } from '@playwright/test'

// Choosing a point used to need a mouse: the 3D canvas only emits a pick on a pointer click.
// These tests drive the new Inspector coordinate form with the keyboard only. `locator.focus()`
// is a programmatic focus and `page.keyboard` dispatches key events, so neither is a pointer
// event; the flow a keyboard user sees is exactly what is exercised here.

test.use({ reducedMotion: 'reduce' })

/** Waits for the worker-built surveys; the camera group only renders once they are ready. */
async function openMonitor(page: Page) {
  await page.goto('/#/monitor')
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 30_000 })
}

/** Opens the Inspector tab from the keyboard. */
async function openInspector(page: Page) {
  const tab = page.getByRole('tab', { name: 'Inspector' })
  await tab.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('East', { exact: true })).toBeVisible()
}

/** Fills both fields, moving East -> North with Tab, and submits with Enter in North. */
async function enterCoordinate(page: Page, east: string, north: string) {
  await page.getByLabel('East', { exact: true }).focus()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(east)
  await page.keyboard.press('Tab')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(north)
  await page.keyboard.press('Enter')
}

test('a typed coordinate reads the point and announces it', async ({ page }) => {
  await openMonitor(page)
  await openInspector(page)

  const east = page.getByLabel('East', { exact: true })
  const north = page.getByLabel('North', { exact: true })
  const submit = page.getByRole('button', { name: 'Read point' })

  // East -> North -> submit is the tab order, and Enter in either field submits.
  await east.focus()
  await expect(east).toBeFocused()
  await page.keyboard.type('1024')
  await page.keyboard.press('Tab')
  await expect(north).toBeFocused()
  await page.keyboard.type('900')
  await page.keyboard.press('Tab')
  await expect(submit).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(north).toBeFocused()
  await page.keyboard.press('Enter')

  // The Inspector reports the point, exactly as a click there would.
  await expect(page.getByText('Selected point')).toBeVisible()
  await expect(
    page.locator('#details-tabpanel dd').filter({ hasText: 'E 1,024 m, N 900 m' }),
  ).toBeVisible()

  // The live region carries the outcome for a screen reader.
  await expect(page.locator('form').getByRole('status')).toHaveText('Read E 1,024 m, N 900 m.')
})

test('typed coordinates set measure A and B and produce a distance', async ({ page }) => {
  await openMonitor(page)

  // `m` toggles the tool from the page, not from a pointer.
  await page.keyboard.press('m')
  await openInspector(page)
  await expect(page.getByRole('button', { name: 'Measure' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await enterCoordinate(page, '900', '800')
  await expect(page.getByText('Point A is set at E 900 m, N 800 m.')).toBeVisible()

  await enterCoordinate(page, '1100', '800')
  // A complete measurement now renders the rows the inspector shows after two clicks.
  await expect(page.locator('#details-tabpanel dt', { hasText: 'Horizontal' })).toBeVisible()
  await expect(page.locator('#details-tabpanel dt', { hasText: 'Average grade' })).toBeVisible()
})

test('a coordinate outside the grid is applied and reported honestly', async ({ page }) => {
  await openMonitor(page)
  await openInspector(page)

  await enterCoordinate(page, '2400', '1200')

  // It is still read, so the panel is not empty: the position is real, the elevation is not.
  await expect(page.getByText('Selected point')).toBeVisible()
  await expect(
    page.locator('#details-tabpanel dd').filter({ hasText: 'E 2,400 m, N 1,200 m' }),
  ).toBeVisible()
  const elevation = page
    .locator('#details-tabpanel dt', { hasText: 'Elevation' })
    .locator('xpath=following-sibling::dd')
  await expect(elevation).toHaveText('—')

  // The form says what cannot be known instead of leaving a silent blank, and the reading below
  // does not claim "no significant change" when it could not measure one.
  const status = page.locator('form').getByRole('status')
  await expect(status).toContainText('outside the survey grid')
  await expect(status).toContainText('elevations cannot be')
  await expect(page.getByText('No significant change')).toHaveCount(0)
  await expect(
    page.getByText('No reading here: the point is outside the survey grid.'),
  ).toBeVisible()
})

test('the coordinate form fits the phone drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openMonitor(page)

  await page.getByRole('button', { name: 'Details' }).click()
  const drawer = page.getByRole('complementary', { name: 'Details' })
  await expect(drawer).toBeVisible()
  await page.getByRole('tab', { name: 'Inspector' }).click()

  const form = page.locator('form')
  await expect(form).toBeVisible()
  await expect(page.getByLabel('East', { exact: true })).toBeVisible()
  await expect(page.getByLabel('North', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Read point' })).toBeVisible()

  // No horizontal overflow: the form's box stays inside the drawer and it does not scroll
  // sideways at 390 px.
  const [box, panel] = await Promise.all([form.boundingBox(), drawer.boundingBox()])
  expect(box).not.toBeNull()
  expect(panel).not.toBeNull()
  expect(box!.x + box!.width).toBeLessThanOrEqual(panel!.x + panel!.width + 0.5)
  expect(await form.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})
