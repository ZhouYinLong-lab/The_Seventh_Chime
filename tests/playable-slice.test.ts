import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { content } from '../src/content.ts';
import { documentHasPlayerTag, filteredDocuments } from '../src/archive.ts';
import { currentProgressNode, hintAvailable, hintFor } from '../src/hints.ts';
import { hypothesesPanel } from '../src/hypotheses.ts';
import { conflictingBodies } from '../src/hypothesis-rules.ts';
import { findByQuery, isReady, queryKey } from '../src/query.ts';
import { ORIGINAL_RING, isSameOrientation } from '../src/ring.ts';
import { MODIFIED_FRAME_ANSWER, deriveModifiedOccupancy, emptyModifiedFrameDraft, isSameSixRingOrientation, validateModifiedFrame } from '../src/modified-frame.ts';
import { chooseNewestSave, emptySave, migrateSave } from '../src/save.ts';

test('v1 存档迁移保留笔记、标注、阅读位置与旧假设', () => {
  const migrated = migrateSave({ version: 1, discovered: ['doc_b0_r_klara'], read: ['doc_b0_r_klara'], annotations: { doc_b0_r_klara: ['s1:mechanical_fact'] }, notes: [{ id: 'n1', text: '旧笔记', refs: ['doc_b0_r_klara'] }], hypotheses: [{ body: 'klara', soul: 'verri' }], activeDoc: 'doc_b0_r_klara', query: { bell: 'b0', location: 'r_radio', bodies: ['klara'] } }, content.characters, content.documents);
  assert.ok(migrated);
  assert.equal(migrated?.version, 5);
  assert.equal(migrated?.notes[0].text, '旧笔记');
  assert.equal(migrated?.notes[0].refs[0].docId, 'doc_b0_r_klara');
  assert.equal(migrated?.annotations.doc_b0_r_klara[0], 's1:mechanical_fact');
  assert.equal(migrated?.hypotheses.b1.klara.primaryCandidate, 'verri');
  assert.equal(migrated?.activeDoc, 'doc_b0_r_klara');
});

test('v2 到 v3 迁移保留对象型段落证据引用并建立实时版框状态', () => {
  const save = emptySave(content.characters);
  save.discovered = ['doc_b0_r_klara']; save.read = ['doc_b0_r_klara']; save.activeDoc = 'doc_b0_r_klara'; save.activeSegmentId = 's1';
  save.notes.push({ id: 'n-object', text: '段落引用', refs: [{ docId: 'doc_b0_r_klara', segmentId: 's1' }] });
  save.hypotheses.b1.klara.evidenceRefs.push({ docId: 'doc_b0_r_klara', segmentId: 's1' });
  const v2 = JSON.parse(JSON.stringify(save)) as Record<string, unknown>; v2.version = 2; delete v2.modifiedFrameDraft; delete v2.derivedOccupancyB5B7; delete v2.terminalLog;
  const reloaded = migrateSave(v2, content.characters, content.documents);
  assert.equal(reloaded?.version, 5);
  assert.deepEqual(reloaded?.notes[0].refs, [{ docId: 'doc_b0_r_klara', segmentId: 's1' }]);
  assert.deepEqual(reloaded?.hypotheses.b1.klara.evidenceRefs, [{ docId: 'doc_b0_r_klara', segmentId: 's1' }]);
  assert.equal(reloaded?.activeSegmentId, 's1');
});

const validModifiedDraft = () => ({ ...emptyModifiedFrameDraft(), ...MODIFIED_FRAME_ANSWER, sixBodyRing: [...MODIFIED_FRAME_ANSWER.sixBodyRing], evidenceRefs: [{ docId: 'doc_b4_a_mateo', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's1' }, { docId: 'doc_b6_a_niko', segmentId: 's2' }] });

test('六人环接受旋转、拒绝反向与重复／缺失成员', () => {
  assert.ok(isSameSixRingOrientation([...MODIFIED_FRAME_ANSWER.sixBodyRing.slice(2), ...MODIFIED_FRAME_ANSWER.sixBodyRing.slice(0, 2)]));
  assert.ok(!isSameSixRingOrientation([...MODIFIED_FRAME_ANSWER.sixBodyRing].reverse()));
  assert.ok(!isSameSixRingOrientation(['mara', 'klara', 'livia', 'verri', 'mateo', 'mateo']));
  assert.ok(!isSameSixRingOrientation(['mara', 'klara', 'livia', 'verri', 'mateo']));
});

test('实时版框要求证据，且锚定肉体不得进入六槽', () => {
  const insufficient = validModifiedDraft(); insufficient.evidenceRefs = insufficient.evidenceRefs.slice(0, 2);
  assert.ok(validateModifiedFrame(insufficient).failures.includes('evidence'));
  const anchored = validModifiedDraft(); anchored.sixBodyRing = ['mara', 'klara', 'livia', 'verri', 'mateo', 'niko'];
  assert.ok(validateModifiedFrame(anchored).failures.includes('ring'));
});

