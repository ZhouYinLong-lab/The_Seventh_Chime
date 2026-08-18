import { expect, test, type Page } from '@playwright/test';

// 批次一回归（PM 决策书 PR-A）：浮层 ✕ 关闭、在场角色满员反馈、查询表单首屏可及、重渲染滚动位置保持。
// 查询助手与 b0-b4.spec.ts 保持一致；E2E 只增不改删。

const query = async (page: Page, bell: string, location: string, bodies: string[], title: string) => {
  await page.keyboard.press('Escape');
  await page.selectOption('#bell', bell);
  await page.selectOption('#location', location);
  for (const input of await page.locator('input[data-body]').all()) if (await input.isChecked()) await input.uncheck();
  for (const body of bodies) await page.locator(`input[data-body="${body}"]`).check();
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('#reader h2')).toHaveText('值班台与配枪登记');
  await expect(page.locator('#reader .entry[data-doc] h3').filter({ hasText: title })).toHaveText(title);
};

test('浮层 ✕ 按钮关闭档案，关闭后检索可再次打开', async ({ page }) => {
  await page.goto('/');
  await query(page, 'b0', 'h_admin', ['mara', 'kovac', 'verri'], '封站命令');
  await expect(page.locator('.overlay')).toBeVisible();
  await page.locator('.overlay-close').click();
  await expect(page.locator('.overlay')).toHaveCount(0);
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('.overlay')).toBeVisible();
  await expect(page.locator('#reader h2')).toHaveText('值班台与配枪登记');
});

test('满 3 人后勾选第 4 人无效并给出反馈', async ({ page }) => {
  await page.goto('/');
  for (const body of ['mara', 'kovac', 'verri']) await page.locator(`input[data-body="${body}"]`).check();
  await expect(page.locator('input[data-body]:checked')).toHaveCount(3);
  // 用 click 而非 check()：check() 会在元素未进入选中态时持续重试直至超时。
  await page.locator('input[data-body="klara"]').click();
  await expect(page.locator('input[data-body]:checked')).toHaveCount(3);
  await expect(page.locator('input[data-body="klara"]')).not.toBeChecked();
  await expect(page.locator('.feedback')).toContainText('此时段最多登记三位在场者');
});

test('首屏时段与地点下拉无需滚动即可见，勾选区进入视口', async ({ page }) => {
  await page.goto('/');
  const usable = await page.evaluate(() => {
    const left = document.querySelector('.left');
    if (!left) return false;
    const lr = left.getBoundingClientRect();
    const fully = (sel: string) => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= lr.top && r.bottom <= lr.bottom; };
    const enters = (sel: string) => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > lr.top && r.top < lr.bottom; };
    return fully('#bell') && fully('#location') && enters('.body-options');
  });
  expect(usable).toBe(true);
});

test('重渲染保持左栏滚动位置', async ({ page }) => {
  await page.goto('/');
  const left = page.locator('.left');
  await left.evaluate((el) => { el.scrollTop = 500; });
  await page.locator('input[data-body="mara"]').check();
  await expect(page.locator('input[data-body="mara"]')).toBeChecked();
  const top = await left.evaluate((el) => el.scrollTop);
  expect(top).toBe(500);
});
