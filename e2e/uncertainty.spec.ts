import { expect, test } from '@playwright/test'

// The calculator used to teach one line — the noise band kσ — while the engine reports a change
// only beyond minChange + kσ. The 0.40 m example was therefore called a real change when it is
// not reportable under R1 or R3. These checks pin the two thresholds apart and pin the wording
// of the simulated scenario on the pages that used to claim a real breach.

const calculator = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-labelledby="noise-title"]')

const cell = (page: import('@playwright/test').Page, name: string) =>
  calculator(page).locator('dl div').filter({ hasText: name })

test('the noise band and the R1/R3 threshold are shown as separate figures', async ({ page }) => {
  await page.goto('/#/uncertainty')
  const calc = calculator(page)
  await expect(calc.getByRole('heading', { name: 'When is a change reportable?' })).toBeVisible()

  // Default preset: σ1 = σ2 = 0.05 m, so the band is 0.14 m and the threshold 0.64 m.
  await expect(cell(page, 'Noise band')).toContainText('0.14 m')
  await expect(cell(page, 'R1/R3 threshold')).toContainText('0.64 m')

  // 0.40 m clears the noise but not the reporting threshold, and the page says exactly that.
  const verdict = calc.locator('p[role="status"]')
  await expect(verdict).toContainText('Distinguishable from the noise, not reportable')
  await expect(verdict).toContainText('0.40 m')
  await expect(verdict).toContainText('0.64 m')

  // R2 is explained separately: no minimum-change allowance, current survey's σ alone.
  await expect(calc).toContainText('R2 compares the ground with the approved pit floor')
  await expect(calc).toContainText('2σ2 = 0.10 m')
})

test('a preset and a slider move the figures and the wording together', async ({ page }) => {
  await page.goto('/#/uncertainty')
  const calc = calculator(page)
  const verdict = calc.locator('p[role="status"]')

  await calc.getByRole('button', { name: 'Global elevation models' }).click()
  // σ1 = σ2 = 4 m: band 11.3 m, threshold 11.8 m, and the 6 m change is inside the band.
  await expect(cell(page, 'Noise band')).toContainText('11.3 m')
  await expect(cell(page, 'R1/R3 threshold')).toContainText('11.8 m')
  await expect(verdict).toContainText('Could be survey noise')
  await expect(verdict).toContainText('11.3 m')

  // 12 m clears 11.8 m, so the verdict and its numbers move with the slider.
  await calc.getByLabel('Measured change in ground height').fill('12')
  await expect(verdict).toContainText('Reportable under R1 and R3')
  await expect(verdict).toContainText('11.8 m')
  await expect(verdict).not.toContainText('Could be survey noise')
})

test('no page claims a real permit was broken', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See where a simulated mine')
  // The findings view's caption describes the engine's classification of a simulated scenario.
  await expect(page.locator('.hero-controls')).toContainText(
    'ground the engine classifies as breaking the lease in this simulated scenario',
  )

  await page.goto('/#/findings')
  const findings = page.locator('main')
  // The page waits for the surveys, which take longer under a full parallel run.
  await expect(findings).toContainText("the demo engine's classifications of a simulated change", {
    timeout: 60_000,
  })
  await expect(findings).toContainText('not a legal determination')

  await page.goto('/#/rules')
  const tests = page.locator('.permit-test code')
  await expect(tests).toHaveCount(3)
  await expect(tests.nth(0)).toContainText('0.5 m + 2σ')
  await expect(tests.nth(1)).toContainText('2σ2')
  await expect(tests.nth(1)).toContainText('no minimum change')
  await expect(tests.nth(2)).toContainText('0.5 m + 2σ')
  await expect(page.locator('main')).toContainText(
    'R2 measures the ground against a fixed approved floor',
  )

  await page.goto('/#/about')
  await expect(page.locator('main')).toContainText('violation and warning are its labels')
})
