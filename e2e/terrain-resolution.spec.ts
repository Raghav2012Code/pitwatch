import { expect, test } from '@playwright/test'

test('keeps the terrain map usable across widths and explains its survey resolution', async ({
  page,
}) => {
  await page.goto('/#/monitor')

  // The worker builds both surveys before the scene is ready.
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 30_000,
  })

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  for (const width of [1440, 1100, 800, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => (await canvas.boundingBox())?.width ?? 0, { timeout: 10_000 })
      .toBeGreaterThan(0)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }

  await page
    .getByRole('group', { name: 'Camera view' })
    .getByRole('button', { name: 'Pit' })
    .click()
  await expect(canvas).toBeVisible()

  await page.goto('/#/uncertainty')
  await expect(page.getByRole('heading', { name: 'Why survey resolution matters' })).toBeVisible()
  await expect(page.getByText(/4 m cells/)).toBeVisible()
  await expect(page.getByText(/513 × 513/)).toBeVisible()
})
