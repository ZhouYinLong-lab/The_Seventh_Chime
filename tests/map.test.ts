import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveLibrary } from '../src/archive.ts';
import { mapPanel } from '../src/map.ts';
import { content } from '../src/content.ts';
import { emptySave } from '../src/save.ts';

const freshSave = () => emptySave(content.characters);

test('设施地图渲染五个房间与七张名册卡，全部 open-archive', () => {
  const html = mapPanel(freshSave());
  assert.equal((html.match(/class="room-card /g) ?? []).length, 5);
  assert.equal((html.match(/class="roster-card"/g) ?? []).length, 7);
  assert.ok(html.includes('data-archive="arch_loc_r_radio"'));
  assert.ok(html.includes('data-archive="arch_person_verri"'));
  assert.ok(html.includes('本钟：尚无记录'));
});

test('房间三态：全未解锁为 sealed，全解锁为 complete', () => {
  const sealed = mapPanel(freshSave());
  assert.ok(sealed.includes('room-card sealed'));
  assert.ok(!sealed.includes('room-card partial'));
  const state = freshSave();
  state.discovered = content.documents.map((doc) => doc.id);
  const complete = mapPanel(state);
  assert.ok(complete.includes('room-card complete'));
  assert.ok(!complete.includes('room-card sealed'));
  assert.ok(complete.includes('已解封 8/8'));
});

test('部分解锁的房间为 partial', () => {
  const state = freshSave();
  state.discovered = ['doc_b0_r_klara'];
  const html = mapPanel(state);
  assert.ok(html.includes('room-card partial'));
  assert.ok(html.includes('本钟：已有记录'));
});

test('档案库渲染 12 项分两组并带条目级进度', () => {
  const html = archiveLibrary(freshSave());
  assert.ok(html.includes('地点记录'));
  assert.ok(html.includes('人事档案'));
  assert.equal((html.match(/class="archive-item /g) ?? []).length, 12);
  assert.ok(html.includes('《奥古斯托·维里 人事卷宗》'));
  assert.ok(html.includes('已解封 0/8'));
  assert.ok(html.includes(`档案库 <span>0/${content.documents.length}</span>`));
});

test('地图与档案库不泄露任何场景标题', () => {
  for (const html of [mapPanel(freshSave()), archiveLibrary(freshSave())]) {
    for (const doc of content.documents) assert.ok(!html.includes(doc.title), `泄露了「${doc.title}」`);
  }
});
