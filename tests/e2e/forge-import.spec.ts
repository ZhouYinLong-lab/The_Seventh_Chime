import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { content } from '../../src/content.ts';
import { MODIFIED_FRAME_ANSWER, deriveModifiedOccupancy, emptyModifiedFrameDraft } from '../../src/modified-frame.ts';
import { ORIGINAL_RING } from '../../src/ring.ts';
import { emptySave } from '../../src/save.ts';

const baseline = JSON.parse(readFileSync(new URL('../../author/baseline.json', import.meta.url), 'utf8')) as { b7Timeline: [string, string][]; finalAnswers: [string, string][] };
const canonical = Object.fromEntries(baseline.finalAnswers.map(([answer, id]) => [id, answer])) as Record<string, string>;
const aligned = Object.fromEntries(baseline.b7Timeline.map(([time, id]) => [id, time])) as Record<string, string>;
const examEvidence = {
  body_location: { docId: 'doc_b4_j_livia', segmentId: 's1' },
  soul_identity: { docId: 'doc_b6_j_livia', segmentId: 's1' },
  causal_continuity: { docId: 'doc_b5_r_mara_klara', segmentId: 's1' }
};
// 完整终局链：B7-R 揭示 + 原始圆环 + 实时版框 + 秒级对齐 + 证据答卷。
const fullChain = () => {
  const save = emptySave(content.characters);
  save.discovered = ['doc_b4_a_mateo', 'doc_b6_a_niko', 'doc_b4_j_livia', 'doc_b6_j_livia', 'doc_b5_r_mara_klara', 'doc_b7_r_klara_kovac_verri'];
  save.stageSubmissions.originalRing = { ring: [...ORIGINAL_RING], submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  save.modifiedFrameDraft = { ...emptyModifiedFrameDraft(), ...MODIFIED_FRAME_ANSWER, sixBodyRing: [...MODIFIED_FRAME_ANSWER.sixBodyRing], evidenceRefs: [{ docId: 'doc_b4_a_mateo', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's2' }] };
  save.modifiedFrameSubmission = { ...save.modifiedFrameDraft, correct: true, submittedAt: '2026-08-18T00:01:00.000Z' };
  save.derivedOccupancyB5B7 = deriveModifiedOccupancy(ORIGINAL_RING, save.modifiedFrameSubmission);
  save.b7Alignment = { assigned: { ...aligned }, submittedAt: '2026-08-18T00:02:00.000Z', correct: true };
  save.finalExamDraft = { ...canonical };
  save.finalExamEvidenceDraft = { body_location: { ...examEvidence.body_location }, soul_identity: { ...examEvidence.soul_identity }, causal_continuity: { ...examEvidence.causal_continuity } };
  save.finalExam = { answers: { ...canonical }, evidence: { ...examEvidence }, submittedAt: '2026-08-18T00:03:00.000Z', correct: true };
  return save;
};
const importSave = (page: Page, save: unknown) => page.locator('#import-file').setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'seventh-chime-save', save })) });
const showInference = async (page: Page) => { const inference = page.locator('.mobile-nav').getByRole('button', { name: '推演' }); if (await inference.isVisible()) await inference.click(); };

test('伪造 v4 存档导入成功：对齐与答卷确认被剥离，草稿可见', async ({ page }) => {
  await page.goto('/');
  const v4 = JSON.parse(JSON.stringify(fullChain())) as Record<string, unknown>;
  v4.version = 4; delete v4.finalExamEvidenceDraft;
  v4.stageSubmissions = {}; v4.modifiedFrameSubmission = undefined; v4.derivedOccupancyB5B7 = null;
  v4.modifiedFrameDraft = { changedAfterBell: null, modifierSoul: null, removedName: null, anchorBody: null, sixBodyRing: [], evidenceRefs: [] };
  v4.b7AlignmentDraft = { ...aligned };
  await importSave(page, v4);
  await expect(page.getByText('进度已导入；旧版存档已安全迁移到当前结构。')).toBeVisible();
  await expect(page.locator('.save-state')).toHaveText('已解锁 6 份 · 本地保存');
  await showInference(page);
  await expect(page.getByRole('heading', { name: 'B7 秒级对齐' })).toBeVisible();
  await expect(page.locator('select[data-b7-index="5"]')).toHaveValue('23:00:43');
  await expect(page.getByRole('heading', { name: '终局答卷' })).toHaveCount(0, '对齐确认被剥离后答卷不可见');
  await expect(page.getByRole('heading', { name: '三角还原' })).toHaveCount(0);
});

test('伪造 v5 存档缺答卷证据被整档拒绝，现有进度保留', async ({ page }) => {
  await page.goto('/');
  const forged = JSON.parse(JSON.stringify(fullChain())) as Record<string, unknown>;
  delete (forged.finalExam as Record<string, unknown>).evidence;
  await importSave(page, forged);
  await expect(page.getByText('导入失败：文件包含损坏或不存在的档案、推演或引用，现有进度未被覆盖。')).toBeVisible();
  await expect(page.locator('.save-state')).toHaveText('已解锁 0 份 · 本地保存');
});

test('合法 v5 完整链导入后终局可见', async ({ page }) => {
  await page.goto('/');
  await importSave(page, fullChain());
  await expect(page.locator('.save-state')).toHaveText('已解锁 6 份 · 本地保存');
  await showInference(page);
  await expect(page.getByRole('heading', { name: '终局答卷' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '三角还原' })).toBeVisible();
  await expect(page.getByText('他杀死的是 Niko。')).toBeVisible();
  await expect(page.locator('select[data-exam-index]')).toHaveCount(0);
});
