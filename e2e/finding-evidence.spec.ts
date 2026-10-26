import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('Show on map restores the current terrain, finding layer, and selected evidence', async ({
  page,
}) => {
  // The map now renders the 513 × 513 terrain while this test changes routes repeatedly.
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/monitor')

  const map = page.getByRole('navigation', { name: 'Map', exact: true })
  const terrain = map.getByRole('switch', { name: 'Terrain' })
  const findings = map.getByRole('switch', { name: 'Findings' })
  await expect(terrain).toBeEnabled({ timeout: 60_000 })
  await page.getByRole('button', { name: /Baseline/ }).click()
  await terrain.click()
  await findings.click()
  await expect(page.locator('.scene-wrap')).toHaveAttribute(
    'aria-label',
    /baseline survey\. Terrain is hidden\. Findings are not shown on the baseline survey\./i,
  )

  const detailsToggle = page.getByRole('button', { name: 'Details panel' })
  await detailsToggle.click()
  await expect(detailsToggle).toHaveAttribute('aria-pressed', 'false')

  const nav = page.getByRole('navigation', { name: 'Dashboard' })
  await nav.getByRole('link', { name: 'Findings' }).click()
  const cards = page.locator('li.frow')
  await expect(cards).toHaveCount(5, { timeout: 60_000 })
  await cards.first().getByRole('button', { name: 'Show on map' }).click()

  await expect(page).toHaveURL(/#\/monitor$/)
  await expect(page.getByRole('slider', { name: 'Survey shown on the map' })).toHaveAttribute(
    'aria-valuetext',
    'Current survey',
  )
  await expect(terrain).toHaveAttribute('aria-checked', 'true')
  await expect(findings).toHaveAttribute('aria-checked', 'true')
  await expect(detailsToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toHaveCount(1)
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toContainText('R1-1')
  await expect(page.locator('.scene-wrap')).toHaveAttribute(
    'aria-label',
    /current survey\. Terrain is visible\. Findings overlay is on, with 5 findings marked\. Finding R1-1 selected\./i,
  )
  await expect(page.locator('.map-chip').filter({ hasText: 'at centre' })).toHaveText(
    /(?:20|50) m at centre/,
  )

  // A second selection must replace the first throughout the list and map description.
  await nav.getByRole('link', { name: 'Findings' }).click()
  await page.locator('li.frow').nth(1).getByRole('button', { name: 'Show on map' }).click()
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toContainText('R2-1')
  await expect(page.locator('.scene-wrap')).toHaveAttribute(
    'aria-label',
    /Finding R2-1 selected\./i,
  )

  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect(page.locator('li.attention[data-selected]')).toContainText('R2-1')
  const plan = page.getByRole('group', { name: /Plan of the mine from above/ })
  await expect(plan.getByRole('button', { name: /^R2-1,/ })).toHaveAttribute('aria-pressed', 'true')

  await plan.getByRole('button', { name: /^R1-3,/ }).click()
  await expect(page).toHaveURL(/#\/monitor$/)
  await expect(page.locator('#details-tabpanel li.finding[data-selected]')).toContainText('R1-3')
  await nav.getByRole('link', { name: 'Findings' }).click()
  await expect(page.locator('li.frow[data-selected]')).toContainText('R1-3')
})

test('the phone map clears the drawer after selection and keeps the finding on reopen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/monitor')

  const toggle = page.locator('button[aria-controls="side-panel"]')
  const drawer = page.getByRole('complementary', { name: 'Details' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(drawer).toBeVisible()
  await expect(drawer.locator('li.finding')).toHaveCount(5, { timeout: 60_000 })

  await drawer.locator('li.finding').nth(1).getByRole('button', { name: 'Show on map' }).click()

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(drawer).toBeHidden()
  await expect(page.locator('.scene-wrap')).toHaveAttribute(
    'aria-label',
    /Finding R2-1 selected\./i,
  )

  await toggle.click()
  await expect(drawer).toBeVisible()
  await expect(drawer.locator('li.finding[data-selected]')).toContainText('R2-1')
})
