import { expect, test } from '@playwright/test'

// Both floating panels used to be open on arrival, which left the model a narrow stage between
// them: 372 px at 1100 px. Below 1280 px the findings panel now starts closed, and the visible
// header button brings it back.

test.use({ reducedMotion: 'reduce' })

test('the map gives the model room at laptop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 })
  await page.goto('/#/monitor')
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })

  // The findings panel starts closed, so the stage is the width of the map area minus the map
  // card: 1036 px of map less 272 px of card.
  const details = page.getByRole('complementary', { name: 'Details' })
  await expect(details).toBeHidden()
  const stage = page.locator('.stage')
  const open = (await stage.boundingBox())!.width
  expect(open).toBeGreaterThanOrEqual(600)

  // The map card is still there, so the layers, the key and the scale stay reachable.
  await expect(page.getByRole('navigation', { name: 'Map' })).toBeVisible()

  // A visible control opens the findings panel again, and the stage gives the room back.
  const toggle = page.getByRole('button', { name: 'Details panel' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(details).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect((await stage.boundingBox())!.width).toBeLessThan(open)
})

test('the map card folds away at 800 px and comes back on request', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/#/monitor')
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })

  const card = page.getByRole('navigation', { name: 'Map' })
  const toggle = page.getByRole('button', { name: 'Map panel' })
  const stage = page.locator('.stage')
  const stageWidth = async () => (await stage.boundingBox())!.width

  // Below `lg` the card starts folded: the model owns the stage, and the header control that
  // brings the card back is visible at this width.
  await expect(card).toBeHidden()
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  const folded = await stageWidth()
  expect(folded).toBeGreaterThanOrEqual(700)

  // One press restores the card, its layers and the exaggeration; the stage gives the room back.
  await toggle.click()
  await expect(card).toBeVisible()
  await expect(card.getByLabel('Vertical exaggeration')).toBeVisible({ timeout: 60_000 })
  await expect(card.getByRole('switch', { name: 'Terrain' })).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(stageWidth).toBeLessThan(folded - 200)

  // Folding again gives the model the full width.
  await toggle.click()
  await expect(card).toBeHidden()
  await expect.poll(stageWidth).toBeGreaterThan(folded - 1)

  // The visitor's choice wins: reopening the card and resizing does not fold it again.
  await toggle.click()
  await expect(card).toBeVisible()
  await page.setViewportSize({ width: 1000, height: 900 })
  await expect(card).toBeVisible()
})

test('the findings panel is open on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/monitor')
  await expect(page.getByRole('group', { name: 'Camera view' })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('complementary', { name: 'Details' })).toBeVisible()
})
