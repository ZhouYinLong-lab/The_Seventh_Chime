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

const showInference = async (page: Page) => {
  const inference = page.locator('.mobile-nav').getByRole('button', { name: '推演' });
  if (await inference.isVisible()) await inference.click();
};

const showQuery = async (page: Page) => {
  const queryTab = page.locator('.mobile-nav').getByRole('button', { name: '查询' });
  if (await queryTab.isVisible()) await queryTab.click();
};

const showArchive = async (page: Page) => {
  const archiveTab = page.locator('.mobile-nav').getByRole('button', { name: '档案' });
  if (await archiveTab.isVisible()) await archiveTab.click();
};

const addLiveEvidence = async (page: Page, index = 0) => {
  await showArchive(page);
  await page.locator('#reader').getByRole('button', { name: '选中本段' }).nth(index).click();
  await showInference(page);
  await page.getByRole('button', { name: '引用当前选中段' }).click();
};

const completeLiveFramePrerequisites = async (page: Page) => {
  await completeB4(page);
  await showInference(page);
  await submitRing(page);
  await showQuery(page);
  await query(page, 'b2', 'c_bell', ['niko'], '七格节奏');
  await query(page, 'b3', 'r_radio', ['klara'], '七点呼叫');
  await query(page, 'b3', 'h_admin', ['mateo', 'kovac', 'verri'], '私密问题会议');
  await query(page, 'b4', 'h_admin', ['mara', 'kovac', 'verri'], '重逢后的称呼');
  await query(page, 'b5', 'a_archive', ['niko', 'mateo'], '维护井来客');
  await query(page, 'b3', 'c_bell', ['niko'], '镜像姓名');
  await query(page, 'b6', 'a_archive', ['niko'], '六槽副表');
  await showInference(page);
  await expect(page.getByRole('heading', { name: '实时版框' })).toBeVisible();
};

const submitLiveFrame = async (page: Page) => {
  await page.locator('select[data-modified-field="changedAfterBell"]').selectOption('b4');
  await page.locator('select[data-modified-field="modifierSoul"]').selectOption('verri');
  await page.locator('select[data-modified-field="removedName"]').selectOption('niko');
  await page.locator('select[data-modified-field="anchorBody"]').selectOption('niko');
  for (const [index, body] of ['mara', 'klara', 'livia', 'verri', 'mateo', 'kovac'].entries()) await page.locator(`select[data-live-ring-index="${index}"]`).selectOption(body);
  await showQuery(page);
  await query(page, 'b4', 'a_archive', ['mateo'], '原始校样');
  await addLiveEvidence(page, 0);
  await showQuery(page);
  await query(page, 'b6', 'a_archive', ['niko'], '六槽副表');
  await addLiveEvidence(page, 0);
  await showQuery(page);
  await query(page, 'b5', 'a_archive', ['niko', 'mateo'], '维护井来客');
  await addLiveEvidence(page, 0);
  await page.getByRole('button', { name: '提交实时版框' }).click();
  await expect(page.getByRole('heading', { name: '由已提交实时版框推导' })).toBeVisible();
};

test('桌面端新存档通过 B0–B4，提交圆环后刷新仍保留', async ({ page }) => {
  await page.goto('/');
  await completeB4(page);
  await expect(page.getByRole('heading', { name: '灵魂假设' })).toBeVisible();
  await page.locator('#reader').getByRole('button', { name: '选中本段' }).first().click();
  const maraHypothesis = page.locator('.hypothesis-grid tr').filter({ has: page.locator('select[data-hyp-body="mara"]') });
  await maraHypothesis.getByRole('button', { name: '引用当前段' }).click();
  await expect(maraHypothesis.getByRole('button', { name: '证据 1' })).toBeVisible();
  await submitRing(page);
  await page.reload();
  await expect(page.getByText('由已提交规则推导')).toBeVisible();
  await expect(page.locator('.hypothesis-grid tr').filter({ has: page.locator('select[data-hyp-body="mara"]') }).getByRole('button', { name: '证据 1' })).toBeVisible();
});

test('B4 前不显示正式推演术语', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText('灵魂');
  await expect(page.locator('body')).not.toContainText('占据');
  await expect(page.locator('body')).not.toContainText('圆环');
  await expect(page.locator('body')).not.toContainText('锚点');
  await expect(page.locator('body')).not.toContainText('实时版框');
  await expect(page.locator('body')).not.toContainText('规则修改');
});

