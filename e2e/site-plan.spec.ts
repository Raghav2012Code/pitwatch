import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('every site-plan pin opens its own finding on the map', async ({ page }) => {
  for (const id of ['R1-1', 'R2-1', 'R1-2', 'R3-1', 'R1-3']) {
    await page.goto('/#/overview')
    const plan = page.getByRole('group', { name: /Plan of the mine from above/ })
    await expect(plan.getByRole('button')).toHaveCount(5, { timeout: 30_000 })
    await plan.getByRole('button', { name: new RegExp(`^${id},`) }).click()
    await expect(page).toHaveURL(/#\/monitor$/)
    await expect(page.locator('.finding[data-selected]')).toContainText(id)
  }
})

test('site-plan pins can be activated with Enter and Space', async ({ page }) => {
  for (const key of ['Enter', 'Space']) {
    await page.goto('/#/overview')
    const pin = page.getByRole('button', { name: /^R2-1, Approved pit floor/ })
    await pin.focus()
    await expect(pin).toBeFocused()
    await page.keyboard.press(key)
    await expect(page).toHaveURL(/#\/monitor$/)
    await expect(page.locator('.finding[data-selected]')).toContainText('R2-1')
  }
})

test('the phone site plan fits and its pins can be tapped', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    await page.goto('/#/overview')
    const plan = page.getByRole('group', { name: /Plan of the mine from above/ })
    const pin = plan.getByRole('button', { name: /^R1-1,/ })
    await pin.scrollIntoViewIfNeeded()
    const box = await plan.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    await pin.tap()
    await expect(page).toHaveURL(/#\/monitor$/)
    await page.getByRole('button', { name: 'Details', exact: true }).click()
    await expect(page.locator('.finding[data-selected]')).toContainText('R1-1')
  } finally {
    await context.close()
  }
})

test('the short-screen map keeps exaggeration reachable and the key stays user-controlled', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/#/monitor')
  const panel = page.getByRole('navigation', { name: 'Map', exact: true })
  const slider = panel.getByLabel('Vertical exaggeration')
  await expect(slider).toBeVisible({ timeout: 30_000 })
  await expect(slider).toBeInViewport()
  const key = panel.locator('details')
  await expect(key).not.toHaveAttribute('open')
  await key.locator('summary').click()
  await expect(key).toHaveAttribute('open')
  await slider.fill('2')
  await expect(slider).toHaveValue('2')
  await expect(key).toHaveAttribute('open')
  await key.locator('summary').click()
  await expect(key).not.toHaveAttribute('open')
})

test('the plan is drawn: a vector change layer, an area per finding and its id in text', async ({
  page,
}) => {
  await page.goto('/#/overview')
  const plan = page.getByRole('group', { name: /Plan of the mine from above/ })
  await expect(plan.getByRole('button')).toHaveCount(5, { timeout: 30_000 })
  // No raster anywhere in the figure: the change layer is a path, not a picture.
  await expect(plan.locator('image')).toHaveCount(0)
  await expect(plan.locator('path.plan-change')).toHaveCount(2)
  await expect(plan.locator('path.plan-area')).toHaveCount(5)
  expect(await plan.locator('path.plan-contour').count()).toBeGreaterThan(2)
  for (const id of ['R1-1', 'R2-1', 'R1-2', 'R3-1', 'R1-3']) {
    await expect(plan.locator('.plan-pin-id').filter({ hasText: id })).toHaveCount(1)
  }
})

test('every site-plan pin is a 44 px target on a phone', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    await page.goto('/#/overview')
    const pins = page
      .getByRole('group', { name: /Plan of the mine from above/ })
      .locator('.plan-pin')
    await expect(pins).toHaveCount(5, { timeout: 30_000 })
    for (const box of await pins.evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().toJSON()),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  } finally {
    await context.close()
  }
})

test('the scale bar and north sit in the margin band, off the drawing', async ({ page }) => {
  await page.goto('/#/overview')
  await expect(page.locator('.plan-pin')).toHaveCount(5, { timeout: 30_000 })
  const frame = await page.locator('.plan-frame').boundingBox()
  const band = await page.locator('.plan-band').boundingBox()
  expect(frame).not.toBeNull()
  expect(band).not.toBeNull()
  // The band starts where the map field ends, so no part of the furniture is over the lease.
  expect(band!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height - 1)
  for (const sel of ['.plan-scale', '.plan-north']) {
    const box = await page.locator(sel).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(band!.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(band!.y + band!.height)
  }
})

test('the plan fits at 390, 800, 1100 and 1440 px wide', async ({ page }) => {
  for (const width of [390, 800, 1100, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/overview')
    await expect(page.locator('.plan-pin')).toHaveCount(5, { timeout: 30_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const sheet = await page.locator('.plan-sheet').boundingBox()
    expect(sheet!.x).toBeGreaterThanOrEqual(0)
    expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(width)
  }
})
