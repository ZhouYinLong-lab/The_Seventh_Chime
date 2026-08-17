import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { b7AlignmentAvailable, b7AlignmentPanel, b7Events, b7TimelineTimes, validateB7Alignment } from '../src/b7-timeline.ts';
import { content, documents } from '../src/content.ts';
import { emptySave, migrateSave } from '../src/save.ts';

const correct = Object.fromEntries(b7Events.map((event) => [event.id, event.time])) as Record<string, string>;

test('B7 秒级事件与作者基线顺序一致', () => {
  const baseline = JSON.parse(readFileSync(new URL('../author/baseline.json', import.meta.url), 'utf8')) as { b7Timeline: [string, string][] };
  assert.deepEqual(b7Events.map((event) => event.id), baseline.b7Timeline.map(([, event]) => event));
  assert.equal(new Set(b7Events.map((event) => event.id)).size, 7);
  assert.equal(new Set(b7TimelineTimes).size, 7, '时刻必须互不重复');
});

test('对齐判定只接受完整且完全正确的分配', () => {
  assert.equal(validateB7Alignment(correct), true);
  const swapped = { ...correct, shot: '23:00:39', holster_seal_broken: '23:00:43' };
  assert.equal(validateB7Alignment(swapped), false);
  const partial = { ...correct }; delete partial.jump;
  assert.equal(validateB7Alignment(partial), false);
});

test('面板只在发现 B7-R 后出现', () => {
  const before = emptySave(content.characters);
  assert.equal(b7AlignmentAvailable(before), false);
  assert.equal(b7AlignmentPanel(before), '');
  const after = emptySave(content.characters);
  after.discovered.push('doc_b7_r_klara_kovac_verri');
  assert.equal(b7AlignmentAvailable(after), true);
  assert.ok(b7AlignmentPanel(after).includes('提交对齐'));
  assert.ok(b7AlignmentPanel(after).includes('23:00:43'));
});

test('v4 存档携带 B7 对齐草稿与确认结果往返', () => {
  const save = emptySave(content.characters);
  save.discovered.push('doc_b7_r_klara_kovac_verri');
  save.b7AlignmentDraft = { ...correct, shot: '23:00:43' };
  save.b7Alignment = { assigned: { ...correct }, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  const reloaded = migrateSave(JSON.parse(JSON.stringify(save)), content.characters, content.documents);
  assert.equal(reloaded?.b7Alignment?.correct, true);
  assert.equal(reloaded?.b7AlignmentDraft.shot, '23:00:43');
});

test('损坏的 B7 对齐确认会被拒绝', () => {
  const save = emptySave(content.characters);
  const bad = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  bad.b7Alignment = { assigned: { ...correct, shot: '23:00:39' }, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  assert.equal(migrateSave(bad, content.characters, content.documents), null);
});

test('v3 存档迁移到 v4 建立空 B7 对齐状态', () => {
  const v3 = JSON.parse(JSON.stringify(emptySave(content.characters))) as Record<string, unknown>; v3.version = 3; delete v3.terminalLog; delete v3.b7AlignmentDraft; delete v3.b7Alignment;
  const migrated = migrateSave(v3, content.characters, content.documents);
  assert.equal(migrated?.b7Alignment, null);
  assert.deepEqual(migrated?.b7AlignmentDraft, Object.fromEntries(b7Events.map((event) => [event.id, ''])));
});

test('对齐面板在揭示前文本干净', () => {
  const save = emptySave(content.characters);
  save.discovered.push('doc_b7_r_klara_kovac_verri');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改']) assert.ok(!b7AlignmentPanel(save).includes(forbidden), `面板含 ${forbidden}`);
});
