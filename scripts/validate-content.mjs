import { readFile } from 'node:fs/promises';

const publicData = JSON.parse(await readFile(new URL('../src/data/public-content.json', import.meta.url), 'utf8'));
const extendedDocuments = JSON.parse(await readFile(new URL('../src/data/extended-documents.json', import.meta.url), 'utf8'));
const items = JSON.parse(await readFile(new URL('../src/data/items.json', import.meta.url), 'utf8'));
const worldEntries = JSON.parse(await readFile(new URL('../src/data/world-content.json', import.meta.url), 'utf8'));
publicData.documents = [...publicData.documents, ...extendedDocuments];
const author = JSON.parse(await readFile(new URL('../author/baseline.json', import.meta.url), 'utf8'));
const fail = (message) => { throw new Error(`内容校验失败：${message}`); };
const forbiddenPreReveal = ['灵魂', '占据', '圆环', '锚点', '实时版框', '规则修改'];
const bodies = Object.keys(author.locations);
const bellOrder = ['b0','b1','b2','b3','b4','b5','b6','b7'];
const graph = { h:['h','r','j','a','c'], r:['r','h'], j:['j','h'], a:['a','h','c'], c:['c','h','a'] };

const sceneIds = author.scenes.map(([id]) => id);
if (new Set(sceneIds).size !== sceneIds.length || sceneIds.length !== 35) fail('场景 ID 必须唯一且总数为 35。');
for (const [id, bell, location, sceneBodies] of author.scenes) {
  const index = bellOrder.indexOf(bell);
  for (const body of sceneBodies) if (author.locations[body]?.[index] !== location) fail(`${id} 的 ${body} 不在 ${location}。`);
}
for (const body of bodies) {
  if (author.locations[body].length !== 8) fail(`${body} 的地点矩阵不完整。`);
  for (let index = 1; index < 8; index++) if (!graph[author.locations[body][index - 1]]?.includes(author.locations[body][index])) fail(`${body} 在 ${bellOrder[index]} 的移动不合法。`);
}
for (const bell of bellOrder.slice(1)) {
  const occupancy = author.occupancy[bell];
  if (!occupancy || Object.keys(occupancy).length !== 7 || new Set(Object.values(occupancy)).size !== 7) fail(`${bell} 的灵魂与肉体不是一一对应。`);
}
if (author.occupancy.b7.verri !== 'niko' || author.occupancy.b7.kovac !== 'kovac' || author.occupancy.b7.niko !== 'verri') fail('B7 终局占据矩阵不符合基线。');
const documentIds = new Set(publicData.documents.map((doc) => doc.id));
if (documentIds.size !== publicData.documents.length || documentIds.size !== 35) fail('玩家档案 ID 必须唯一且总数为 35。');
if (new Set(publicData.documents.map((doc) => doc.sceneId)).size !== 35) fail('每个物理场景必须恰有一份主要玩家档案。');
for (const doc of publicData.documents) {
  if (new Set(doc.bodies).size !== doc.bodies.length) fail(`${doc.id} 的查询肉体重复。`);
  if (doc.prerequisites.some((id) => !documentIds.has(id))) fail(`${doc.id} 引用了不存在的解锁前置。`);
  if (!doc.sceneId || !sceneIds.includes(doc.sceneId)) fail(`${doc.id} 未引用有效场景。`);
  if (!Array.isArray(doc.hints) || doc.hints.length < 1) fail(`${doc.id} 缺少推进提示。`);
  for (const hint of doc.hints) {
    for (const term of forbiddenPreReveal) if (hint.includes(term)) fail(`${doc.id} 的推进提示在揭示前可见文本中使用了「${term}」。`);
  }
}
const visit = (id, path = new Set()) => {
  if (path.has(id)) fail(`解锁图存在循环：${[...path, id].join(' → ')}`);
  const doc = publicData.documents.find((candidate) => candidate.id === id);
  for (const parent of doc.prerequisites) visit(parent, new Set([...path, id]));
};
publicData.documents.forEach((doc) => visit(doc.id));
if (!publicData.documents.some((doc) => doc.initial)) fail('新存档没有初始可查询档案。');
const itemPaths = Object.values(author.items).flat();
if (!itemPaths.every((entry) => /^b[0-7]:/.test(entry))) fail('物件路径格式不连续或缺少时段。');
const itemIds = new Set(items.map((item) => item.id));
if (itemIds.size !== items.length) fail('物品 ID 必须唯一。');
const normalise = (input) => { const folded = input.normalize('NFKC').normalize('NFKD'); let output = ''; for (const char of folded) { const code = char.codePointAt(0); if (code < 0x300 || code > 0x36f) output += char; } return output.toUpperCase().replace(/[^A-Z0-9㐀-鿿]/g, ''); };
const itemKeys = new Set();
for (const item of items) {
  if (!item.name || !item.description) fail(`${item.id} 缺少名称或描述。`);
  if (!Array.isArray(item.aliases)) fail(`${item.id} 的别名必须是数组。`);
  for (const key of [item.name, ...item.aliases]) {
    const folded = normalise(key);
    if (!folded) fail(`${item.id} 包含空查询键。`);
    if (itemKeys.has(folded)) fail(`物品查询键冲突：${folded} 被多个物品使用。`);
    itemKeys.add(folded);
  }
  for (const term of forbiddenPreReveal) if (`${item.name}${item.description}${item.aliases.join('')}`.includes(term)) fail(`${item.id} 在揭示前可见文本中使用了「${term}」。`);
}
const worldIds = new Set(worldEntries.map((entry) => entry.id));
if (worldIds.size !== worldEntries.length) fail('背景条目 ID 必须唯一。');
for (const entry of worldEntries) {
  if (!entry.title || !entry.text) fail(`${entry.id} 缺少标题或正文。`);
  for (const term of forbiddenPreReveal) if (`${entry.title}${entry.text}`.includes(term)) fail(`${entry.id} 在揭示前可见文本中使用了「${term}」。`);
}
const expectedTimeline = ['jump','tape_start_and_interlock','list_to_signal_room','identity_check_blocked','holster_seal_broken','shot','tape_complete'];
if (author.b7Timeline.map(([, event]) => event).join('|') !== expectedTimeline.join('|')) fail('B7 秒级顺序被改变。');
console.log(`内容校验通过：${sceneIds.length} 个场景、${publicData.documents.length} 份玩家档案、${items.length} 件物品、${worldEntries.length} 条背景、B7 顺序固定。`);
