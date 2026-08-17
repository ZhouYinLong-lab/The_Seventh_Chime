import assert from 'node:assert/strict';
import test from 'node:test';
import { content } from '../src/content.ts';
import { hypothesesPanel } from '../src/hypotheses.ts';
import { conflictingBodies } from '../src/hypothesis-rules.ts';
import { findByQuery, isReady, queryKey } from '../src/query.ts';
import { ORIGINAL_RING, isSameOrientation } from '../src/ring.ts';
import { emptySave, migrateSave } from '../src/save.ts';

test('v1 存档迁移保留笔记、标注、阅读位置与旧假设', () => {
  const migrated = migrateSave({ version: 1, discovered: ['doc_b0_r_klara'], read: ['doc_b0_r_klara'], annotations: { doc_b0_r_klara: ['s1:mechanical_fact'] }, notes: [{ id: 'n1', text: '旧笔记', refs: ['doc_b0_r_klara'] }], hypotheses: [{ body: 'klara', soul: 'verri' }], activeDoc: 'doc_b0_r_klara', query: { bell: 'b0', location: 'r_radio', bodies: ['klara'] } }, content.characters);
  assert.ok(migrated);
  assert.equal(migrated?.version, 2);
  assert.equal(migrated?.notes[0].text, '旧笔记');
  assert.equal(migrated?.notes[0].refs[0].docId, 'doc_b0_r_klara');
  assert.equal(migrated?.annotations.doc_b0_r_klara[0], 's1:mechanical_fact');
  assert.equal(migrated?.hypotheses.b1.klara.primaryCandidate, 'verri');
  assert.equal(migrated?.activeDoc, 'doc_b0_r_klara');
});

test('查询键与肉体输入顺序无关', () => {
  const first = queryKey({ bell: 'b0', location: 'h_admin', bodies: ['mara', 'kovac', 'verri'] });
  const second = queryKey({ bell: 'b0', location: 'h_admin', bodies: ['verri', 'mara', 'kovac'] });
  assert.equal(first, second);
});

test('B4 前界面不暴露正式推演术语', () => {
  const markup = hypothesesPanel(emptySave(content.characters), false);
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点']) assert.ok(!markup.includes(forbidden), `预揭示界面含有 ${forbidden}`);
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

test('完整 B0–B4 查询通路可按前置条件推进至原始校样', () => {
  const discovered: string[] = [];
  const candidates = content.documents.filter((doc) => ['b0', 'b1', 'b2', 'b3', 'b4'].includes(doc.bell));
  let changed = true;
  while (changed) { changed = false; for (const expected of candidates) { const found = findByQuery(content.documents, { bell: expected.bell, location: expected.location, bodies: [...expected.bodies].reverse() }); assert.equal(found?.id, expected.id); if (!discovered.includes(expected.id) && isReady(expected, discovered)) { discovered.push(expected.id); changed = true; } } }
  assert.ok(discovered.includes('doc_b4_a_mateo'));
});
