import { expect, test } from '@playwright/test'

test('the landing page opens the dashboard', async ({ page }) => {
  await page.goto('/')

  const open = page.getByRole('link', { name: 'Open the dashboard' }).first()
  await expect(open).toBeVisible()
  await open.click()

  await expect(page).toHaveURL(/#\/overview$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  // The overview waits for the rule engine, so its verdict is the readiness signal.
  await expect(
    page.getByRole('heading', { level: 2, name: '2 violations, 3 warnings' }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Venthar Ridge Iron Pit').first()).toBeVisible()
})

test('the landing model is driven by buttons, not by scrolling', async ({ page }) => {
  await page.goto('/')

  const views = page.getByRole('group', { name: 'What the model shows' })
  await expect(views).toBeVisible()
  // It opens on the findings, the result worth seeing first.
  await expect(views.getByRole('button', { name: 'Findings' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await views.getByRole('button', { name: 'Baseline' }).click()
  await expect(views.getByRole('button', { name: 'Baseline' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('heading', { name: /Baseline survey, 14 Nov 2025/ })).toBeVisible()

  await views.getByRole('button', { name: 'Current' }).click()
  await expect(page.getByRole('heading', { name: /Current survey, 22 Aug 2026/ })).toBeVisible()
})

// The hero used to open on its copy, so a phone's first screen had no model in it at all.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 800, height: 900 },
]) {
  test(`the landing model and both actions share the first screen at ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const stage = page.locator('.hero-stage')
    await expect(stage).toBeVisible()
    const box = await stage.boundingBox()
    expect(box).not.toBeNull()
    // On screen, and big enough that the model is worth looking at.
    expect(box!.y).toBeLessThan(viewport.height)
    expect(box!.y + box!.height).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThanOrEqual(200)
    // And nearly all of it inside the first screen: the model is why the page opens on it.
    // With the copy first the stage still intersected the fold, but only its top strip.
    await expect(stage).toBeInViewport({ ratio: 0.9 })

    // The live model itself, once the surveys are built.
    await expect(page.locator('.hero-model canvas')).toBeVisible({ timeout: 60_000 })

    await expect(page.locator('.hero-copy a[href="#/overview"]')).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.hero-copy a[href="#/monitor"]')).toBeInViewport({ ratio: 1 })
  })
}

test('the landing page can open the 3D map directly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Explore the 3D map' }).first().click()
  await expect(page).toHaveURL(/#\/monitor$/)
  await expect(page.getByRole('heading', { level: 1, name: '3D map' })).toBeVisible()
})

test('each step can be shown on the model, and the rules report the engine result', async ({
  page,
}) => {
  await page.goto('/')

  // The sections below the hero are wired back to the model above.
  await page.getByRole('button', { name: 'How it works' }).click()
  await expect(
    page.getByRole('heading', { level: 2, name: 'From two surveys to a verdict' }),
  ).toBeInViewport()

  await page.getByRole('button', { name: 'Show on the model' }).nth(1).click()
  const views = page.getByRole('group', { name: 'What the model shows' })
  await expect(views.getByRole('button', { name: 'Change' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(views).toBeInViewport()

  // Live result per rule, from the same engine the dashboard uses.
  const rules = page.getByRole('list').filter({ hasText: 'Stay inside the lease' })
  await expect(rules).toContainText('1 violation, 2 warnings', { timeout: 60_000 })
  await expect(rules).toContainText('1 violation')
  await expect(rules).toContainText('1 warning')
})
