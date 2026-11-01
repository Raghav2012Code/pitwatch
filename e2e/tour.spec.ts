import { expect, test } from '@playwright/test'

// The first-visit tour appears once per browser on the 3D map, with three steps. It is not modal:
// its card lets map clicks through, and only its own buttons take pointer events.

test.use({ reducedMotion: 'reduce' })

const READY = { timeout: 60_000 }

test('a first visit gets three keyboard-operable steps, then the tour stays away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/monitor')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible(READY)
  await expect(dialog).toContainText('step 1 of 3')
  await expect(dialog).toContainText('Inspect')
  await expect(dialog).toBeFocused()

  // Keyboard only: Tab reaches the controls and Enter advances.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Skip tour' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Next' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toContainText('step 2 of 3')
  await expect(dialog).toContainText('Measure')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(dialog).toContainText('step 3 of 3')
  await expect(dialog).toContainText('Findings')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()

  // Remembered across a reload.
  await page.reload()
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible(READY)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Escape dismisses the tour and leaves the map as it was', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/monitor')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible(READY)

  const details = page.getByRole('complementary', { name: 'Details' })
  const detailsBefore = await details.isVisible()
  const inspect = page.getByRole('button', { name: 'Inspect' })
  await expect(inspect).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  // No half-open panel, no stray tool, focus back outside the card.
  expect(await details.isVisible()).toBe(detailsBefore)
  await expect(inspect).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[role="dialog"] :focus')).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible(READY)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('About the data replays the tour', async ({ page }) => {
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'The guided tour' })).toBeVisible(READY)

  await page.getByRole('button', { name: 'Replay the tour' }).click()
  await expect(page).toHaveURL(/#\/monitor/)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible(READY)
  await expect(dialog).toContainText('step 1 of 3')
})
