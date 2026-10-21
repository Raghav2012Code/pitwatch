import { expect, test } from '@playwright/test'

// The stage is narrower than the camera group plus the scale chip until about 1100 px, and the
// chip used to paint over the presets and swallow their clicks. These widths bracket the audit
// findings (phone, tablet, the 1024 px breakpoint, a wide desktop).
const WIDTHS = [390, 768, 1024, 1440]

// The HUD animates in from above, so the presets sit over the top bar for about a second after
// they first render. Reduced motion is a mode the app supports (and the a11y suite already
// exercises), and it puts every control straight at its resting place.
test.use({ reducedMotion: 'reduce' })

for (const width of WIDTHS) {
  test(`camera presets and the scale bar work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/#/monitor')

    // The camera group only renders once the surveys are built, and unlike the top-bar status
    // line it is visible at every width.
    const camera = page.getByRole('group', { name: 'Camera view' })
    await expect(camera).toBeVisible({ timeout: 30_000 })

    for (const preset of ['Oblique', 'Top', 'Pit']) {
      const button = camera.getByRole('button', { name: preset })
      await expect(button).toBeEnabled()

      // The regression this guards: the decorative scale chip covering the button. Ask the DOM
      // what is actually on top at the button's centre, then click it.
      const onTop = await button.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return hit?.textContent?.trim() ?? null
      })
      expect(onTop).toBe(preset)

      // A generous budget: the suite runs many software-WebGL browsers at once, and the click
      // action itself (not the assertion above) is what gets starved of main-thread time.
      await button.click({ timeout: 15_000 })
    }

    // The chip is decorative and aria-hidden, but the reading must still be on screen.
    await expect(page.locator('.map-chip', { hasText: 'at centre' })).toBeVisible()
  })
}
