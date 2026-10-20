import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Critical and serious WCAG A/AA violations, as readable lines. */
async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test('home has no critical or serious accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Open the monitor' }).first()).toBeVisible()

  expect(await seriousViolations(page)).toEqual([])
})

test('monitor has no critical or serious accessibility violations', async ({ page }) => {
  await page.goto('/#/monitor')
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText('Building the terrain model')).toHaveCount(0, { timeout: 30_000 })

  expect(await seriousViolations(page)).toEqual([])
})
