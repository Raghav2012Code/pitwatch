import { expect, test } from '@playwright/test'

// The honesty marker is a project rule, not decoration: it has to be on screen at every width,
// on both screens. Phones previously dropped it entirely, and the home corner stacked its badge
// beside the CTA where the floating brand would have overlapped it.
const WIDTHS = [390, 800, 1440]

for (const width of WIDTHS) {
  test(`the simulated-data note and badge are visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })

    await page.goto('/')
    // The landing page only carries a small note; the dashboard keeps the full badge.
    const homeBadge = page.locator('.sim-note', { hasText: 'Simulated data' })
    await expect(homeBadge).toBeVisible()

    // On phones the corner stacks, so the badge must not sit on top of the floating brand.
    const brand = page.getByRole('link', { name: 'PitWatch home' })
    const [b, br] = await Promise.all([homeBadge.boundingBox(), brand.boundingBox()])
    if (b && br) {
      const overlaps = !(
        b.x + b.width <= br.x ||
        br.x + br.width <= b.x ||
        b.y + b.height <= br.y ||
        br.y + br.height <= b.y
      )
      expect(overlaps).toBe(false)
    }

    await page.goto('/#/monitor')
    await expect(page.locator('.stamp', { hasText: 'SIMULATED DATA' })).toBeVisible()
  })
}
