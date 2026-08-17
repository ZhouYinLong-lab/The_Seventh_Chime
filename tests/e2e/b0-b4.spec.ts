import { expect, test, type Page } from '@playwright/test';

const query = async (page: Page, bell: string, location: string, bodies: string[], title: string) => {
  await page.selectOption('#bell', bell);
  await page.selectOption('#location', location);
  for (const input of await page.locator('input[data-body]').all()) if (await input.isChecked()) await input.uncheck();
  for (const body of bodies) await page.locator(`input[data-body="${body}"]`).check();
  await page.getByRole('button', { name: '检索记录' }).click();
  await expect(page.locator('#reader h2')).toHaveText(title);
};

const completeB4 = async (page: Page) => {
  await query(page, 'b0', 'h_admin', ['mara', 'kovac', 'verri'], '封站命令');
  await query(page, 'b0', 'r_radio', ['klara'], '线路自检');
  await query(page, 'b0', 'j_medical', ['livia', 'mateo'], '拘押体检');
  await query(page, 'b0', 'c_bell', ['niko'], '七钟校准');
  await query(page, 'b1', 'a_archive', ['mara', 'kovac'], '私柜与暗记');
  await query(page, 'b1', 'r_radio', ['klara'], '不会发报的报务员');
  await query(page, 'b1', 'j_medical', ['livia', 'mateo'], '敲击与遗物');
  await query(page, 'b1', 'c_bell', ['niko'], '少年的专业包扎');
  await query(page, 'b2', 'a_archive', ['mara', 'kovac', 'verri'], '名册三人场');
  await query(page, 'b2', 'r_radio', ['klara'], '被改短的线路');
  await query(page, 'b2', 'j_medical', ['livia', 'mateo'], '医生与译员互换');
  await query(page, 'b3', 'a_archive', ['mara'], '给第四双手的留言');
  await query(page, 'b4', 'a_archive', ['mateo'], '原始校样');
};

const submitRing = async (page: Page) => {
  for (const [index, body] of ['mara', 'klara', 'livia', 'niko', 'mateo', 'kovac', 'verri'].entries()) await page.locator(`select[data-ring-index="${index}"]`).selectOption(body);
  await page.getByRole('button', { name: '提交圆环' }).click();
  await expect(page.getByText('由已提交规则推导')).toBeVisible();
};

test('桌面端新存档通过 B0–B4，提交圆环后刷新仍保留', async ({ page }) => {
  await page.goto('/');
  await completeB4(page);
  await expect(page.getByRole('heading', { name: '灵魂假设' })).toBeVisible();
  await submitRing(page);
  await page.reload();
  await expect(page.getByText('由已提交规则推导')).toBeVisible();
});

test('移动端维持单栏 B0–B4 推演闭环', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await completeB4(page);
  await expect(page.getByRole('button', { name: '推演' })).toBeVisible();
  await page.getByRole('button', { name: '推演' }).click();
  await submitRing(page);
  await expect(page.locator('.workspace')).toHaveCSS('display', 'block');
});
