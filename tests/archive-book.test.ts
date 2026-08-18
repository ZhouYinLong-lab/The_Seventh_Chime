import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveBook } from '../src/archive-book.ts';
import { archiveById, locationArchives, membersOf, personArchives } from '../src/archives.ts';
import { content } from '../src/content.ts';
import { emptySave } from '../src/save.ts';

const freshSave = () => emptySave(content.characters);

test('整本阅读器：未解锁成员渲染为封条，只显示编号、钟次与地点代号', () => {
  const meta = archiveById.get('arch_loc_r_radio');
  assert.ok(meta);
  const html = archiveBook(meta, freshSave(), false, null);
  assert.ok(html.includes('id="reader"'));
  assert.ok(html.includes('class="panel reader book kind-location"'));
  assert.ok(html.includes('<h2>电讯区 收发记录</h2>'));
  assert.ok(html.includes('已解封 0/8'));
  assert.ok(html.includes('aria-label="封存条目 1"'));
  assert.ok(html.includes('封存条目 №1'));
  assert.ok(html.includes('B0｜钟前'));
  assert.ok(html.includes('尝试解封'));
  assert.ok(!html.includes('线路自检'));
});

test('已解锁成员渲染为条目：标题降 h3、标记 current、携带 data-doc', () => {
  const state = freshSave();
  state.discovered = ['doc_b0_r_klara'];
  state.read = ['doc_b0_r_klara'];
  state.activeDoc = 'doc_b0_r_klara';
  const html = archiveBook(archiveById.get('arch_loc_r_radio')!, state, false, null);
  assert.ok(html.includes('已解封 1/8'));
  assert.ok(html.includes('<article class="entry current"'));
  assert.ok(html.includes('data-doc="doc_b0_r_klara"'));
  assert.ok(html.includes('<h3>线路自检</h3>'));
  assert.ok(!html.includes('<h2>线路自检</h2>'));
});

test('人事卷宗按肉体与说话人纳入成员并保持卷宗样式', () => {
  const meta = archiveById.get('arch_person_verri');
  assert.ok(meta);
  const state = freshSave();
  state.discovered = ['doc_b0_h_mara_kovac_verri'];
  const html = archiveBook(meta, state, false, null);
  assert.ok(html.includes('class="panel reader book kind-personnel"'));
  assert.ok(html.includes('<h2>《奥古斯托·维里 人事卷宗》</h2>'));
  assert.ok(html.includes('已解封 1/8'));
});

test('封条反馈只在有提示时渲染', () => {
  const meta = archiveById.get('arch_loc_h_admin')!;
  assert.ok(!archiveBook(meta, freshSave(), false, null).includes('seal-feedback'));
  assert.ok(archiveBook(meta, freshSave(), false, '该条记录仍被封存：线索不足。').includes('class="seal-feedback" role="status"'));
});

test('全部 12 本档案全未解锁时封条不泄露任何场景标题', () => {
  for (const meta of [...locationArchives, ...personArchives]) {
    const html = archiveBook(meta, freshSave(), false, null);
    for (const member of membersOf(meta)) assert.ok(!html.includes(member.title), `${meta.id} 的封条泄露了「${member.title}」`);
  }
});
