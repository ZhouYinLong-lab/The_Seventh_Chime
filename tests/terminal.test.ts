import assert from 'node:assert/strict';
import test from 'node:test';
import { content, documents } from '../src/content.ts';
import { findItem, items, normaliseItem } from '../src/items.ts';
import { emptySave, migrateSave } from '../src/save.ts';
import { worldEntries, worldPanel } from '../src/world.ts';
import { canonicalKey, completionFor, normaliseKey, parseSceneKey, terminalHelp } from '../src/terminal.ts';

test('normaliseKey 忽略大小写、分隔符与变音符号', () => {
  assert.equal(normaliseKey('b4-a-mateo'), 'B4AMATEO');
  assert.equal(normaliseKey('B7 R: Klara Kovač'), 'B7RKLARAKOVAC');
  assert.equal(normaliseKey('B0：H，玛拉'), 'B0H');
  assert.equal(normaliseKey('b2.c. 尼科'), 'B2C');
});

test('parseSceneKey 解析规范编号', () => {
  assert.deepEqual(parseSceneKey('B4-A-MATEO'), { bell: 'b4', location: 'a_archive', bodies: ['mateo'] });
  assert.deepEqual(parseSceneKey('B7-R-KLARA-KOVAC-VERRI'), { bell: 'b7', location: 'r_radio', bodies: ['klara', 'kovac', 'verri'] });
  assert.deepEqual(parseSceneKey('B1-H-VERRI'), { bell: 'b1', location: 'h_admin', bodies: ['verri'] });
});

test('parseSceneKey 对肉体顺序不敏感', () => {
  assert.deepEqual(parseSceneKey('B7-R-VERRI-KLARA-KOVAC'), { bell: 'b7', location: 'r_radio', bodies: ['verri', 'klara', 'kovac'] });
  assert.deepEqual(parseSceneKey('B2-J-MATEO-LIVIA'), { bell: 'b2', location: 'j_medical', bodies: ['mateo', 'livia'] });
});

test('parseSceneKey 拒绝不完整或未知编号', () => {
  assert.equal(parseSceneKey('B0-H'), null);
  assert.equal(parseSceneKey('B5-X-MARA'), null);
  assert.equal(parseSceneKey('MATEO'), null);
  assert.equal(parseSceneKey('B8-A-MATEO'), null);
  assert.equal(parseSceneKey(''), null);
});

test('canonicalKey 输出规范文件名', () => {
  assert.equal(canonicalKey(documents.get('doc_b4_a_mateo')!), 'B4-A-MATEO');
  assert.equal(canonicalKey(documents.get('doc_b7_r_klara_kovac_verri')!), 'B7-R-KLARA-KOVAC-VERRI');
  assert.equal(canonicalKey(documents.get('doc_b3_h_mateo_kovac_verri')!), 'B3-H-KOVAC-MATEO-VERRI');
});

test('Tab 补全只覆盖已发现档案与指令', () => {
  const save = emptySave(content.characters);
  assert.equal(completionFor('B0-', save.discovered), null);
  save.discovered.push('doc_b0_r_klara');
  assert.equal(completionFor('B0-', save.discovered), 'B0-R-KLARA ');
  assert.equal(completionFor('b0:r', save.discovered), 'B0-R-KLARA ');
  assert.equal(completionFor('B1-', save.discovered), null);
  assert.equal(completionFor('OPEN B0-', save.discovered), 'OPEN B0-R-KLARA ');
  assert.equal(completionFor('HE', save.discovered), 'HELP ');
  save.discovered.push('doc_b0_c_niko');
  const completed = completionFor('B0-', save.discovered);
  assert.ok(completed && completed.startsWith('B0-') && !completed.endsWith(' '));
});

test('v3 存档迁移到 v4 保留全部状态并建立空指令日志', () => {
  const v3 = JSON.parse(JSON.stringify(emptySave(content.characters))) as Record<string, unknown>; v3.version = 3; delete v3.terminalLog;
  const migrated = migrateSave(v3, content.characters, content.documents);
  assert.equal(migrated?.version, 4);
  assert.deepEqual(migrated?.terminalLog, []);
  assert.equal(migrated?.discovered.length, 0);
});

test('v4 存档携带指令日志往返', () => {
  const save = emptySave(content.characters);
  save.terminalLog.push({ input: 'HELP', output: ['调查指令：'], at: '2026-08-18T00:00:00.000Z' });
  const reloaded = migrateSave(JSON.parse(JSON.stringify(save)), content.characters, content.documents);
  assert.equal(reloaded?.terminalLog.length, 1);
  assert.equal(reloaded?.terminalLog[0].input, 'HELP');
});

test('损坏的 v4 指令日志会被拒绝', () => {
  const save = JSON.parse(JSON.stringify(emptySave(content.characters))) as Record<string, unknown>;
  save.terminalLog = [{ input: 'HELP', output: 'not-an-array', at: '2026-08-18T00:00:00.000Z' }];
  assert.equal(migrateSave(save, content.characters, content.documents), null);
});

test('HELP 指令文本在 B4 前不含正式推演术语', () => {
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改']) assert.ok(!terminalHelp().join(' ').includes(forbidden), `HELP 含有 ${forbidden}`);
});

test('INSPECT 命中已登记物品与别名', () => {
  assert.equal(findItem('K-17')?.id, 'IT-GUN-K17');
  assert.equal(findItem('k17')?.id, 'IT-GUN-K17');
  assert.equal(findItem('配枪')?.id, 'IT-GUN-K17');
  assert.equal(findItem('Kovač 值勤钥匙串')?.id, 'IT-KEY-K');
  assert.equal(findItem('R-2')?.id, 'IT-KEY-R2');
  assert.equal(findItem('名单')?.id, 'IT-LIST-01');
  assert.equal(normaliseItem('K-17 手枪'), 'K17手枪');
  assert.equal(normaliseItem('配枪'), '配枪');
});

test('INSPECT 对未知物品不泄露存在性', () => {
  assert.equal(findItem('反潜鱼雷'), null);
  assert.equal(findItem('不存在的东西'), null);
});

test('物品档案在揭示前不含正式推演术语', () => {
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改']) {
    for (const item of items) assert.ok(!`${item.name}${item.description}${item.aliases.join('')}`.includes(forbidden), `${item.id} 含有 ${forbidden}`);
  }
  assert.ok(items.length >= 13, '物品登记簿过小');
});

test('背景志条目 ID 唯一且揭示前文本干净', () => {
  const ids = worldEntries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(worldEntries.length >= 6, '背景条目过少');
  for (const forbidden of ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改']) {
    for (const entry of worldEntries) assert.ok(!`${entry.title}${entry.text}`.includes(forbidden), `${entry.id} 含有 ${forbidden}`);
  }
});

test('背景志面板渲染全部条目', () => {
  const html = worldPanel();
  for (const entry of worldEntries) assert.ok(html.includes(entry.title), `${entry.id} 未渲染`);
});

test('world 标签存档往返', () => {
  const save = emptySave(content.characters);
  save.tab = 'world';
  const reloaded = migrateSave(JSON.parse(JSON.stringify(save)), content.characters, content.documents);
  assert.equal(reloaded?.tab, 'world');
});
