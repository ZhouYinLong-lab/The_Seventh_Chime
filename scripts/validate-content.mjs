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
  const revealedLater = ['b4', 'b5', 'b6', 'b7'].includes(doc.bell);
  if (!revealedLater && `${doc.title}${doc.hints.join('')}${doc.attachments.join('')}${doc.segments.map((segment) => segment.text).join('')}`.includes('肉体')) fail(`${doc.id} 的揭示前文本（B0–B3）包含「肉体」。`);
  if (doc.id === 'doc_b4_a_mateo' && doc.hints.some((hint) => hint.includes('肉体'))) fail('doc_b4_a_mateo 的推进提示在揭示前即可经 HINT 露出，不能包含「肉体」。');
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
const archives = JSON.parse(await readFile(new URL('../src/data/archives.json', import.meta.url), 'utf8'));
if (!Array.isArray(archives) || archives.length !== 12) fail('档案层必须恰有 12 本档案。');
const archiveIds = new Set();
const locationEntityIds = new Set(publicData.locations.map((location) => location.id));
const characterIds = new Set(publicData.characters.map((character) => character.id));
const archiveForbidden = [...forbiddenPreReveal, '肉体'];
for (const meta of archives) {
  if (!['location', 'person'].includes(meta.kind)) fail(`${meta.id} 的档案类型必须为 location 或 person。`);
  if (meta.kind === 'location' && !meta.id.startsWith('arch_loc_')) fail(`${meta.id} 的地点档案 ID 必须以 arch_loc_ 开头。`);
  if (meta.kind === 'person' && !meta.id.startsWith('arch_person_')) fail(`${meta.id} 的人事档案 ID 必须以 arch_person_ 开头。`);
  if (meta.kind === 'location' && !locationEntityIds.has(meta.entityId)) fail(`${meta.id} 引用了不存在的设施地点。`);
  if (meta.kind === 'person' && !characterIds.has(meta.entityId)) fail(`${meta.id} 引用了不存在的角色。`);
  if (archiveIds.has(meta.id)) fail(`档案 ID 重复：${meta.id}`);
  archiveIds.add(meta.id);
  for (const term of archiveForbidden) if (`${meta.title}${meta.subtitle}${meta.description}`.includes(term)) fail(`${meta.id} 的档案文案包含揭示前禁词「${term}」。`);
}
const memberDocs = (meta) => publicData.documents.filter((doc) => meta.kind === 'location'
  ? doc.location === meta.entityId
  : doc.bodies.includes(meta.entityId) || doc.segments.some((segment) => segment.speaker === meta.entityId));
for (const meta of archives) {
  for (const title of memberDocs(meta).map((doc) => doc.title)) {
    if (`${meta.title}${meta.subtitle}${meta.description}`.includes(title)) fail(`${meta.id} 的档案文案泄露了成员标题「${title}」。`);
  }
}
const locationArchives = archives.filter((meta) => meta.kind === 'location');
if (locationArchives.length !== 5) fail('地点档案必须恰有 5 本。');
const locationMemberIds = locationArchives.flatMap((meta) => memberDocs(meta).map((doc) => doc.id));
if (locationMemberIds.length !== 35 || new Set(locationMemberIds).size !== 35) fail('5 本地点档案必须互斥覆盖全部 35 份切片。');
for (const meta of locationArchives) if (memberDocs(meta).length === 0) fail(`${meta.id} 没有任何成员切片。`);
const personArchives = archives.filter((meta) => meta.kind === 'person');
if (personArchives.length !== 7) fail('人事档案必须恰有 7 本。');
for (const meta of personArchives) if (memberDocs(meta).length === 0) fail(`${meta.id} 没有任何成员切片。`);
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
const expectedAnswers = ['corpse_body','dead_soul','shooter_soul','shooter_body','believed_target_soul','escaped_soul','escaped_body','frame_modifier','anchored_body'];
if (!Array.isArray(author.finalAnswers) || author.finalAnswers.length !== 9) fail('终局答卷必须恰有九项。');
const answerQuestionIds = author.finalAnswers.map(([, id]) => id);
if (answerQuestionIds.join('|') !== expectedAnswers.join('|')) fail('终局答卷的问题键被改变。');
const counts = { verri: 0, niko: 0, kovac: 0 };
for (const [answer] of author.finalAnswers) { if (!(answer in counts)) fail(`终局答卷答案 ${answer} 不是有效肉体。`); counts[answer] += 1; }
if (counts.verri !== 4 || counts.niko !== 3 || counts.kovac !== 2) fail('终局答卷的答案分布与基线不符。');
const expectedExamEvidence = ['body_location', 'soul_identity', 'causal_continuity'];
const b7Chain = ['doc_b4_r_klara', 'doc_b3_j_livia', 'doc_b4_j_livia', 'doc_b5_h_kovac_verri', 'doc_b5_r_mara_klara', 'doc_b5_j_livia', 'doc_b6_r_mara_klara', 'doc_b6_h_mateo_kovac_verri', 'doc_b6_j_livia', 'doc_b7_r_klara_kovac_verri'];
if (!author.examEvidence || typeof author.examEvidence !== 'object' || Array.isArray(author.examEvidence)) fail('终局证据白名单必须存在。');
const evidenceCategories = Object.keys(author.examEvidence);
if (evidenceCategories.join('|') !== expectedExamEvidence.join('|')) fail('终局证据白名单必须恰有三类且顺序固定。');
for (const category of expectedExamEvidence) {
  const docs = author.examEvidence[category];
  if (!Array.isArray(docs) || docs.length < 2 || docs.length > 3 || new Set(docs).size !== docs.length) fail(`${category} 的证据白名单必须含 2–3 份去重档案。`);
  for (const id of docs) {
    if (!documentIds.has(id)) fail(`${category} 的证据白名单引用不存在的档案：${id}。`);
    if (!b7Chain.includes(id)) fail(`${category} 的证据白名单档案 ${id} 不在 B7 链上。`);
  }
}
if (new Set(expectedExamEvidence.flatMap((category) => author.examEvidence[category])).size < 3) fail('终局证据白名单并集必须至少覆盖三份档案。');
const feedbackSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const characterNames = publicData.characters.map((character) => character.cn);
const feedbackLiteral = /feedback = '([^']*)'/g;
let feedbackMatch;
while ((feedbackMatch = feedbackLiteral.exec(feedbackSource))) {
  for (const name of characterNames) {
    if (feedbackMatch[1].includes(name)) fail(`反馈文案字面量含角色名「${name}」：被动反馈不得硬编码角色名，角色名只能经动态标题注入。`);
  }
}
console.log(`内容校验通过：${sceneIds.length} 个场景、${publicData.documents.length} 份玩家档案、${archives.length} 本档案、${items.length} 件物品、${worldEntries.length} 条背景、B7 顺序固定、终局答卷九项固定、终局证据白名单三类固定。`);
