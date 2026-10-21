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
