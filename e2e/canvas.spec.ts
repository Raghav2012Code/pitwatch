import { expect, test } from '@playwright/test'

test('renders the 3D canvas without errors', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`)
  })

  await page.goto('/#/monitor')

  // The worker builds both surveys on first load; readiness is the top bar's engine output.
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText('Building the terrain model')).toHaveCount(0)

  const canvas = page.locator('canvas')
  // The scene chunk is fetched after the surveys are ready, and the suite runs several browsers
  // in parallel, so this needs the same budget as the readiness wait above.
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  // R3F sizes the canvas from a ResizeObserver, so it briefly keeps the 300x150 default.
  await expect
    .poll(async () => (await canvas.boundingBox())?.height ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(200)
  const box = await canvas.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(200)

  // A mounted R3F canvas keeps a live WebGL context; losing it is what this guards.
  const hasContext = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  })
  expect(hasContext).toBe(true)

  expect(problems).toEqual([])
})
