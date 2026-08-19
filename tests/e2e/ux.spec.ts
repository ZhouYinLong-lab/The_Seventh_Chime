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

test('初始身份句；连续 3 次无效查询后提示开放并逐层累积', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.feedback')).toContainText('你是港务局派来的调查员');
  await expect(page.locator('button[data-action="hint"]')).toHaveCount(0);
  const invalidQuery = async () => {
    await page.selectOption('#bell', 'b0');
    await page.selectOption('#location', 'h_admin');
    for (const input of await page.locator('input[data-body]').all()) if (await input.isChecked()) await input.uncheck();
    await page.locator('input[data-body="mara"]').check();
    await page.getByRole('button', { name: '检索记录' }).click();
  };
  await invalidQuery();
  await invalidQuery();
  await expect(page.locator('button[data-action="hint"]')).toHaveCount(0);
  await invalidQuery();
  await expect(page.locator('button[data-action="hint"]')).toBeVisible();
  await page.locator('button[data-action="hint"]').click();
  await expect(page.locator('.feedback')).toContainText('方向提示 1/4');
  await invalidQuery();
  await page.locator('button[data-action="hint"]').click();
  await expect(page.locator('.feedback')).toContainText('方向提示 2/4');
  await expect(page.locator('.feedback')).toContainText('；');
});

test('首次成功检索追加教学句，重开不再追加', async ({ page }) => {
  await page.goto('/');
  await query(page, 'b0', 'h_admin', ['mara', 'kovac', 'verri'], '封站命令');
  await expect(page.locator('.feedback')).toContainText('已找到：封站命令');
  await expect(page.locator('.feedback')).toContainText('精确组合定位');
  await page.locator('.overlay-close').click();
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('.feedback')).toContainText('重新打开：封站命令');
  await expect(page.locator('.feedback')).not.toContainText('精确组合定位');
});

test('无效检索按已公开组合差分：时段×地点已有记录时提示核对角色', async ({ page }) => {
  await page.goto('/');
  await page.selectOption('#bell', 'b0');
  await page.selectOption('#location', 'h_admin');
  // 初始查询已默认勾选 B0-H 三人组，需清空后按单人条件查
  for (const input of await page.locator('input[data-body]').all()) if (await input.isChecked()) await input.uncheck();
  await page.locator('input[data-body="mara"]').check();
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('.feedback')).toContainText('该时段与地点已有记录；请核对在场角色。');
  // 非公开组合且未发现 → 通用文案
  await page.selectOption('#bell', 'b1');
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('.feedback')).toContainText('没有找到符合这些条件的主要记录。');
});

test('空笔记不保存并给出反馈', async ({ page }) => {
  await page.goto('/');
  // 桌面端笔记面板常显于右侧栏（移动端才用 tab 导航）
  await page.getByRole('button', { name: '保存笔记' }).click();
  await expect(page.locator('.feedback')).toContainText('笔记为空，未保存。');
  await expect(page.locator('.notes')).toContainText('还没有笔记。');
});
