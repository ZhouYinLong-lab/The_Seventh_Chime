import { expect, test } from '@playwright/test';

// storageState 只在 context 创建时注入 btb.intro.seen=1（导航不重注），
// 因此 removeItem 后 reload 会真实显示卷首——首两条测试借此覆盖「首次进入」。
test('首次进入显示卷首：时间、身份与任务', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('btb.intro.seen'));
  await page.reload();
  await expect(page.locator('.intro')).toBeVisible();
  await expect(page.locator('.intro-card')).toContainText('22:00');
  await expect(page.locator('.intro-card')).toContainText('港务局派来的调查员');
  await expect(page.locator('.intro-card')).toContainText('在场的，究竟是谁');
});

test('进入档案室后落在场景地图', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('btb.intro.seen'));
  await page.reload();
  await page.getByRole('button', { name: '进入档案室' }).click();
  await expect(page.locator('.intro')).toHaveCount(0);
  await expect(page.locator('.facility-map')).toBeVisible();
});

test('跳过卷首后刷新不再出现', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('btb.intro.seen'));
  await page.reload();
  await page.getByRole('button', { name: '跳过' }).click();
  await expect(page.locator('.intro')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.intro')).toHaveCount(0);
  await expect(page.locator('.facility-map')).toBeVisible();
});

test('卷首可重看、Esc 关闭，且开场文案不含正式推演术语', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '卷首' }).click();
  await expect(page.locator('.intro')).toBeVisible();
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改', '肉体']) await expect(page.locator('.intro')).not.toContainText(forbidden);
  await page.keyboard.press('Escape');
  await expect(page.locator('.intro')).toHaveCount(0);
  await expect(page.locator('.facility-map')).toBeVisible();
});
