import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { b7Events } from '../src/b7-timeline.ts';
import { content } from '../src/content.ts';
import { examAvailable, examQuestions, finalExamPanel, makeExamDraft, validateExam } from '../src/final-exam.ts';
import { MODIFIED_FRAME_ANSWER, deriveModifiedOccupancy, emptyModifiedFrameDraft } from '../src/modified-frame.ts';
import { ORIGINAL_RING } from '../src/ring.ts';
import { emptySave, migrateSave } from '../src/save.ts';

const baseline = JSON.parse(readFileSync(new URL('../author/baseline.json', import.meta.url), 'utf8')) as { b7Timeline: [string, string][]; finalAnswers: [string, string][] };
const canonical = Object.fromEntries(baseline.finalAnswers.map(([answer, id]) => [id, answer])) as Record<string, string>;
const aligned = Object.fromEntries(baseline.b7Timeline.map(([time, id]) => [id, time])) as Record<string, string>;
const examEvidence = {
  body_location: { docId: 'doc_b4_j_livia', segmentId: 's1' },
  soul_identity: { docId: 'doc_b6_j_livia', segmentId: 's1' },
  causal_continuity: { docId: 'doc_b5_r_mara_klara', segmentId: 's1' }
};
// 完整终局链：B7-R 揭示 + 原始圆环 + 实时版框 + 秒级对齐 + 证据答卷。
const fullChainSave = () => {
  const save = emptySave(content.characters);
  save.discovered = ['doc_b4_a_mateo', 'doc_b6_a_niko', 'doc_b4_j_livia', 'doc_b6_j_livia', 'doc_b5_r_mara_klara', 'doc_b7_r_klara_kovac_verri'];
  save.stageSubmissions.originalRing = { ring: [...ORIGINAL_RING], submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  save.modifiedFrameDraft = { ...emptyModifiedFrameDraft(), ...MODIFIED_FRAME_ANSWER, sixBodyRing: [...MODIFIED_FRAME_ANSWER.sixBodyRing], evidenceRefs: [{ docId: 'doc_b4_a_mateo', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's2' }] };
  save.modifiedFrameSubmission = { ...save.modifiedFrameDraft, correct: true, submittedAt: '2026-08-18T00:01:00.000Z' };
  save.derivedOccupancyB5B7 = deriveModifiedOccupancy(ORIGINAL_RING, save.modifiedFrameSubmission);
  save.b7Alignment = { assigned: { ...aligned }, submittedAt: '2026-08-18T00:02:00.000Z', correct: true };
  save.finalExamDraft = { ...canonical };
  save.finalExamEvidenceDraft = { body_location: { ...examEvidence.body_location }, soul_identity: { ...examEvidence.soul_identity }, causal_continuity: { ...examEvidence.causal_continuity } };
  save.finalExam = { answers: { ...canonical }, evidence: { body_location: { ...examEvidence.body_location }, soul_identity: { ...examEvidence.soul_identity }, causal_continuity: { ...examEvidence.causal_continuity } }, submittedAt: '2026-08-18T00:03:00.000Z', correct: true };
  return save;
};

test('终局答卷九项与作者基线一致', () => {
  assert.equal(examQuestions.length, 9);
  assert.equal(new Set(examQuestions.map((question) => question.id)).size, 9);
  assert.deepEqual(examQuestions.map((question) => question.id), baseline.finalAnswers.map(([, id]) => id));
});

test('答卷判定只接受完整且完全正确的九项', () => {
  assert.equal(validateExam(canonical), true);
  const wrong = { ...canonical, dead_soul: 'mara' };
  assert.equal(validateExam(wrong), false);
  const partial = { ...canonical }; delete partial.shooter_body;
  assert.equal(validateExam(partial), false);
  const empty = makeExamDraft();
  assert.equal(validateExam(empty), false);
});

test('答卷只在 B7 对齐确认后出现且不含明文答案', () => {
  const before = emptySave(content.characters);
  assert.equal(examAvailable(before), false);
  assert.equal(finalExamPanel(before), '');
  const after = emptySave(content.characters);
  after.b7Alignment = { assigned: aligned, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  assert.equal(examAvailable(after), true);
  const panel = finalExamPanel(after);
  assert.ok(panel.includes('提交答卷'));
  assert.ok(panel.includes('终局答卷'));
  assert.ok(panel.includes('至少来自两份不同档案'), '导语应说明跨档案证据门槛');
  assert.ok(panel.includes('身体／地点') && panel.includes('灵魂指认') && panel.includes('因果连续'), '面板应有三个证据类别槽位');
  assert.ok(panel.includes('data-action="add-exam-evidence"'), '应有放入证据按钮');
  for (const question of examQuestions) assert.ok(panel.includes(`data-exam-index="${examQuestions.indexOf(question)}"`), `缺少 ${question.id}`);
  assert.ok(!panel.includes('data-exam-field'), '面板不应出现带 id 的字段属性');
  assert.ok(!panel.includes('answer:'), '面板不应出现明文答案字段');
});

test('提交后答卷显示三角还原与终局', () => {
  const save = emptySave(content.characters);
  save.b7Alignment = { assigned: aligned, submittedAt: '2026-08-18T00:00:00.000Z', correct: true };
  save.finalExam = { answers: { ...canonical }, evidence: { ...examEvidence }, submittedAt: '2026-08-18T00:01:00.000Z', correct: true };
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
  assert.ok(panel.includes('九项结论由身体／地点、灵魂指认与因果连续三类证据共同支撑'), '成功文案应指向三类证据');
});

test('v4 存档的答卷确认在迁移时清空，草稿保留', () => {
  const v4 = JSON.parse(JSON.stringify(emptySave(content.characters))) as Record<string, unknown>;
  v4.version = 4; delete v4.finalExamEvidenceDraft;
  v4.finalExamDraft = { ...canonical, dead_soul: '' };
  v4.finalExam = { answers: { ...canonical }, submittedAt: '2026-08-18T00:01:00.000Z', correct: true };
  const reloaded = migrateSave(v4, content.characters, content.documents);
  assert.ok(reloaded, '宽容迁移不拒绝旧档');
  assert.equal(reloaded?.version, 5);
  assert.equal(reloaded?.finalExam, null, 'v4 确认没有证据支撑，迁移时清空');
  assert.equal(reloaded?.finalExamDraft.dead_soul, '', '答卷草稿保留');
});

test('v5 完整链存档携带证据答卷往返', () => {
  const reloaded = migrateSave(JSON.parse(JSON.stringify(fullChainSave())), content.characters, content.documents);
  assert.equal(reloaded?.finalExam?.correct, true);
  assert.deepEqual(reloaded?.finalExam?.evidence, examEvidence);
  assert.equal(reloaded?.b7Alignment?.correct, true);
  assert.equal(reloaded?.version, 5);
});

test('v5 缺少证据的答卷确认被整档拒绝', () => {
  const save = fullChainSave();
  const stripped = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  const finalExam = stripped.finalExam as Record<string, unknown>;
  delete finalExam.evidence;
  assert.equal(migrateSave(stripped, content.characters, content.documents), null);
});

test('v5 白名单外的证据被整档拒绝', () => {
  const save = fullChainSave();
  const stripped = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
  const finalExam = stripped.finalExam as Record<string, unknown>;
  const evidence = (finalExam.evidence as Record<string, { docId: string }>);
  evidence.body_location = { docId: 'doc_b0_r_klara', segmentId: 's1' };
  assert.equal(migrateSave(stripped, content.characters, content.documents), null);
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
  assert.deepEqual(migrated?.finalExamDraft, makeExamDraft());
});
