import { expect, test } from '@playwright/test'

const FINDING_IDS = ['R1-1', 'R2-1', 'R1-2', 'R3-1', 'R1-3']
const VIEWPORTS = [390, 800, 1100, 1440]

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

test('the site plan is a labelled, data-backed vector map at supported widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: VIEWPORTS[0]!, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/overview')

  const plan = page.getByRole('group', { name: /Plan of the mine from above/ })
  await expect(plan.getByRole('button')).toHaveCount(FINDING_IDS.length, { timeout: 30_000 })
  const hitSizes = new Map<string, Box[]>()

  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await expect(plan).toBeVisible()
    await expect(plan.locator('.plan-change')).toHaveCount(2)
    await expect(plan.locator('.plan-contour')).not.toHaveCount(0)
    await expect(plan.locator('.plan-finding-area')).toHaveCount(FINDING_IDS.length)
    await expect(plan.locator('image')).toHaveCount(0)

    const labels = await plan.locator('.plan-pin-label').allTextContents()
    expect(labels.map((label) => label.trim()).sort()).toEqual([...FINDING_IDS].sort())
    const markerBoxes: Box[] = []
    for (const id of FINDING_IDS) {
      const area = plan.locator(`[aria-label="${id} affected area"]`)
      await expect(area).toHaveAttribute('d', /.+/)
      const button = plan.getByRole('button', { name: new RegExp(`^${id},`) })
      await expect(button).toBeVisible()
      const hitBox = await button.locator('.plan-pin-hit').boundingBox()
      expect(hitBox, `${id} hit circle should have a box at ${width}px`).not.toBeNull()
      expect(hitBox!.width, `${id} hit width at ${width}px`).toBeGreaterThanOrEqual(44)
      expect(hitBox!.height, `${id} hit height at ${width}px`).toBeGreaterThanOrEqual(44)
      const sizes = hitSizes.get(id) ?? []
      sizes.push({ x: 0, y: 0, width: hitBox!.width, height: hitBox!.height })
      hitSizes.set(id, sizes)

      const markerBox = await button.boundingBox()
      expect(markerBox, `${id} marker and ID should have a box at ${width}px`).not.toBeNull()
      markerBoxes.push(markerBox!)
    }
    for (let i = 0; i < markerBoxes.length; i++) {
      for (let j = i + 1; j < markerBoxes.length; j++) {
        expect(
          boxesOverlap(markerBoxes[i]!, markerBoxes[j]!),
          `${FINDING_IDS[i]} and ${FINDING_IDS[j]} marker/ID boxes overlap at ${width}px`,
        ).toBe(false)
      }
    }

    const title = page.locator('.plan-title-block')
    await expect(title).toContainText('Venthar Ridge Iron Pit')
    await expect(title).toContainText('Current survey')
    await expect(title).toContainText('2026')
    await expect(title.locator('.prov-derived')).toBeVisible()
    await expect(title.locator('.plan-north-block')).toContainText('North')
    await expect(title.locator('.plan-scale-block')).toContainText('500 m')

    const scaleRatio = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>('svg.site-plan')
      const bar = document.querySelector<HTMLElement>('.plan-scale-track')
      if (!svg || !bar) return null
      return {
        ratio: bar.getBoundingClientRect().width / svg.clientWidth,
        viewBoxWidth: svg.viewBox.baseVal.width,
      }
    })
    expect(scaleRatio).not.toBeNull()
    expect(scaleRatio!.ratio).toBeCloseTo(500 / scaleRatio!.viewBoxWidth, 2)

    const hasRasterDataUrl = await plan.evaluate((svg) => /data:image\//i.test(svg.outerHTML))
    expect(hasRasterDataUrl).toBe(false)
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasHorizontalOverflow, `document overflows at ${width}px`).toBe(false)

    for (const selector of ['.plan-observed-cut-label', '.plan-observed-fill-label']) {
      const labels = await plan.locator(selector).all()
      expect(labels.length, `${selector} should exist at ${width}px`).toBeGreaterThan(0)
      for (const label of labels) {
        await expect(label).toBeVisible()
        const labelBox = await label.boundingBox()
        expect(labelBox, `${selector} should have a box at ${width}px`).not.toBeNull()
        for (const [index, markerBox] of markerBoxes.entries()) {
          expect(
            boxesOverlap(labelBox!, markerBox),
            `${selector} overlaps marker/ID ${FINDING_IDS[index]} at ${width}px: ${JSON.stringify({ labelBox, markerBox })}`,
          ).toBe(false)
        }
      }
    }

    const transitionDuration = await plan
      .getByRole('button', { name: /^R1-1,/ })
      .locator('.plan-pin-disc')
      .evaluate((circle) => getComputedStyle(circle).transitionDuration)
    expect(
      transitionDuration.split(',').every((duration) => Number.parseFloat(duration) <= 0.00002),
    ).toBe(true)
  }

  for (const id of FINDING_IDS) {
    const sizes = hitSizes.get(id)
    expect(sizes, `${id} hit sizes should be collected at every viewport`).toHaveLength(
      VIEWPORTS.length,
    )
    const widths = sizes!.map(({ width }) => width)
    const heights = sizes!.map(({ height }) => height)
    expect(
      Math.max(...widths) - Math.min(...widths),
      `${id} hit width changes by viewport`,
    ).toBeLessThanOrEqual(0.1)
    expect(
      Math.max(...heights) - Math.min(...heights),
      `${id} hit height changes by viewport`,
    ).toBeLessThanOrEqual(0.1)
  }
})
