import { expect, test } from '@playwright/test'

test('the landing page opens the dashboard', async ({ page }) => {
  await page.goto('/')

  const open = page.getByRole('link', { name: 'Open the dashboard' }).first()
  await expect(open).toBeVisible()
  await open.click()

  await expect(page).toHaveURL(/#\/overview$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  // The overview waits for the rule engine, so its verdict is the readiness signal.
  await expect(
    page.getByRole('heading', { level: 2, name: '2 violations, 3 warnings' }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Venthar Ridge Iron Pit')).toBeVisible()
})

test('the landing model is driven by buttons, not by scrolling', async ({ page }) => {
  await page.goto('/')

  const views = page.getByRole('group', { name: 'What the model shows' })
  await expect(views).toBeVisible()
  // It opens on the findings, the result worth seeing first.
  await expect(views.getByRole('button', { name: 'Findings' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await views.getByRole('button', { name: 'Baseline' }).click()
  await expect(views.getByRole('button', { name: 'Baseline' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('heading', { name: /Baseline survey, 14 Nov 2025/ })).toBeVisible()

  await views.getByRole('button', { name: 'Current' }).click()
  await expect(page.getByRole('heading', { name: /Current survey, 22 Aug 2026/ })).toBeVisible()
})

test('the landing page can open the 3D map directly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Explore the 3D map' }).click()
  await expect(page).toHaveURL(/#\/monitor$/)
  await expect(page.getByRole('heading', { level: 1, name: '3D map' })).toBeVisible()
})
