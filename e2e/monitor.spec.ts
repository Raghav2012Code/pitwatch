import { expect, test } from '@playwright/test'

test('loads the monitor and shows the seeded findings', async ({ page }) => {
  await page.goto('/#/monitor')

  // The top bar's overall status comes straight from the rule engine. The worker needs a
  // moment to build both surveys, hence the generous timeout.
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 60_000,
  })

  await page.getByRole('tab', { name: 'Findings' }).click()
  await expect(page.locator('#details-tabpanel li.finding')).toHaveCount(5)

  // The seeded scenario is locked by a unit-test snapshot; this proves it reaches the DOM.
  for (const id of ['R1-1', 'R2-1', 'R1-2', 'R3-1', 'R1-3']) {
    await expect(page.getByText(id, { exact: true })).toBeVisible()
  }
})
