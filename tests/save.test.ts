import assert from 'node:assert/strict';
import test from 'node:test';
import { content } from '../src/content.ts';
import { emptySave, migrateSave } from '../src/save.ts';

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
