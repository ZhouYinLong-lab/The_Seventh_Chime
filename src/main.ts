import './styles.css';
import { content, documents, isB4Revealed } from './content';
import { findByQuery, isReady, queryKey } from './query';
import { isSameOrientation } from './ring';
import { loadSave, migrateSave, persistSave, recordEvent, storageKey, backupKey, emptySave } from './save';
import { render } from './render';
import type { SaveV2 } from './types';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('缺少应用根节点。');
let state = loadSave(content.characters);
let feedback = '从四份 B0 记录开始：每一份都由时段、地点与肉体组合定位。';
const saveAndRender = () => { persistSave(state); render(app, state, feedback, isB4Revealed(state.discovered)); };
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const link = Object.assign(document.createElement('a'), { href: url, download: name }); link.click(); URL.revokeObjectURL(url); };
const openDoc = (id: string) => { const doc = documents.get(id); if (!doc) return; const wasRead = state.read.includes(id); state.activeDoc = id; state.activeSegmentId = null; if (!wasRead) state.read.push(id); else recordEvent(state, 'revisit', { docId: id }); saveAndRender(); setTimeout(() => document.querySelector<HTMLElement>('#reader')?.focus(), 0); };
const discover = (id: string) => { const doc = documents.get(id); if (!doc) return; if (!state.discovered.includes(id)) { state.discovered.push(id); recordEvent(state, 'unlock', { docId: id, bell: doc.bell }); if (id === 'doc_b4_a_mateo') { recordEvent(state, 'b4_reveal'); feedback = '原始校样已归档。旧记录的异常标签现在可以按新证据重新阅读。'; } } state.activeDoc = id; if (!state.read.includes(id)) state.read.push(id); };
const runQuery = () => { const doc = findByQuery(content.documents, state.query); const key = queryKey(state.query); if (doc && isReady(doc, state.discovered)) { recordEvent(state, 'query', { key, docId: doc.id }); state.queryHistory.push({ key, at: new Date().toISOString(), result: 'found', docId: doc.id }); discover(doc.id); feedback = `已找到：${doc.title}。`; } else { state.attempts += 1; const result = doc ? 'locked' : 'invalid'; state.queryHistory.push({ key, at: new Date().toISOString(), result, ...(doc ? { docId: doc.id } : {}) }); recordEvent(state, 'invalid_query', { key, locked: Boolean(doc) }); feedback = doc ? '当前线索尚不足以确认这条记录。继续检查已经打开的档案。' : '没有找到符合这些条件的主要记录。'; } saveAndRender(); };
const toggleCompare = (id: string) => { state.compareDocIds = state.compareDocIds.includes(id) ? state.compareDocIds.filter((item) => item !== id) : [...state.compareDocIds.slice(-1), id]; recordEvent(state, 'compare', { docId: id, selected: state.compareDocIds.includes(id) }); saveAndRender(); };
const importSave = (file: File) => file.text().then((text) => { try { const parsed = JSON.parse(text) as { save?: unknown }; const imported = migrateSave(parsed.save ?? parsed, content.characters); if (!imported) throw new Error('bad save'); state = imported; feedback = '进度已导入；旧版存档已安全迁移到当前结构。'; saveAndRender(); } catch { feedback = '导入失败：文件不是可识别的《黑潮钟》进度，现有存档未被覆盖。'; render(app, state, feedback, isB4Revealed(state.discovered)); } });

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
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
  if (action === 'tag') { const key = `${button.dataset.segment}:${button.dataset.tag}`; const tags = state.annotations[docId] || []; state.annotations[docId] = tags.includes(key) ? tags.filter((tag) => tag !== key) : [...tags, key]; return saveAndRender(); }
  if (action === 'quote-segment') { const doc = documents.get(docId); const segment = doc?.segments.find((item) => item.id === button.dataset.segment); if (segment) state.notes.push({ id: crypto.randomUUID(), text: `摘录：${segment.text}`, refs: [{ docId, segmentId: segment.id }] }); return saveAndRender(); }
  if (action === 'add-note') { const input = document.querySelector<HTMLTextAreaElement>('#note-text'); if (input?.value.trim()) state.notes.push({ id: crypto.randomUUID(), text: input.value.trim(), refs: state.activeDoc ? [{ docId: state.activeDoc, ...(state.activeSegmentId ? { segmentId: state.activeSegmentId } : {}) }] : [] }); return saveAndRender(); }
  if (action === 'delete-note') { state.notes.splice(Number(button.dataset.index), 1); return saveAndRender(); }
  if (action === 'hint') { recordEvent(state, 'hint', { attempt: state.attempts }); feedback = content.hints[Math.min(Math.max(state.attempts - 2, 0), content.hints.length - 1)]; return saveAndRender(); }
  if (action === 'use-current-evidence') { const bell = button.dataset.hypBell as keyof SaveV2['hypotheses']; const body = button.dataset.hypBody!; if (state.activeDoc) { const cell = state.hypotheses[bell][body]; const ref = { docId: state.activeDoc, ...(state.activeSegmentId ? { segmentId: state.activeSegmentId } : {}) }; if (!cell.evidenceRefs.some((item) => item.docId === ref.docId && item.segmentId === ref.segmentId)) cell.evidenceRefs.push(ref); recordEvent(state, 'hypothesis_edit', { bell, body, evidence: state.activeDoc }); } return saveAndRender(); }
  if (action === 'submit-ring') { const candidate = state.draftOriginalRing; const complete = candidate.length === 7 && candidate.every(Boolean) && new Set(candidate).size === 7; const correct = complete && isSameOrientation(candidate); recordEvent(state, 'ring_submit', { complete, correct }); if (correct) { state.stageSubmissions.originalRing = { ring: [...candidate], submittedAt: new Date().toISOString(), correct: true }; feedback = '提交已保存。下表只按你提交的规则演算，仍由你决定如何解释证据。'; } else feedback = complete ? '这组方向与已读原件冲突。回看校样与早期记录；系统不会指出应替换哪一人。' : '请先填入七个互不重复的名字，再提交。'; return saveAndRender(); }
  if (action === 'select-bell') { state.query.bell = button.dataset.bell as SaveV2['query']['bell']; state.tab = 'query'; feedback = `已切换至 ${button.dataset.bell?.toUpperCase()}。`; return saveAndRender(); }
  if (action === 'tab') { state.tab = button.dataset.tab as SaveV2['tab']; return saveAndRender(); }
  if (action === 'export') return download(`seventh-chime-save-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-save', save: state });
  if (action === 'export-events') return download(`seventh-chime-playtest-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-playtest-events', events: state.playtestEvents });
  if (action === 'reset' && confirm('重置本机的《黑潮钟》进度？建议先导出。')) { state = emptySave(content.characters); localStorage.removeItem(storageKey); localStorage.removeItem(backupKey); feedback = '进度已重置。'; return saveAndRender(); }
});
render(app, state, feedback, isB4Revealed(state.discovered));