test('段落引用在刷新后仍保留', async ({ page }) => {
  await page.goto('/');
  await query(page, 'b0', 'r_radio', ['klara'], '线路自检');
  await query(page, 'b0', 'r_radio', ['klara'], '线路自检');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('btb.save.v1.current') || '{}').playtestEvents.some((event: { kind: string }) => event.kind === 'revisit'))).toBe(true);
  await page.locator('#reader').getByRole('button', { name: '引用本段' }).first().click();
  await expect(page.getByText('摘录：线路自检纸带完整传递长句。')).toBeVisible();
  await page.reload();
  await expect(page.getByText('摘录：线路自检纸带完整传递长句。')).toBeVisible();
});

test('档案比较可进入和退出', async ({ page }) => {
  await page.goto('/');
  await query(page, 'b0', 'r_radio', ['klara'], '线路自检');
  await query(page, 'b0', 'c_bell', ['niko'], '七钟校准');
  const radio = page.locator('.archive-item').filter({ hasText: '线路自检' });
  const bell = page.locator('.archive-item').filter({ hasText: '七钟校准' });
  await radio.getByRole('button', { name: '比较' }).click();
  await bell.getByRole('button', { name: '比较' }).click();
  await expect(page.locator('.compare-reader .reader')).toHaveCount(2);
  await radio.getByRole('button', { name: '移出比较' }).click();
  await expect(page.locator('.compare-reader')).toHaveCount(0);
  await bell.getByRole('button', { name: '移出比较' }).click();
  await expect(bell.getByRole('button', { name: '比较' })).toBeVisible();
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

test('桌面端通过六槽副表提交实时版框，B5–B7 演算刷新后保留', async ({ page }) => {
  await page.goto('/');
  await completeLiveFramePrerequisites(page);
  await submitLiveFrame(page);
  await expect(page.locator('button.derived-fact[data-bell="b7"]')).toHaveCount(7);
  await page.reload();
  await showInference(page);
  await expect(page.getByRole('heading', { name: '由已提交实时版框推导' })).toBeVisible();
  await expect(page.locator('.live-derivation tbody tr')).toHaveCount(7);
});

const completeB7Chain = async (page: Page) => {
  await query(page, 'b4', 'r_radio', ['klara'], '不会编码的排字工');
  await query(page, 'b3', 'j_medical', ['livia'], '医生权限下的盗取');
  await query(page, 'b4', 'j_medical', ['livia'], '找错地方的枪');
  await query(page, 'b5', 'h_admin', ['kovac', 'verri'], '过度简化的结论');
  await query(page, 'b5', 'r_radio', ['mara', 'klara'], '两种条件才能发报');
  await query(page, 'b5', 'j_medical', ['livia'], '伪造死因');
  await query(page, 'b6', 'r_radio', ['mara', 'klara'], '提前回归与发送带');
  await query(page, 'b6', 'h_admin', ['mateo', 'kovac', 'verri'], '只到一半的警告');
  await query(page, 'b6', 'j_medical', ['livia'], '尼科的警告');
  await query(page, 'b7', 'r_radio', ['klara', 'kovac', 'verri'], '内信号间枪击');
};

const alignB7 = async (page: Page, times: Record<string, string>) => {
  for (const [eventId, time] of Object.entries(times)) await page.locator(`select[data-b7-time="${eventId}"]`).selectOption(time);
};

test('桌面端通过 B7 秒级对齐：错误提交被拒，正确提交刷新后保留', async ({ page }) => {
  await page.goto('/');
  await completeLiveFramePrerequisites(page);
  await submitLiveFrame(page);
  await completeB7Chain(page);
  await expect(page.getByRole('heading', { name: 'B7 秒级对齐' })).toBeVisible();
  const times: Record<string, string> = {
    jump: '23:00:00',
    tape_start_and_interlock: '23:00:08',
    list_to_signal_room: '23:00:26',
    identity_check_blocked: '23:00:38',
    holster_seal_broken: '23:00:39',
    shot: '23:00:43',
    tape_complete: '23:01:12',
  };
  await alignB7(page, times);
  await page.locator('select[data-b7-time="shot"]').selectOption('23:00:39');
  await page.getByRole('button', { name: '提交对齐' }).click();
  await expect(page.getByText('这组对齐与 B7 记录冲突')).toBeVisible();
  await page.locator('select[data-b7-time="shot"]').selectOption('23:00:43');
  await page.getByRole('button', { name: '提交对齐' }).click();
  await expect(page.getByText('对齐已确认：机器日志、封条与名单位置三条证据线指向同一顺序。')).toBeVisible();
  await page.reload();
  await expect(page.getByText('对齐已确认：机器日志、封条与名单位置三条证据线指向同一顺序。')).toBeVisible();
  await expect(page.locator('select[data-b7-time]')).toHaveCount(0);
});

test('390px 移动端完成实时版框闭环且页面不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await completeLiveFramePrerequisites(page);
  await submitLiveFrame(page);
  await expect(page.getByRole('heading', { name: '由已提交实时版框推导' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
