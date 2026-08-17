import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../src/data/public-content.json', import.meta.url), 'utf8'));
data.documents.push(...JSON.parse(await readFile(new URL('../src/data/extended-documents.json', import.meta.url), 'utf8')));
test('查询键在切片中唯一且与肉体顺序无关', () => {
  const keys = data.documents.map((doc) => `${doc.bell}:${doc.location}:${[...doc.bodies].sort().join('+')}`);
  assert.equal(new Set(keys).size, keys.length);
});
test('B4 揭示档案可从初始档案依赖链到达', () => {
  const byId = new Map(data.documents.map((doc) => [doc.id, doc]));
  const reachable = new Set(data.documents.filter((doc) => doc.initial).map((doc) => doc.id));
  let changed = true;
  while (changed) { changed = false; for (const doc of data.documents) if (!reachable.has(doc.id) && doc.prerequisites.every((id) => reachable.has(id))) { reachable.add(doc.id); changed = true; } }
  assert.ok(reachable.has('doc_b4_a_mateo'));
  assert.ok(byId.get('doc_b4_a_mateo').segments.some((segment) => segment.text.includes('校样只能证明')));
});
