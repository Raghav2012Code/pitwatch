import { expect, test } from '@playwright/test'

// The landing page draws the same Terrain component as the map, and that component read the
// map's Terrain switch out of the app store. Turning the switch off on the map therefore emptied
// the landing model, which has no control of its own to bring it back.
//
// No test can see a shader and the page exposes no scene graph, so this compares canvas
// screenshots. The first half proves the probe notices a hidden terrain on the map; the second
// asserts the same switch does not change the landing model.

test.use({ reducedMotion: 'reduce' })
// Two scene builds and four screenshots, on software WebGL. Fine alone; under a full parallel
// run the same work needs longer than the default budget.
test.setTimeout(90_000)

const relativeChange = (a: Buffer, b: Buffer) => Math.abs(a.length - b.length) / a.length

async function settle(page: import('@playwright/test').Page, ms = 2000) {
  const canvas = page.locator('canvas').first()
  // The scene chunk and the surveys are built lazily. Under a full parallel run that takes
  // longer than a fixed sleep allows, and a half-built canvas would compare unequal for the
  // wrong reason, so wait for the canvas to exist and to have been resized off its 300x150
  // default first.
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(300)
  await page.waitForTimeout(ms)
  return canvas.screenshot()
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
