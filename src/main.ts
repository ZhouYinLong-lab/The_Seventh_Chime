import content from './data/public-content.json';
import extendedDocuments from './data/extended-documents.json';
import './styles.css';

type Doc = any;
type Save = {
  version: 1;
  discovered: string[];
  read: string[];
  annotations: Record<string, string[]>;
  notes: { id: string; text: string; refs: string[] }[];
  hypotheses: { body: string; soul: string }[];
  activeDoc: string | null;
  query: { bell: string; location: string; bodies: string[] };
  attempts: number;
  tab: string;
  updatedAt: string;
};

const storageKey = 'btb.save.v1.current';
const backupKey = 'btb.save.v1.backup';
const byId = <T extends { id: string }>(items: readonly T[]) => new Map(items.map((item) => [item.id, item]));
const allDocuments: Doc[] = [...content.documents, ...extendedDocuments];
const documents = byId(allDocuments);
const characters = byId(content.characters);
const locations = byId(content.locations);
const emptySave = (): Save => ({ version: 1, discovered: [], read: [], annotations: {}, notes: [], hypotheses: [], activeDoc: null, query: { bell: 'b0', location: 'h_admin', bodies: [] }, attempts: 0, tab: 'query', updatedAt: new Date().toISOString() });

function load(): Save {
  for (const key of [storageKey, backupKey]) {
    try {
      const candidate = JSON.parse(localStorage.getItem(key) || 'null') as Save | null;
      if (candidate?.version === 1 && Array.isArray(candidate.discovered)) return { ...emptySave(), ...candidate };
    } catch { /* Try the backup below. */ }
  }
  return emptySave();
}

let state = load();
let feedback = '选择一组由线索支持的时段、地点与在场肉体，然后检索记录。';
const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
const bodyName = (id: string) => characters.get(id)?.cn || id;
const bellName = (id: string) => content.bells.find((bell) => bell.id === id)?.label || id;
const locationName = (id: string) => locations.get(id)?.name || id;
const isRevealed = () => state.discovered.includes('doc_b4_a_mateo');
const tagName = (tag: string) => (content.tags as Record<string, { before: string; after: string }>)[tag]?.[isRevealed() ? 'after' : 'before'] || tag;
const ready = (doc: Doc) => doc.initial || doc.prerequisites.every((id: string) => state.discovered.includes(id));
const canonicalBodies = (ids: string[]) => [...ids].sort().join('+');

function save() {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(backupKey, localStorage.getItem(storageKey) || JSON.stringify(state));
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    feedback = '浏览器未能写入本地存档。请立即导出进度。';
  }
}

function discover(doc: Doc) {
  if (!state.discovered.includes(doc.id)) state.discovered.push(doc.id);
  if (!state.read.includes(doc.id)) state.read.push(doc.id);
  state.activeDoc = doc.id;
  state.attempts = 0;
  feedback = `已发现：${doc.title}。地点表已记录这份档案确认的肉体位置。`;
  save();
}

function query() {
  const queryBodies = canonicalBodies(state.query.bodies);
  const match = allDocuments.find((doc) => doc.bell === state.query.bell && doc.location === state.query.location && canonicalBodies(doc.bodies) === queryBodies);
  if (match && ready(match)) {
    discover(match);
  } else if (match) {
    state.attempts += 1;
    feedback = '当前线索尚不足以确认这条记录。继续检查已经打开的档案。';
    save();
  } else {
    state.attempts += 1;
    const knownElsewhere = state.query.bodies.find((body) => state.discovered.some((id) => {
      const doc = documents.get(id)!;
      return doc.bell === state.query.bell && doc.bodies.includes(body) && doc.location !== state.query.location;
    }));
    feedback = knownElsewhere ? `${bodyName(knownElsewhere)} 肉体已被已读记录确认在本时段的另一地点。` : '没有找到符合这些条件的主要记录。';
    save();
  }
  render();
}

function selectOptions<T extends { id: string }>(items: readonly T[], current: string, label: (item: T) => string) {
  return items.map((item) => `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${esc(label(item))}</option>`).join('');
}

