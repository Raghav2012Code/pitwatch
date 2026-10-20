import { expect, test } from '@playwright/test'

test('home story loads and reaches the monitor', async ({ page }) => {
  await page.goto('/')

  const openMonitor = page.getByRole('link', { name: 'Open the monitor' }).first()
  await expect(openMonitor).toBeVisible()
  await openMonitor.click()

  await expect(page).toHaveURL(/#\/monitor$/)
  // The monitor is ready once the rule engine has reported, even if its 3D chunk is still
  // arriving, so wait for the status before the canvas.
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole('heading', { name: 'Venthar Ridge Iron Pit' })).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
})
