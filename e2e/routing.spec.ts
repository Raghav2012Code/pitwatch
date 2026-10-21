import { expect, test } from '@playwright/test'

test('an unknown hash is rewritten to the home hash', async ({ page }) => {
  await page.goto('/#/typo')

  // The page renders home either way, so the URL is the thing that has to tell the truth.
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('main')).toBeVisible()
})

test('a deeper monitor path is rewritten to the home hash', async ({ page }) => {
  await page.goto('/#/monitor/extra')

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('main')).toBeVisible()
})