function reader(doc: Doc | undefined) {
  if (!doc) return `<section id="reader" class="panel reader empty" tabindex="-1"><p class="eyebrow">档案阅读器</p><h2>尚未打开记录</h2><p>从左侧选择一组有依据的查询条件。所有记录只按肉体识别。</p></section>`;
  const annotation = state.annotations[doc.id] || [];
  const segments = doc.segments.map((segment: any) => {
    const speaker = 'speaker' in segment && segment.speaker ? `<span class="speaker">肉体识别：${esc(bodyName(segment.speaker))}</span>` : '';
    return `<article class="segment ${segment.type}">${speaker}<p>${esc(segment.text)}</p><div class="tag-row">${doc.tagOptions.map((tag: string) => `<button class="tag ${annotation.includes(`${segment.id}:${tag}`) ? 'active' : ''}" data-action="tag" data-doc="${doc.id}" data-segment="${segment.id}" data-tag="${tag}" aria-pressed="${annotation.includes(`${segment.id}:${tag}`)}">${esc(tagName(tag))}</button>`).join('')}</div></article>`;
  }).join('');
  return `<section id="reader" class="panel reader" tabindex="-1"><div class="archive-heading"><div><p class="eyebrow">${esc(doc.sceneId)}</p><h2>${esc(doc.title)}</h2></div><button class="quiet" data-action="pin-note" data-doc="${doc.id}">引用当前档案</button></div><dl class="metadata"><div><dt>时段</dt><dd>${esc(bellName(doc.bell))}</dd></div><div><dt>地点</dt><dd>${esc(locationName(doc.location))}</dd></div><div><dt>物理在场</dt><dd>${doc.bodies.map(bodyName).map(esc).join('、')}</dd></div><div><dt>来源／可靠性</dt><dd>${esc(doc.sources)} · ${esc(doc.reliability)}</dd></div></dl><div class="segments">${segments}</div><aside class="attachment"><h3>附件</h3>${doc.attachments.map((item: string) => `<p>${esc(item)}</p>`).join('')}</aside><p class="reader-note">${isRevealed() ? '记录中的姓名按肉体识别；任何意志归属均是你的推理。' : '本档案记录脸、声线、门禁与物品；它不解释行为为何异常。'}</p></section>`;
}

function locationGrid() {
  const bells = content.bells;
  const cells = content.characters.map((character) => `<tr><th scope="row">${esc(character.cn)}</th>${bells.map((bell) => {
    const support = state.discovered.map((id) => documents.get(id)!).filter((doc) => doc.bell === bell.id && doc.bodies.includes(character.id));
    return `<td>${support.length ? `<button class="fact" data-action="open" data-doc="${support[0].id}">${esc(locations.get(support[0].location)?.code || '')}</button>` : '—'}</td>`;
  }).join('')}</tr>`).join('');
  return `<section class="panel compact"><h2>客观地点表</h2><p class="small">仅显示已由档案确认的肉体位置。</p><div class="table-wrap"><table><thead><tr><th>肉体</th>${bells.map((bell) => `<th>${esc(bell.id.toUpperCase())}</th>`).join('')}</tr></thead><tbody>${cells}</tbody></table></div></section>`;
}

function hypothesisPanel() {
  if (!isRevealed()) return `<section class="panel compact concealed"><h2>未解释情报</h2><p>先整理记录中的异常技能、私密情报与身体限制。正式分类尚未出现。</p></section>`;
  const options = content.characters.map((character) => `<option value="${character.id}">${esc(character.cn)}</option>`).join('');
  const hypotheses = state.hypotheses.length ? state.hypotheses.map((item, index) => `<li><span>肉体 ${esc(bodyName(item.body))}</span><span>你的候选：${esc(bodyName(item.soul))}</span><button class="icon-button" data-action="remove-hypothesis" data-index="${index}" aria-label="删除该假设">×</button></li>`).join('') : '<li class="muted">尚无假设。系统不会替你填入答案。</li>';
  return `<section class="panel compact hypothesis"><h2>灵魂假设</h2><p class="small">以下均为玩家假设，不是系统确认事实。</p><div class="two-inputs"><label>肉体<select id="hyp-body">${options}</select></label><label>候选灵魂<select id="hyp-soul">${options}</select></label></div><button data-action="add-hypothesis">记录候选</button><ul>${hypotheses}</ul><fieldset><legend>校样片段（切片练习）</legend><p class="small">依《原始校样》按轮转方向排列前四个名字。它不会替你推断其他身份。</p><div class="ring-inputs">${[0, 1, 2, 3].map((index) => `<label>${index + 1}<select id="ring-${index}">${options}</select></label>`).join('')}</div><button data-action="submit-ring">检查片段方向</button></fieldset></section>`;
}

