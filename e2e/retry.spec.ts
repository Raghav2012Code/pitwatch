import { expect, test } from '@playwright/test'

/**
 * A failed terrain load used to be terminal: the store only loaded from `idle`, so the error
 * card was a dead end and the home page kept claiming it was building the surveys.
 *
 * The failure is simulated by making the first Web Worker construction throw, which is what a
 * blocked or missing worker script does in the browser. The second attempt works, so the retry
 * has something to prove.
 */
function failFirstWorker() {
  const Original = window.Worker
  let failed = false
  window.Worker = class extends Original {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options)
      if (!failed) {
        failed = true
        this.terminate()
        throw new Error('simulated worker failure')
      }
    }
  }
}

test('a failed terrain load can be retried without a reload', async ({ page }) => {
  await page.addInitScript(failFirstWorker)
  await page.goto('/#/monitor')

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible({ timeout: 60_000 })
  await expect(alert).toContainText(/could not load/i)

  await page.getByRole('button', { name: 'Try again' }).click()

  // The retry gets a working worker, so the engine reports and the map comes up.
  await expect(page.getByRole('banner').getByText('2 violations, 3 warnings')).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('the home page reports a failed load and offers the retry', async ({ page }) => {
  await page.addInitScript(failFirstWorker)
  await page.goto('/')

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible({ timeout: 60_000 })
  // It must stop claiming to be building the surveys.
  await expect(page.getByText('Building the simulated surveys…')).toHaveCount(0)

  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0, { timeout: 60_000 })
})