test('B5–B7 推导与作者基线完全一致', async () => {
  const author = JSON.parse(await readFile(new URL('../author/baseline.json', import.meta.url), 'utf8')) as { occupancy: Record<string, Record<string, string>> };
  const derived = deriveModifiedOccupancy(ORIGINAL_RING, validModifiedDraft());
  assert.deepEqual(derived, { b5: author.occupancy.b5, b6: author.occupancy.b6, b7: author.occupancy.b7 });
});

test('损坏导入会被拒绝，current 与 backup 选择较新的有效存档', () => {
  const older = emptySave(content.characters); older.updatedAt = '2026-01-01T00:00:00.000Z';
  const newer = emptySave(content.characters); newer.updatedAt = '2026-02-01T00:00:00.000Z';
  assert.equal(chooseNewestSave([older, newer], content.characters, content.documents)?.updatedAt, newer.updatedAt);
  const damaged = { ...newer, discovered: ['not-a-document'] };
  assert.equal(migrateSave(damaged, content.characters, content.documents), null);
  const badGrid = structuredClone(newer); delete (badGrid.hypotheses.b1 as Record<string, unknown>).mara;
  assert.equal(migrateSave(badGrid, content.characters, content.documents), null);
  const badStage = structuredClone(newer); badStage.stageSubmissions = { originalRing: { ring: ['mara', 'mara'], correct: true, submittedAt: newer.updatedAt } };
  assert.equal(migrateSave(badStage, content.characters, content.documents), null);
});

test('查询键与肉体输入顺序无关', () => {
  const first = queryKey({ bell: 'b0', location: 'h_admin', bodies: ['mara', 'kovac', 'verri'] });
  const second = queryKey({ bell: 'b0', location: 'h_admin', bodies: ['verri', 'mara', 'kovac'] });
  assert.equal(first, second);
});

test('B4 前界面不暴露正式推演术语', () => {
  const markup = hypothesesPanel(emptySave(content.characters), false);
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改']) assert.ok(!markup.includes(forbidden), `预揭示界面含有 ${forbidden}`);
});

test('原始圆环接受整体旋转，但拒绝反向排列', () => {
  assert.ok(isSameOrientation([...ORIGINAL_RING.slice(3), ...ORIGINAL_RING.slice(0, 3)]));
  assert.ok(!isSameOrientation([...ORIGINAL_RING].reverse()));
});

test('重复主要候选会被识别为一一对应冲突', () => {
  const save = emptySave(content.characters);
  save.hypotheses.b1.mara.primaryCandidate = 'verri';
  save.hypotheses.b1.klara.primaryCandidate = 'verri';
  assert.deepEqual([...conflictingBodies(save.hypotheses, 'b1')].sort(), ['klara', 'mara']);
});

test('标签筛选只依据玩家已标注的段落', () => {
  const save = emptySave(content.characters); save.discovered = ['doc_b0_r_klara', 'doc_b0_c_niko']; save.read = [...save.discovered];
  save.annotations.doc_b0_r_klara = ['s1:mechanical_fact']; save.archiveFilters.tag = 'mechanical_fact';
  const radio = content.documents.find((doc) => doc.id === 'doc_b0_r_klara')!; const bell = content.documents.find((doc) => doc.id === 'doc_b0_c_niko')!;
  assert.ok(documentHasPlayerTag(save, radio, 'mechanical_fact'));
  assert.ok(!documentHasPlayerTag(save, bell, 'mechanical_fact'));
  assert.deepEqual(filteredDocuments(content.documents, save).map((doc) => doc.id), ['doc_b0_r_klara']);
});

test('提示按当前推进节点在八次无效查询后逐级开放', () => {
  const save = emptySave(content.characters); const node = currentProgressNode(save.discovered); save.hintState.nodeKey = node; save.hintState.invalidQueries = 7;
  assert.ok(!hintAvailable(save.hintState, node)); save.hintState.invalidQueries = 8;
  assert.ok(hintAvailable(save.hintState, node));
  for (const level of [1, 2, 3, 4] as const) assert.ok(hintFor(node, level).length > 0);
});

test('完整 B0–B4 查询通路可按前置条件推进至原始校样', () => {
  const discovered: string[] = [];
  const candidates = content.documents.filter((doc) => ['b0', 'b1', 'b2', 'b3', 'b4'].includes(doc.bell));
  let changed = true;
  while (changed) { changed = false; for (const expected of candidates) { const found = findByQuery(content.documents, { bell: expected.bell, location: expected.location, bodies: [...expected.bodies].reverse() }); assert.equal(found?.id, expected.id); if (!discovered.includes(expected.id) && isReady(expected, discovered)) { discovered.push(expected.id); changed = true; } } }
  assert.ok(discovered.includes('doc_b4_a_mateo'));
});