function notePanel() {
  const notes = state.notes.length ? state.notes.map((note, index) => `<li><p>${esc(note.text)}</p><small>${note.refs.map((id) => esc(documents.get(id)?.title || id)).join('；')}</small><button class="quiet" data-action="delete-note" data-index="${index}">删除</button></li>`).join('') : '<li class="muted">还没有笔记。</li>';
  return `<section class="panel compact"><h2>调查笔记</h2><label for="note-text">写下可检验的观察</label><textarea id="note-text" rows="5" placeholder="例如：同一肉体在 B0 与 B1 的节奏是否一致？"></textarea><button data-action="add-note">保存笔记</button><ul class="notes">${notes}</ul></section>`;
}

function leftPanel() {
  const selected = new Set(state.query.bodies);
  const initialSeeds = ['B0 · H：玛拉、科瓦奇、维里', 'B0 · R：克拉拉', 'B0 · J：莉维娅、马特奥', 'B0 · C：尼科'];
  return `<section class="panel query-panel"><p class="eyebrow">调查台</p><h1>《黑潮钟》</h1><p class="subtitle">档案记得每张脸，却不知道是谁在里面。</p><label for="bell">时段<select id="bell">${selectOptions(content.bells, state.query.bell, (bell) => bell.label)}</select></label><label for="location">主地点<select id="location">${selectOptions(content.locations, state.query.location, (location) => `${location.code}｜${location.name}`)}</select></label><fieldset><legend>物理在场肉体（1–3 具）</legend><div class="body-options">${content.characters.map((character) => `<label><input type="checkbox" data-body="${character.id}" ${selected.has(character.id) ? 'checked' : ''}/><span>${esc(character.cn)}</span></label>`).join('')}</div></fieldset><button class="primary" data-action="query">检索记录</button><p class="feedback" role="status">${esc(feedback)}</p>${state.attempts >= 3 ? `<button class="quiet" data-action="hint">需要调查方向？</button>` : ''}<section class="directions"><h2>已知方向</h2><ul>${[...new Set(state.discovered.flatMap((id) => documents.get(id)?.hints || []))].slice(-4).map((hint) => `<li>${esc(hint)}</li>`).join('') || initialSeeds.map((hint) => `<li>${hint}</li>`).join('')}</ul></section></section>`;
}

function archive() {
  const discovered = state.discovered.map((id) => documents.get(id)!).filter(Boolean);
  return `<section class="panel archive"><h2>档案库 <span>${discovered.length}/${allDocuments.length}</span></h2><div class="archive-list">${discovered.length ? discovered.map((doc) => `<button class="archive-item ${state.activeDoc === doc.id ? 'current' : ''}" data-action="open" data-doc="${doc.id}"><span>${esc(doc.sceneId)}</span><strong>${esc(doc.title)}</strong><small>${esc(bellName(doc.bell))} · ${esc(locations.get(doc.location)?.code || '')}</small></button>`).join('') : '<p class="muted">尚未发现档案。</p>'}</div></section>`;
}

function utilities() {
  return `<div class="utilities"><button class="quiet" data-action="export">导出进度</button><label class="file-label">导入进度<input id="import-file" type="file" accept="application/json" /></label><button class="quiet danger" data-action="reset">重置</button></div>`;
}

function bellRail() {
  return `<nav class="bell-rail" aria-label="钟次导航">${content.bells.map((bell) => {
    const active = bell.id === state.query.bell;
    const revealed = isRevealed() && bell.id === 'b4';
    const reconstructed = bell.id === 'b7' && state.discovered.some((id) => documents.get(id)?.bell === 'b7');
    return `<button class="bell-chip ${active ? 'active' : ''} ${revealed ? 'revealed' : ''} ${reconstructed ? 'reconstructed' : ''}" data-action="select-bell" data-bell="${bell.id}" aria-pressed="${active}"><strong>${esc(bell.id.toUpperCase())}</strong><span>${esc(bell.label)}</span></button>`;
  }).join('')}</nav>`;
}

function render() {
  const active = state.activeDoc ? documents.get(state.activeDoc) : undefined;
  const nav = [['query', '查询'], ['archive', '档案'], ['facts', '地点'], ['notes', '笔记'], ...(isRevealed() ? [['hypotheses', '假设']] : [])];
  app.innerHTML = `<header><div><p class="eyebrow">THE SEVENTH CHIME</p><p class="save-state">已解锁 ${state.discovered.length} 份 · 本地保存</p></div>${utilities()}</header>${bellRail()}<nav class="mobile-nav" aria-label="工作台分区">${nav.map(([id, label]) => `<button data-action="tab" data-tab="${id}" class="${state.tab === id ? 'active' : ''}">${label}</button>`).join('')}</nav><main class="workspace"><aside class="left ${state.tab === 'query' ? 'mobile-visible' : ''}">${leftPanel()}${archive()}</aside><section class="center ${state.tab === 'archive' ? 'mobile-visible' : ''}">${reader(active)}</section><aside class="right ${['facts', 'notes', 'hypotheses'].includes(state.tab) ? 'mobile-visible' : ''}">${locationGrid()}${notePanel()}${hypothesisPanel()}</aside></main>`;
}

