import { expect, test } from '@playwright/test'

// The landing page draws the same Terrain component as the map, and that component read the
// map's Terrain switch out of the app store. Turning the switch off on the map therefore emptied
// the landing model, which has no control of its own to bring it back.
//
// No test can see a shader and the page exposes no scene graph, so this compares canvas
// screenshots. The first half proves the probe notices a hidden terrain on the map; the second
// asserts the same switch does not change the landing model.

test.use({ reducedMotion: 'reduce' })

const relativeChange = (a: Buffer, b: Buffer) => Math.abs(a.length - b.length) / a.length

async function settle(page: import('@playwright/test').Page, ms = 2500) {
  await page.waitForTimeout(ms)
  return page.locator('canvas').first().screenshot()
}

test('the landing model survives the map Terrain switch', async ({ page }) => {
  // A reference landing shot with the terrain switch untouched.
  await page.goto('/#/')
  const before = await settle(page)

  await page.goto('/#/monitor')
  const camera = page.getByRole('group', { name: 'Camera view' })
  await expect(camera).toBeVisible({ timeout: 30_000 })
  // A fixed pose, so only the terrain changes between the two map shots.
  await camera.getByRole('button', { name: 'Top' }).click()
  const withTerrain = await settle(page)

  await page.getByRole('switch', { name: 'Terrain' }).click()
  const withoutTerrain = await settle(page, 1200)
  // The switch still works, and the probe can tell a hidden terrain from a drawn one.
  expect(relativeChange(withTerrain, withoutTerrain)).toBeGreaterThan(0.2)

  // Back on the landing page the model is still drawn: nothing about the map's switch leaks in.
  await page.goto('/#/')
  const after = await settle(page)
  expect(relativeChange(before, after)).toBeLessThan(0.01)
})
