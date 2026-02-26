const { test, expect } = require('@playwright/test');

test('Index_V161 可以正常載入（smoke）', async ({ page }) => {
  await page.goto('/Index_V161.html');
  await expect(page).toHaveTitle(/維修追蹤系統/);

  // 基礎 UI 元素存在（避免過度耦合）
  await expect(page.locator('body')).toContainText('維修追蹤系統');
});