function exportSave() {
  const file = new Blob([JSON.stringify({ format: 'seventh-chime-save', save: state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: `seventh-chime-save-${new Date().toISOString().slice(0, 10)}.json` });
  link.click(); URL.revokeObjectURL(url);
}

function importSave(file: File) {
  file.text().then((text) => {
    try {
      const parsed = JSON.parse(text) as { save?: Save };
      if (parsed.save?.version !== 1 || !Array.isArray(parsed.save.discovered)) throw new Error('bad save');
      state = { ...emptySave(), ...parsed.save, discovered: parsed.save.discovered.filter((id) => documents.has(id)) };
      feedback = '进度已导入，并保留可识别的档案。'; save(); render();
    } catch { feedback = '导入失败：文件不是可识别的《黑潮钟》进度，现有存档未被覆盖。'; render(); }
  });
}

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.id === 'bell') state.query.bell = target.value;
  if (target.id === 'location') state.query.location = target.value;
  if (target instanceof HTMLInputElement && target.dataset.body) {
    const body = target.dataset.body;
    state.query.bodies = target.checked ? [...state.query.bodies, body].slice(0, 3) : state.query.bodies.filter((id) => id !== body);
    render();
  }
  if (target.id === 'import-file' && (target as HTMLInputElement).files?.[0]) importSave((target as HTMLInputElement).files![0]);
});

app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'query') { query(); return; }
  if (action === 'open') { const doc = documents.get(button.dataset.doc || ''); if (doc) { state.activeDoc = doc.id; if (!state.read.includes(doc.id)) state.read.push(doc.id); save(); render(); setTimeout(() => document.querySelector<HTMLElement>('#reader')?.focus(), 0); } return; }
  if (action === 'tag') { const key = `${button.dataset.segment}:${button.dataset.tag}`; const id = button.dataset.doc!; const tags = state.annotations[id] || []; state.annotations[id] = tags.includes(key) ? tags.filter((tag) => tag !== key) : [...tags, key]; save(); render(); return; }
  if (action === 'hint') { feedback = content.hints[Math.min(state.attempts - 3, content.hints.length - 1)]; render(); return; }
  if (action === 'pin-note') { const text = `引用：${documents.get(button.dataset.doc || '')?.title || ''}`; state.notes.push({ id: crypto.randomUUID(), text, refs: [button.dataset.doc!] }); save(); render(); return; }
  if (action === 'add-note') { const input = document.querySelector<HTMLTextAreaElement>('#note-text'); if (input?.value.trim()) { state.notes.push({ id: crypto.randomUUID(), text: input.value.trim(), refs: state.activeDoc ? [state.activeDoc] : [] }); save(); render(); } return; }
  if (action === 'delete-note') { state.notes.splice(Number(button.dataset.index), 1); save(); render(); return; }
  if (action === 'add-hypothesis') { const body = document.querySelector<HTMLSelectElement>('#hyp-body')?.value; const soul = document.querySelector<HTMLSelectElement>('#hyp-soul')?.value; if (body && soul) { state.hypotheses.push({ body, soul }); save(); render(); } return; }
  if (action === 'remove-hypothesis') { state.hypotheses.splice(Number(button.dataset.index), 1); save(); render(); return; }
  if (action === 'submit-ring') { const submitted = [0, 1, 2, 3].map((index) => document.querySelector<HTMLSelectElement>(`#ring-${index}`)?.value); feedback = submitted.join('|') === content.sliceRing.join('|') ? '该片段与校样所示轮转方向一致。完整圆环仍由你自己整理。' : '这段排列与已读校样或早期记录冲突。检查方向和重复姓名。'; render(); return; }
  if (action === 'export') { exportSave(); return; }
  if (action === 'reset') { if (confirm('重置本机的《黑潮钟》进度？建议先导出。')) { state = emptySave(); localStorage.removeItem(storageKey); localStorage.removeItem(backupKey); feedback = '进度已重置。'; render(); } return; }
  if (action === 'select-bell') { state.query.bell = button.dataset.bell || state.query.bell; state.tab = 'query'; feedback = `已切换至 ${bellName(state.query.bell)}。选择地点与在场肉体后检索记录。`; render(); return; }
  if (action === 'tab') { state.tab = button.dataset.tab || 'query'; render(); return; }
});

render();
