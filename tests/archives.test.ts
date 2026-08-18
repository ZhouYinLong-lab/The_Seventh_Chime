import assert from 'node:assert/strict';
import test from 'node:test';
import { content } from '../src/content.ts';
import { archiveById, archivesForDoc, discoveredIn, locationArchives, membersOf, parentArchive, personArchives } from '../src/archives.ts';

const bellOrder = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];

test('档案层恰有 12 本：5 地点 + 7 人事', () => {
  assert.equal(locationArchives.length, 5);
  assert.equal(personArchives.length, 7);
});

test('5 本地点档案互斥覆盖全部 35 份切片', () => {
  const memberIds = locationArchives.flatMap((meta) => membersOf(meta).map((doc) => doc.id));
  assert.equal(memberIds.length, 35);
  assert.equal(new Set(memberIds).size, 35);
  for (const meta of locationArchives) assert.ok(membersOf(meta).length > 0);
});

test('每本人事档案至少含一份切片，成员须出现在肉体或对话说话人中', () => {
  for (const meta of personArchives) {
    const members = membersOf(meta);
    assert.ok(members.length >= 1);
    for (const doc of members) {
      assert.ok(doc.bodies.includes(meta.entityId) || doc.segments.some((segment) => segment.speaker === meta.entityId));
    }
  }
});

test('parentArchive 指向所在设施，archivesForDoc 为父档案加全部人事档案', () => {
  for (const doc of content.documents) {
    const parent = parentArchive(doc);
    assert.ok(parent);
    assert.equal(parent.entityId, doc.location);
    const all = archivesForDoc(doc);
    assert.ok(all.includes(parent));
    const people = new Set([...doc.bodies, ...doc.segments.filter((segment) => segment.speaker).map((segment) => segment.speaker as string)]);
    assert.equal(all.length, 1 + people.size);
    for (const meta of all) assert.ok(membersOf(meta).some((member) => member.id === doc.id));
  }
});

test('成员按钟次排序，同钟次按档案 ID 排序', () => {
  for (const meta of [...locationArchives, ...personArchives]) {
    const members = membersOf(meta);
    for (let index = 1; index < members.length; index++) {
      const prev = bellOrder.indexOf(members[index - 1].bell);
      const current = bellOrder.indexOf(members[index].bell);
      assert.ok(prev < current || (prev === current && members[index - 1].id.localeCompare(members[index].id) < 0));
    }
  }
});

test('discoveredIn 只统计已发现成员', () => {
  const meta = archiveById.get('arch_loc_h_admin');
  assert.ok(meta);
  const memberIds = membersOf(meta).map((doc) => doc.id);
  assert.equal(discoveredIn(meta, []), 0);
  assert.equal(discoveredIn(meta, memberIds.slice(0, 2)), 2);
  assert.equal(discoveredIn(meta, memberIds), memberIds.length);
});
