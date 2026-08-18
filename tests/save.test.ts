import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { content } from '../src/content.ts';
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
const asV4 = (save: ReturnType<typeof fullChain>) => { const v4 = JSON.parse(JSON.stringify(save)) as Record<string, unknown>; v4.version = 4; delete v4.finalExamEvidenceDraft; return v4; };

const v3Shape = (characters = content.characters) => {
  const v3 = JSON.parse(JSON.stringify(emptySave(characters))) as Record<string, unknown>;
  v3.version = 3;
  for (const key of ['terminalLog', 'b7AlignmentDraft', 'b7Alignment', 'finalExamDraft', 'finalExam']) delete v3[key];
  return v3;
};

test('两次 emptySave 的草稿互不影响', () => {
  const first = emptySave(content.characters);
  first.finalExamDraft.corpse_body = 'verri';
  first.b7AlignmentDraft.shot = '23:00:43';
  const second = emptySave(content.characters);
  assert.equal(second.finalExamDraft.corpse_body, '', '上一局答卷输入不得带入新档');
  assert.equal(second.b7AlignmentDraft.shot, '', '上一局对齐输入不得带入新档');
  assert.notEqual(first.finalExamDraft, second.finalExamDraft);
  assert.notEqual(first.b7AlignmentDraft, second.b7AlignmentDraft);
});

test('两次 v3 迁移的草稿互不影响', () => {
  const first = migrateSave(v3Shape(), content.characters, content.documents);
  const second = migrateSave(v3Shape(), content.characters, content.documents);
  assert.ok(first && second);
  first.finalExamDraft.corpse_body = 'verri';
  first.b7AlignmentDraft.shot = '23:00:43';
  assert.equal(second.finalExamDraft.corpse_body, '', '迁移 A 的答卷输入不得带入迁移 B');
  assert.equal(second.b7AlignmentDraft.shot, '', '迁移 A 的对齐输入不得带入迁移 B');
  assert.notEqual(first.finalExamDraft, second.finalExamDraft);
  assert.notEqual(first.b7AlignmentDraft, second.b7AlignmentDraft);
});

test('迁移得到的草稿与再次 emptySave 也不共享', () => {
  const migrated = migrateSave(v3Shape(), content.characters, content.documents);
  assert.ok(migrated);
  migrated.finalExamDraft.corpse_body = 'verri';
  migrated.b7AlignmentDraft.shot = '23:00:43';
  const fresh = emptySave(content.characters);
  assert.equal(fresh.finalExamDraft.corpse_body, '');
  assert.equal(fresh.b7AlignmentDraft.shot, '');
});

test('v4 完整链迁移到 v5：对齐保留、答卷清空、证据草稿建立', () => {
  const migrated = migrateSave(asV4(fullChain()), content.characters, content.documents);
  assert.ok(migrated);
  assert.equal(migrated?.version, 5);
  assert.equal(migrated?.b7Alignment?.correct, true, '门禁齐备时对齐保留');
  assert.equal(migrated?.finalExam, null, 'v4 确认没有证据支撑，迁移清空');
  assert.deepEqual(migrated?.finalExamEvidenceDraft, { body_location: null, soul_identity: null, causal_continuity: null });
  assert.equal(migrated?.finalExamDraft.corpse_body, 'verri', '答卷草稿保留');
});

test('v4 伪造推进在迁移时被剥离，草稿保留', () => {
  const v4 = asV4(fullChain());
  v4.stageSubmissions = {}; v4.modifiedFrameSubmission = undefined; v4.derivedOccupancyB5B7 = null;
  v4.modifiedFrameDraft = { changedAfterBell: null, modifierSoul: null, removedName: null, anchorBody: null, sixBodyRing: [], evidenceRefs: [] };
  v4.b7AlignmentDraft = { ...aligned };
  const migrated = migrateSave(v4, content.characters, content.documents);
  assert.ok(migrated, 'v4 宽松解析不拒绝旧档');
  assert.equal(migrated?.b7Alignment, null, '缺少圆环／版框时对齐确认被剥离');
  assert.equal(migrated?.finalExam, null);
  assert.equal(migrated?.discovered.length, 6, '已发现档案保留');
  assert.equal(migrated?.b7AlignmentDraft.shot, '23:00:43', '对齐草稿保留可重交');
});

test('v5 门禁缺失时已确认状态被整档拒绝', () => {
  const stripped = JSON.parse(JSON.stringify(fullChain())) as Record<string, unknown>;
  stripped.stageSubmissions = {}; stripped.modifiedFrameSubmission = undefined; stripped.derivedOccupancyB5B7 = null;
  assert.equal(migrateSave(stripped, content.characters, content.documents), null, 'v5 对齐无门禁 → 整档拒绝');
  const noAlignment = JSON.parse(JSON.stringify(stripped)) as Record<string, unknown>;
  noAlignment.b7Alignment = null;
  assert.equal(migrateSave(noAlignment, content.characters, content.documents), null, 'v5 答卷无门禁 → 整档拒绝');
});

test('v5 合法完整链存档往返', () => {
  const reloaded = migrateSave(JSON.parse(JSON.stringify(fullChain())), content.characters, content.documents);
  assert.ok(reloaded);
  assert.equal(reloaded?.version, 5);
  assert.equal(reloaded?.b7Alignment?.correct, true);
  assert.equal(reloaded?.finalExam?.correct, true);
  assert.deepEqual(reloaded?.finalExam?.evidence, examEvidence);
  assert.deepEqual(reloaded?.finalExamEvidenceDraft, examEvidence);
});
