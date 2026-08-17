import './styles.css';
import { content, documents, isB4Revealed } from './content';
import { currentProgressNode, hintAvailable, hintFor, resetHintState } from './hints';
import { findByQuery, isReady, queryKey } from './query';
import { isSameOrientation } from './ring';
import { loadSave, migrateSave, persistSave, recordEvent, storageKey, backupKey, emptySave } from './save';
import { render } from './render';
import type { SaveV2 } from './types';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('缺少应用根节点。');
let state = loadSave(content.characters, content.documents);
let feedback = '从四份 B0 记录开始：每一份都由时段、地点与肉体组合定位。';
let storageNotice = '';
const saveAndRender = () => { if (persistSave(state)) storageNotice = ''; else storageNotice = '浏览器未能写入本地进度。请立即导出进度后检查存储空间或隐私设置。'; render(app, state, feedback, isB4Revealed(state.discovered), storageNotice); };
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const link = Object.assign(document.createElement('a'), { href: url, download: name }); link.click(); URL.revokeObjectURL(url); };
const markInteraction = () => { if (state.hintState.shownLevel) state.hintState.interactionSinceHint = true; };
const resetHintsForProgress = () => { state.hintState = resetHintState(currentProgressNode(state.discovered)); };
const openDoc = (id: string) => { const doc = documents.get(id); if (!doc) return; const wasRead = state.read.includes(id); state.activeDoc = id; state.activeSegmentId = null; markInteraction(); if (!wasRead) state.read.push(id); else recordEvent(state, 'revisit', { docId: id }); saveAndRender(); setTimeout(() => document.querySelector<HTMLElement>('#reader')?.focus(), 0); };
const discover = (id: string) => { const doc = documents.get(id); if (!doc) return; if (!state.discovered.includes(id)) { state.discovered.push(id); recordEvent(state, 'unlock', { docId: id, bell: doc.bell }); resetHintsForProgress(); if (id === 'doc_b4_a_mateo') { recordEvent(state, 'b4_reveal'); feedback = '原始校样已归档。旧记录的异常标签现在可以按新证据重新阅读。'; } } state.activeDoc = id; state.activeSegmentId = null; if (!state.read.includes(id)) state.read.push(id); };
const runQuery = () => { const doc = findByQuery(content.documents, state.query); const key = queryKey(state.query); if (doc && isReady(doc, state.discovered)) { const revisiting = state.discovered.includes(doc.id); recordEvent(state, 'query', { key, docId: doc.id }); if (revisiting) recordEvent(state, 'revisit', { docId: doc.id, via: 'query' }); state.queryHistory.push({ key, at: new Date().toISOString(), result: 'found', docId: doc.id }); discover(doc.id); feedback = revisiting ? `重新打开：${doc.title}。` : `已找到：${doc.title}。`; } else { state.attempts += 1; const result = doc ? 'locked' : 'invalid'; state.queryHistory.push({ key, at: new Date().toISOString(), result, ...(doc ? { docId: doc.id } : {}) }); const node = currentProgressNode(state.discovered); if (state.hintState.nodeKey !== node) state.hintState = resetHintState(node); state.hintState.invalidQueries += 1; recordEvent(state, 'invalid_query', { key, locked: Boolean(doc), node }); feedback = doc ? '当前线索尚不足以确认这条记录。继续检查已经打开的档案。' : '没有找到符合这些条件的主要记录。'; } saveAndRender(); };
const toggleCompare = (id: string) => { state.compareDocIds = state.compareDocIds.includes(id) ? state.compareDocIds.filter((item) => item !== id) : [...state.compareDocIds.slice(-1), id]; recordEvent(state, 'compare', { docId: id, selected: state.compareDocIds.includes(id) }); saveAndRender(); };
const importSave = (file: File) => file.text().then((text) => { try { const parsed = JSON.parse(text) as { save?: unknown }; const imported = migrateSave(parsed.save ?? parsed, content.characters, content.documents); if (!imported) throw new Error('bad save'); state = imported; feedback = '进度已导入；旧版存档已安全迁移到当前结构。'; saveAndRender(); } catch { feedback = '导入失败：文件包含损坏或不存在的档案、推演或引用，现有进度未被覆盖。'; render(app, state, feedback, isB4Revealed(state.discovered), storageNotice); } });

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  markInteraction();
  if (target.id === 'bell') state.query.bell = target.value as SaveV2['query']['bell'];
  else if (target.id === 'location') state.query.location = target.value;
  else if (target instanceof HTMLInputElement && target.dataset.body) { const body = target.dataset.body; state.query.bodies = target.checked ? [...state.query.bodies, body].slice(0, 3) : state.query.bodies.filter((id) => id !== body); }
  else if (target.dataset.filter) state.archiveFilters[target.dataset.filter as keyof SaveV2['archiveFilters']] = target.value as never;
  else if (target.dataset.hypBell && target.dataset.hypBody) { const cell = state.hypotheses[target.dataset.hypBell as keyof SaveV2['hypotheses']][target.dataset.hypBody]; cell.primaryCandidate = target.value || null; recordEvent(state, 'hypothesis_edit', { bell: target.dataset.hypBell, body: target.dataset.hypBody }); }
  else if (target instanceof HTMLInputElement && target.dataset.hypUncertain) { const [bell, body] = target.dataset.hypUncertain.split(':'); state.hypotheses[bell as keyof SaveV2['hypotheses']][body].uncertain = target.checked; recordEvent(state, 'hypothesis_edit', { bell, body, uncertain: target.checked }); }
  else if (target.dataset.ringIndex) state.draftOriginalRing[Number(target.dataset.ringIndex)] = target.value;
  else if (target instanceof HTMLInputElement && target.id === 'import-file' && target.files?.[0]) { importSave(target.files[0]); return; }
  saveAndRender();
});
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!button) return;
  const action = button.dataset.action; const docId = button.dataset.doc || '';
  if (action === 'query') return runQuery();
  if (action === 'open') return openDoc(docId);
  if (action === 'pin-doc') { state.pinnedDocIds = state.pinnedDocIds.includes(docId) ? state.pinnedDocIds.filter((id) => id !== docId) : [...state.pinnedDocIds, docId]; return saveAndRender(); }
  if (action === 'compare-doc') return toggleCompare(docId);
  markInteraction();
  if (action === 'select-segment') { state.activeDoc = docId; state.activeSegmentId = button.dataset.segment || null; return saveAndRender(); }
  if (action === 'tag') { const key = `${button.dataset.segment}:${button.dataset.tag}`; const tags = state.annotations[docId] || []; state.annotations[docId] = tags.includes(key) ? tags.filter((tag) => tag !== key) : [...tags, key]; state.activeDoc = docId; state.activeSegmentId = button.dataset.segment || null; return saveAndRender(); }
  if (action === 'quote-segment') { const doc = documents.get(docId); const segment = doc?.segments.find((item) => item.id === button.dataset.segment); if (segment) { state.activeDoc = docId; state.activeSegmentId = segment.id; state.notes.push({ id: crypto.randomUUID(), text: `摘录：${segment.text}`, refs: [{ docId, segmentId: segment.id }] }); } return saveAndRender(); }
  if (action === 'add-note') { const input = document.querySelector<HTMLTextAreaElement>('#note-text'); if (input?.value.trim()) state.notes.push({ id: crypto.randomUUID(), text: input.value.trim(), refs: state.activeDoc ? [{ docId: state.activeDoc, ...(state.activeSegmentId ? { segmentId: state.activeSegmentId } : {}) }] : [] }); return saveAndRender(); }
  if (action === 'delete-note') { state.notes.splice(Number(button.dataset.index), 1); return saveAndRender(); }
  if (action === 'hint') { const node = currentProgressNode(state.discovered); if (hintAvailable(state.hintState, node)) { const level = (state.hintState.shownLevel + 1) as 1 | 2 | 3 | 4; feedback = hintFor(node, level); state.hintState.shownLevel = level; state.hintState.interactionSinceHint = false; recordEvent(state, 'hint', { level, node }); } return saveAndRender(); }
  if (action === 'use-current-evidence') { const bell = button.dataset.hypBell as keyof SaveV2['hypotheses']; const body = button.dataset.hypBody!; if (state.activeDoc && state.activeSegmentId) { const cell = state.hypotheses[bell][body]; const ref = { docId: state.activeDoc, segmentId: state.activeSegmentId }; if (!cell.evidenceRefs.some((item) => item.docId === ref.docId && item.segmentId === ref.segmentId)) cell.evidenceRefs.push(ref); recordEvent(state, 'hypothesis_edit', { bell, body, evidence: state.activeDoc, segment: state.activeSegmentId }); } else feedback = '先在档案阅读器中选中一个具体段落，再把它放入假设格。'; return saveAndRender(); }
  if (action === 'submit-ring') { const candidate = state.draftOriginalRing; const complete = candidate.length === 7 && candidate.every(Boolean) && new Set(candidate).size === 7; const correct = complete && isSameOrientation(candidate); recordEvent(state, 'ring_submit', { complete, correct }); if (correct) { state.stageSubmissions.originalRing = { ring: [...candidate], submittedAt: new Date().toISOString(), correct: true }; feedback = '提交已保存。下表只按你提交的规则演算，仍由你决定如何解释证据。'; } else feedback = complete ? '这组方向与已读原件冲突。回看校样与早期记录；系统不会指出应替换哪一人。' : '请先填入七个互不重复的名字，再提交。'; return saveAndRender(); }
  if (action === 'select-bell') { state.query.bell = button.dataset.bell as SaveV2['query']['bell']; state.tab = 'query'; feedback = `已切换至 ${button.dataset.bell?.toUpperCase()}。`; return saveAndRender(); }
  if (action === 'tab') { state.tab = button.dataset.tab as SaveV2['tab']; return saveAndRender(); }
  if (action === 'export') return download(`seventh-chime-save-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-save', save: state });
  if (action === 'export-events') return download(`seventh-chime-playtest-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-playtest-events', events: state.playtestEvents });
  if (action === 'reset' && confirm('重置本机的《黑潮钟》进度？建议先导出。')) { state = emptySave(content.characters); try { localStorage.removeItem(storageKey); localStorage.removeItem(backupKey); } catch { storageNotice = '浏览器未能清除旧进度；请导出后检查本地存储设置。'; } feedback = '进度已重置。'; return saveAndRender(); }
});
render(app, state, feedback, isB4Revealed(state.discovered), storageNotice);
