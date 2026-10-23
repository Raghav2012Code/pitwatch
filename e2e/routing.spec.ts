import { expect, test } from '@playwright/test'

test('an unknown hash is rewritten to the home hash', async ({ page }) => {
  await page.goto('/#/typo')

  // The page renders home either way, so the URL is the thing that has to tell the truth.
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('main')).toBeVisible()
})

test('a deeper monitor path is rewritten to the home hash', async ({ page }) => {
  await page.goto('/#/monitor/extra')

  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('main')).toBeVisible()
})

for (const route of ['overview', 'monitor', 'findings', 'rules', 'uncertainty', 'about']) {
  test(`#/${route} is left as it is`, async ({ page }) => {
    await page.goto(`/#/${route}`)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`#/${route}$`))
  })
}

test('the footer links open the Terms, License and Contact pages', async ({ page }) => {
  await page.goto('/')
  for (const [name, hash] of [
    ['Terms and Conditions', /#\/terms$/],
    ['License', /#\/license$/],
    ['Contact', /#\/contact$/],
  ] as const) {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name }).click()
    await expect(page).toHaveURL(hash)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await page.getByRole('link', { name: 'Back to home' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('See where the digging')
  }
})
