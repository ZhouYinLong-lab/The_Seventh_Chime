import { expect, test, type Page } from '@playwright/test';

const terminalInput = (page: Page) => page.locator('#terminal-input');
const run = async (page: Page, command: string) => { await terminalInput(page).fill(command); await terminalInput(page).press('Enter'); };
const log = (page: Page) => page.locator('.terminal-log');

test('桌面端通过指令台完成首次查询并写入档案库', async ({ page }) => {
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await expect(page.locator('#reader h2')).toHaveText('线路自检');
  await run(page, 'FILES');
  await expect(log(page)).toContainText('B0-R-KLARA · 线路自检');
  await expect(page.locator('.archive-item').filter({ hasText: '线路自检' })).toBeVisible();
});

test('指令对大小写、分隔符与肉体顺序不敏感', async ({ page }) => {
  await page.goto('/');
  await run(page, 'b0:r:klara');
  await expect(page.locator('#reader h2')).toHaveText('线路自检');
  await run(page, 'B0-H-VERRI-MARA-KOVAC');
  await expect(page.locator('#reader h2')).toHaveText('封站命令');
  await run(page, 'b0:c:niko');
  await expect(page.locator('#reader h2')).toHaveText('七钟校准');
});

test('锁定档案与无效档案的反馈不泄露存在性', async ({ page }) => {
  await page.goto('/');
  await run(page, 'B7-R-KLARA-KOVAC-VERRI');
  await expect(log(page).last()).toContainText('当前线索尚不足以确认这条记录');
  await expect(log(page)).not.toContainText('内信号间枪击');
  await run(page, 'B5-X-MARA');
  await expect(log(page).last()).toContainText('无法识别的指令或档案编号');
  await run(page, 'B0-H-MARA');
  await expect(log(page).last()).toContainText('没有找到符合这些条件的主要记录');
});

test('Tab 补全仅针对已发现档案', async ({ page }) => {
  await page.goto('/');
  await terminalInput(page).fill('B0-');
  await terminalInput(page).press('Tab');
  await expect(terminalInput(page)).toHaveValue('B0-');
  await run(page, 'OPEN B0-C-NIKO');
  await terminalInput(page).fill('B0-');
  await terminalInput(page).press('Tab');
  await expect(terminalInput(page)).toHaveValue('B0-C-NIKO ');
});

test('上箭头恢复历史指令', async ({ page }) => {
  await page.goto('/');
  await run(page, 'HELP');
  await run(page, 'FILES');
  await terminalInput(page).press('ArrowUp');
  await expect(terminalInput(page)).toHaveValue('FILES');
  await terminalInput(page).press('ArrowUp');
  await expect(terminalInput(page)).toHaveValue('HELP');
  await terminalInput(page).press('ArrowDown');
  await expect(terminalInput(page)).toHaveValue('FILES');
});

test('COMPARE 指令进入双档案比较', async ({ page }) => {
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await run(page, 'OPEN B0-C-NIKO');
  await run(page, 'COMPARE B0-R-KLARA B0-C-NIKO');
  await expect(page.locator('.compare-reader .reader')).toHaveCount(2);
  await expect(log(page)).toContainText('已加入比较');
});

test('未发现档案无法被 COMPARE 打开', async ({ page }) => {
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await run(page, 'COMPARE B0-R-KLARA B1-H-VERRI');
  await expect(log(page).last()).toContainText('当前线索尚不足以确认这条记录');
  await expect(page.locator('.compare-reader')).toHaveCount(0);
});

test('刷新后指令日志与发现状态保留', async ({ page }) => {
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await page.reload();
  await expect(log(page)).toContainText('> OPEN B0-R-KLARA');
  await expect(log(page)).toContainText('B0-R-KLARA · 线路自检');
  await expect(page.locator('#reader h2')).toHaveText('线路自检');
});

test('B4 前 HELP 与 GOALS 不含正式推演术语', async ({ page }) => {
  await page.goto('/');
  await run(page, 'HELP');
  await run(page, 'GOALS');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改', '肉体']) await expect(page.locator('body')).not.toContainText(forbidden);
});

test('390px 移动端指令台可查询且页面不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await expect(page.locator('#reader h2')).toHaveText('线路自检');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('移动端世界标签展示背景志且不泄露正式推演术语', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-action="tab"][data-tab="world"]').click();
  await expect(page.locator('.world-panel h2')).toHaveText('1928 · 圣维拉');
  await expect(page.locator('.world-panel')).toContainText('维护井');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改', '肉体']) await expect(page.locator('body')).not.toContainText(forbidden);
  await page.reload();
  await expect(page.locator('[data-action="tab"][data-tab="world"]')).toHaveClass(/active/);
});

test('HINT 在连续无效查询后逐级开放且不泄露正式推演术语', async ({ page }) => {
  await page.goto('/');
  await run(page, 'HINT');
  await expect(log(page).last()).toContainText('提示尚未就绪');
  for (let i = 0; i < 9; i++) await run(page, 'OPEN B7-R-KLARA-KOVAC-VERRI');
  await run(page, 'HINT');
  const lastEntry = page.locator('.terminal-log li.terminal-entry').last();
  await expect(lastEntry).toContainText('> HINT');
  await expect(lastEntry).not.toContainText('提示尚未就绪');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改', '肉体']) await expect(page.locator('body')).not.toContainText(forbidden);
});

