import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const output = await files(dist);
const forbidden = ['author/', 'answers.json', 'occupancy.json', 'correctSoul', 'bySoul'];
const baseline = JSON.parse(await readFile(new URL('../author/baseline.json', import.meta.url), 'utf8'));
// 发布产物中不允许出现「答案/时刻 + 问题/事件键」的明文配对：
// 压缩后的对象属性形如 answer:"verri"（无引号），且问题键与答案在源码内不得近距共现。
// 只统计「键↔值」的跨串距离：答案词本身是角色 id（verri/niko/kovac），会在 bodies 数组里合法地紧邻重复，
// 同串相邻距离不得计入，否则误报。
const minCrossDistance = (text, left, right) => {
  const leftPositions = [];
  let from = 0;
  while (true) { const at = text.indexOf(left, from); if (at === -1) break; leftPositions.push(at); from = at + left.length; }
  const rightPositions = [];
  from = 0;
  while (true) { const at = text.indexOf(right, from); if (at === -1) break; rightPositions.push(at); from = at + right.length; }
  let closest = Infinity;
  for (const leftAt of leftPositions) for (const rightAt of rightPositions) closest = Math.min(closest, Math.abs(leftAt - rightAt));
  return closest;
};
for (const file of output) {
  const text = await readFile(file, 'utf8');
  if (forbidden.some((needle) => text.includes(needle))) throw new Error(`发布产物泄露检查失败：${file}`);
  for (const [answer, id] of baseline.finalAnswers) {
    if (text.includes(`answer:"${answer}"`)) throw new Error(`发布产物泄露检查失败：${file} 含终局明文答案 ${answer}`);
    if (minCrossDistance(text, id, answer) < 120) throw new Error(`发布产物泄露检查失败：${file} 中 ${id} 与 ${answer} 距离不足 120 字符`);
  }
  for (const [time, id] of baseline.b7Timeline) {
    if (text.includes(`time:"${time}"`)) throw new Error(`发布产物泄露检查失败：${file} 含 B7 明文时刻 ${time}`);
    if (minCrossDistance(text, id, time) < 120) throw new Error(`发布产物泄露检查失败：${file} 中 ${id} 与 ${time} 距离不足 120 字符`);
  }
}
console.log(`发布产物检查通过：${output.length} 个文件未包含作者层路径、字段或明文答案配对。`);
