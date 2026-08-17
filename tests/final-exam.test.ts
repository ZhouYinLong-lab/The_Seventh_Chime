import assert from 'node:assert/strict';
import test from 'node:test';
import { b7Events } from '../src/b7-timeline.ts';
import { content } from '../src/content.ts';
import { examAvailable, examDraftEmpty, examQuestions, finalExamPanel, validateExam } from '../src/final-exam.ts';
import { emptySave, migrateSave } from '../src/save.ts';

const canonical = Object.fromEntries(examQuestions.map((question) => [question.id, question.answer])) as Record<string, string>;
const aligned = Object.fromEntries(b7Events.map((event) => [event.id, event.time])) as Record<string, string>;

test('终局答卷九项与作者基线一致', () => {
  assert.deepEqual(examQuestions.map((question) => question.answer), ['verri', 'niko', 'kovac', 'kovac', 'verri', 'verri', 'niko', 'verri', 'niko']);
  assert.equal(examQuestions.length, 9);
  assert.equal(new Set(examQuestions.map((question) => question.id)).size, 9);
});

test('答卷判定只接受完整且完全正确的九项', () => {
  assert.equal(validateExam(canonical), true);
  const wrong = { ...canonical, dead_soul: 'mara' };
  assert.equal(validateExam(wrong), false);
  const partial = { ...canonical }; delete partial.shooter_body;
  assert.equal(validateExam(partial), false);
  const empty = { ...examDraftEmpty };
  assert.equal(validateExam(empty), false);
});

test('答卷只在 B7 对齐确认后出现', () => {
  const before = emptySave(content.characters);
  assert.equal(examAvailable(before), false);
  assert.equal(finalExamPanel(before), '');
  const after = emptySave(content.characters);
  after.b7Alignment = { assigned: aligned, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  assert.equal(examAvailable(after), true);
  const panel = finalExamPanel(after);
  assert.ok(panel.includes('提交答卷'));
  assert.ok(panel.includes('终局答卷'));
  for (const question of examQuestions) assert.ok(panel.includes(`data-exam-field="${question.id}"`), `缺少 ${question.id}`);
});

test('提交后答卷显示三角还原与终局', () => {
  const save = emptySave(content.characters);
  save.b7Alignment = { assigned: aligned, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  save.finalExam = { answers: { ...canonical }, submittedAt: '2026-08-18T00:01:00.000Z', correct: true };
  const panel = finalExamPanel(save);
  assert.ok(panel.includes('三角还原'));
  assert.ok(panel.includes('机器日志'));
  assert.ok(panel.includes('枪套封条'));
  assert.ok(panel.includes('名单位置'));
  assert.ok(panel.includes('终局'));
  assert.ok(!panel.includes('提交答卷'), '提交后不应再显示表单');
  assert.ok(panel.includes('他杀死的是 Niko'));
  assert.ok(panel.includes('发送核对台'));
  assert.ok(panel.includes('Mara 传来过时而被简化过的结论'));
});

test('v4 存档携带答卷草稿与确认结果往返', () => {
  const save = emptySave(content.characters);
  save.b7Alignment = { assigned: aligned, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  save.finalExamDraft = { ...canonical, dead_soul: '' };
  save.finalExam = { answers: { ...canonical }, submittedAt: '2026-08-18T00:01:00.000Z', correct: true };
  const reloaded = migrateSave(JSON.parse(JSON.stringify(save)), content.characters, content.documents);
  assert.equal(reloaded?.finalExam?.correct, true);
  assert.equal(reloaded?.finalExamDraft.dead_soul, '');
});

test('损坏的答卷确认会被拒绝', () => {
  const save = emptySave(content.characters);
  const bad = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  bad.finalExam = { answers: { ...canonical, dead_soul: 'mara' }, submittedAt: '2026-08-18T00:01:00.000Z', correct: true };
  assert.equal(migrateSave(bad, content.characters, content.documents), null);
  const badKind = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  badKind.finalExam = { answers: { ...canonical }, submittedAt: 'not-a-date', correct: true };
  assert.equal(migrateSave(badKind, content.characters, content.documents), null);
});

test('v3 存档迁移到 v4 建立空答卷状态', () => {
  const v3 = JSON.parse(JSON.stringify(emptySave(content.characters))) as Record<string, unknown>;
  v3.version = 3; for (const key of ['terminalLog', 'b7AlignmentDraft', 'b7Alignment', 'finalExamDraft', 'finalExam']) delete v3[key];
  const migrated = migrateSave(v3, content.characters, content.documents);
  assert.equal(migrated?.finalExam, null);
  assert.deepEqual(migrated?.finalExamDraft, examDraftEmpty);
});