test('INSPECT 命中物品档案且不泄露正式推演术语', async ({ page }) => {
  await page.goto('/');
  await run(page, 'INSPECT K-17');
  await expect(log(page).last()).toContainText('K-17');
  await expect(log(page).last()).toContainText('封条');
  await run(page, 'INSPECT 反潜鱼雷');
  await expect(log(page).last()).toContainText('没有找到该物品的档案记录');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改', '肉体']) await expect(page.locator('body')).not.toContainText(forbidden);
});

test('指令台完整走通 B0–B4 并开放推演面板', async ({ page }) => {
  await page.goto('/');
  const chain: [string, string][] = [
    ['OPEN B0-H-MARA-KOVAC-VERRI', '封站命令'],
    ['OPEN B0-R-KLARA', '线路自检'],
    ['OPEN B0-J-LIVIA-MATEO', '拘押体检'],
    ['OPEN B0-C-NIKO', '七钟校准'],
    ['OPEN B1-A-MARA-KOVAC', '私柜与暗记'],
    ['OPEN B1-R-KLARA', '不会发报的报务员'],
    ['OPEN B1-J-LIVIA-MATEO', '敲击与遗物'],
    ['OPEN B1-C-NIKO', '少年的专业包扎'],
    ['OPEN B2-A-MARA-KOVAC-VERRI', '名册三人场'],
    ['OPEN B2-R-KLARA', '被改短的线路'],
    ['OPEN B2-J-LIVIA-MATEO', '医生与译员互换'],
    ['OPEN B3-A-MARA', '给第四双手的留言'],
    ['OPEN B4-A-MATEO', '原始校样'],
  ];
  for (const [command, title] of chain) {
    await run(page, command);
    await expect(page.locator('#reader h2')).toHaveText(title);
  }
  await run(page, 'FILES');
  await expect(page.locator('.terminal-log')).toContainText('B4-A-MATEO · 原始校样');
  await expect(page.locator('.hypothesis-grid')).toBeVisible();
  await expect(page.locator('.ring-workbench')).toBeVisible();
});

test('导出进度后在新会话导入，发现与推演状态完整迁移', async ({ page }) => {
  await page.goto('/');
  await run(page, 'OPEN B0-R-KLARA');
  await run(page, 'OPEN B0-C-NIKO');
  await page.locator('#note-text').fill('B0 线路自检纸带完整传递长句。');
  await page.getByRole('button', { name: '保存笔记' }).click();
  await expect(page.getByText('B0 线路自检纸带完整传递长句。')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出进度' }).click();
  const savePath = await (await downloadPromise).path();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.reader.empty')).toBeVisible();
  await page.locator('#import-file').setInputFiles(savePath as string);
  await expect(page.locator('.terminal-log')).toContainText('B0-R-KLARA');
  await expect(page.locator('body')).toContainText('已解锁 2 份');
  await expect(page.getByText('B0 线路自检纸带完整传递长句。')).toBeVisible();
  await run(page, 'FILES');
  await expect(page.locator('.terminal-log')).toContainText('B0-C-NIKO · 七钟校准');
});

test('CLEAR 清空指令日志', async ({ page }) => {
  await page.goto('/');
  await run(page, 'HELP');
  await run(page, 'CLEAR');
  await expect(log(page)).toContainText('指令日志已清空');
  await expect(log(page)).not.toContainText('调查指令：');
});

test('390px 移动端右栏按标签分页，非当前面板不同屏堆叠', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const reveal: [string, string][] = [
    ['OPEN B0-H-MARA-KOVAC-VERRI', '封站命令'],
    ['OPEN B0-R-KLARA', '线路自检'],
    ['OPEN B0-J-LIVIA-MATEO', '拘押体检'],
    ['OPEN B0-C-NIKO', '七钟校准'],
    ['OPEN B1-A-MARA-KOVAC', '私柜与暗记'],
    ['OPEN B1-R-KLARA', '不会发报的报务员'],
    ['OPEN B1-J-LIVIA-MATEO', '敲击与遗物'],
    ['OPEN B1-C-NIKO', '少年的专业包扎'],
    ['OPEN B2-A-MARA-KOVAC-VERRI', '名册三人场'],
    ['OPEN B2-R-KLARA', '被改短的线路'],
    ['OPEN B2-J-LIVIA-MATEO', '医生与译员互换'],
    ['OPEN B3-A-MARA', '给第四双手的留言'],
    ['OPEN B4-A-MATEO', '原始校样'],
  ];
  for (const [command] of reveal) await run(page, command);
  const tabs = ['facts', 'world', 'notes', 'hypotheses'] as const;
  for (const tab of tabs) {
    await page.locator(`[data-action="tab"][data-tab="${tab}"]`).click();
    await expect(page.locator(`.right-panel[data-tab-panel="${tab}"]`)).toBeVisible();
    await expect(page.locator('.right > .mobile-visible')).toHaveCount(1);
    for (const other of tabs) {
      if (other === tab) continue;
      await expect(page.locator(`.right-panel[data-tab-panel="${other}"]`)).toBeHidden();
    }
  }
});
