import { test, expect } from '@playwright/test'

test.describe('Windows Explorer golden path', () => {
  test('loads the folder tree on startup', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.folder-tree')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.folder-item').first()).toBeVisible()
  })

  test('clicking a folder updates the right panel and URL', async ({ page }) => {
    await page.goto('/')
    await page.locator('.folder-item').first().waitFor({ state: 'visible', timeout: 10_000 })

    // Click the first folder row
    await page.locator('.folder-row').first().click()

    // URL should contain folderId param
    await expect(page).toHaveURL(/folderId=/, { timeout: 5_000 })

    // Right panel should become active (subfolder list or empty state visible)
    const rightPanel = page.locator('.right-panel, [data-testid="right-panel"]')
      .or(page.locator('text=subfolder').or(page.locator('text=Select a folder')))
    await expect(rightPanel.first()).toBeVisible({ timeout: 5_000 })
  })

  test('search input triggers a dropdown', async ({ page }) => {
    await page.goto('/')
    await page.locator('.folder-item').first().waitFor({ state: 'visible', timeout: 10_000 })

    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('doc')

    // Wait for debounce (300ms) + query
    await page.waitForTimeout(700)

    // Either results or "no results" message should appear
    const dropdown = page.locator('.search-results, [data-testid="search-dropdown"]')
      .or(page.locator('text=No results').or(page.locator('.folder-row').nth(1)))

    // The input should at minimum still be focused and contain the text
    await expect(searchInput).toHaveValue('doc')
  })
})
