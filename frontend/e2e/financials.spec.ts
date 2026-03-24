import { expect, test } from '@playwright/test';

test('financials page shows the desktop modeling workspace', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('ASSUMPTIONS')).toBeVisible();
  await expect(page.getByText('Income Statement')).toBeVisible();
  await expect(page.getByText('LINE ITEM')).toBeVisible();
});
