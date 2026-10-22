import { expect, test } from '@playwright/test'

// The Overview's figures put a provenance tag beside the label. The grid is two columns at phone
// width, and "Removed outside the lease" wrapped against its tag there, so below sm the tag drops
// under the label and from sm up the two share a line.

const FIGURE = '.figures .figure'

async function openFigure(page: import('@playwright/test').Page) {
  await page.goto('/#/overview')
  const figure = page.locator(FIGURE).filter({ hasText: 'Removed outside the lease' })
  // The figures are built by the rule engine, so they are the readiness signal.
  await expect(figure).toBeVisible({ timeout: 30_000 })
  return figure
}

/** The label is a bare text node in the <dt>, so it is measured with a range. */
async function labelAndTag(figure: import('@playwright/test').Locator) {
  return figure.evaluate((el) => {
    const dt = el.querySelector('dt')!
    const range = document.createRange()
    range.selectNodeContents(dt.firstChild!)
    const label = range.getBoundingClientRect()
    const tag = dt.querySelector('.prov-derived')!.getBoundingClientRect()
    return {
      labelTop: label.top,
      labelBottom: label.bottom,
      tagTop: tag.top,
      tagBottom: tag.bottom,
    }
  })
}

test('on a phone the metric label and its provenance tag stack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const figure = await openFigure(page)

  const box = await labelAndTag(figure)
  // The tag is on its own line, under the label: the two boxes do not overlap.
  expect(box.tagTop).toBeGreaterThanOrEqual(box.labelBottom - 1)
  // And it is still inside the same figure, not pushed out of it.
  await expect(figure.locator('.prov-derived')).toBeVisible()
})

test('from sm up the label and its provenance tag stay on one line', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const figure = await openFigure(page)

  const box = await labelAndTag(figure)
  // Beside the label, so the tag starts before the label's line ends.
  expect(box.tagTop).toBeLessThan(box.labelBottom)
})
