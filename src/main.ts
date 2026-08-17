import './styles.css';
import { validateB7Alignment } from './b7-timeline';
import { examQuestions, validateExam } from './final-exam';
import { content, documents, isB4Revealed } from './content';
import { currentProgressNode, hintAvailable, hintFor, resetHintState } from './hints';
import { findItem } from './items';
import { findByQuery, isReady, queryKey } from './query';
import { isSameOrientation } from './ring';
import { deriveModifiedOccupancy, liveFrameAvailable, validateModifiedFrame } from './modified-frame';
import { loadSave, migrateSave, persistSave, recordEvent, storageKey, backupKey, emptySave } from './save';
import { render } from './render';
import { canonicalKey, completionFor, discoveredKeys, normaliseKey, parseSceneKey, terminalHelp } from './terminal';
import type { ArchiveDocument, SaveV4 } from './types';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('缺少应用根节点。');
let state = loadSave(content.characters, content.documents);
let feedback = '从四份 B0 记录开始：每一份都由时段、地点与肉体组合定位。';
let storageNotice = '';
let terminalCursor: number | null = null;
const saveAndRender = () => { if (persistSave(state)) storageNotice = ''; else storageNotice = '浏览器未能写入本地进度。请立即导出进度后检查存储空间或隐私设置。'; render(app, state, feedback, isB4Revealed(state.discovered), storageNotice); };
const download = (name: string, value: unknown) => { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); const link = Object.assign(document.createElement('a'), { href: url, download: name }); link.click(); URL.revokeObjectURL(url); };
const markInteraction = () => { if (state.hintState.shownLevel) state.hintState.interactionSinceHint = true; };
const resetHintsForProgress = () => { state.hintState = resetHintState(currentProgressNode(state.discovered)); };
const maybeRevealLiveFrame = () => { if (liveFrameAvailable(state) && !state.playtestEvents.some((event) => event.kind === 'modified_frame_reveal')) recordEvent(state, 'modified_frame_reveal'); };
const openDoc = (id: string) => { const doc = documents.get(id); if (!doc) return; const wasRead = state.read.includes(id); state.activeDoc = id; state.activeSegmentId = null; markInteraction(); if (!wasRead) state.read.push(id); else recordEvent(state, 'revisit', { docId: id }); saveAndRender(); setTimeout(() => document.querySelector<HTMLElement>('#reader')?.focus(), 0); };
const discover = (id: string) => { const doc = documents.get(id); if (!doc) return; if (!state.discovered.includes(id)) { state.discovered.push(id); recordEvent(state, 'unlock', { docId: id, bell: doc.bell }); resetHintsForProgress(); if (id === 'doc_b4_a_mateo') { recordEvent(state, 'b4_reveal'); feedback = '原始校样已归档。旧记录的异常标签现在可以按新证据重新阅读。'; } } state.activeDoc = id; state.activeSegmentId = null; if (!state.read.includes(id)) state.read.push(id); maybeRevealLiveFrame(); };
type QueryResult = 'found' | 'locked' | 'invalid';
const countInvalid = (key: string, locked: boolean) => {
  state.attempts += 1;
  state.queryHistory.push({ key, at: new Date().toISOString(), result: locked ? 'locked' : 'invalid' });
  const node = currentProgressNode(state.discovered);
  if (state.hintState.nodeKey !== node) state.hintState = resetHintState(node);
  state.hintState.invalidQueries += 1;
  recordEvent(state, 'invalid_query', { key, locked, node });
};
const executeQuery = (): QueryResult => {
  const doc = findByQuery(content.documents, state.query);
  const key = queryKey(state.query);
  if (doc && isReady(doc, state.discovered)) {
    const revisiting = state.discovered.includes(doc.id);
    recordEvent(state, 'query', { key, docId: doc.id });
    if (revisiting) recordEvent(state, 'revisit', { docId: doc.id, via: 'query' });
    state.queryHistory.push({ key, at: new Date().toISOString(), result: 'found', docId: doc.id });
    discover(doc.id);
    feedback = revisiting ? `重新打开：${doc.title}。` : `已找到：${doc.title}。`;
    return 'found';
  }
  countInvalid(key, Boolean(doc));
  feedback = doc ? '当前线索尚不足以确认这条记录。继续检查已经打开的档案。' : '没有找到符合这些条件的主要记录。';
  return doc ? 'locked' : 'invalid';
};
const toggleCompare = (id: string) => { state.compareDocIds = state.compareDocIds.includes(id) ? state.compareDocIds.filter((item) => item !== id) : [...state.compareDocIds.slice(-1), id]; recordEvent(state, 'compare', { docId: id, selected: state.compareDocIds.includes(id) }); saveAndRender(); };
const importSave = (file: File) => file.text().then((text) => { try { const parsed = JSON.parse(text) as { save?: unknown }; const imported = migrateSave(parsed.save ?? parsed, content.characters, content.documents); if (!imported) throw new Error('bad save'); state = imported; feedback = '进度已导入；旧版存档已安全迁移到当前结构。'; saveAndRender(); } catch { feedback = '导入失败：文件包含损坏或不存在的档案、推演或引用，现有进度未被覆盖。'; render(app, state, feedback, isB4Revealed(state.discovered), storageNotice); } });

type ResolveStatus = { status: 'ok'; doc: ArchiveDocument } | { status: 'error' } | { status: 'locked'; doc: ArchiveDocument } | { status: 'invalid' };
const resolveKey = (raw: string, requireDiscovered: boolean): ResolveStatus => {
  const parsed = parseSceneKey(raw);
  if (!parsed) return { status: 'error' };
  const doc = findByQuery(content.documents, parsed);
  if (!doc) return { status: 'invalid' };
  if (!isReady(doc, state.discovered) || (requireDiscovered && !state.discovered.includes(doc.id))) return { status: 'locked', doc };
  return { status: 'ok', doc };
};
const appendTerminal = (input: string, output: string[]) => { state.terminalLog.push({ input, output, at: new Date().toISOString() }); state.terminalLog = state.terminalLog.slice(-60); };
const openByKey = (raw: string): string[] => {
  const resolved = resolveKey(raw, false);
  if (resolved.status === 'error') return ['档案编号无法识别。格式：时段-地点-肉体，例如 OPEN B0-H-MARA-KOVAC-VERRI。'];
  if (resolved.status === 'invalid') { countInvalid(normaliseKey(raw), false); return ['没有找到符合这些条件的主要记录。']; }
  if (resolved.status === 'locked') { countInvalid(canonicalKey(resolved.doc), true); return ['当前线索尚不足以确认这条记录。继续检查已经打开的档案。']; }
  state.query = { bell: resolved.doc.bell, location: resolved.doc.location, bodies: [...resolved.doc.bodies] };
  executeQuery();
  return [`${canonicalKey(resolved.doc)} · ${resolved.doc.title}`, '已归档。'];
};
const compareByKeys = (left: string, right: string): string[] => {
  const first = resolveKey(left, true);
  const second = resolveKey(right, true);
  if (first.status === 'error' || second.status === 'error') return ['档案编号无法识别。格式：时段-地点-肉体，例如 COMPARE B0-R-KLARA B0-C-NIKO。'];
  if (first.status === 'invalid' || second.status === 'invalid') { countInvalid(normaliseKey(first.status === 'invalid' ? left : right), false); return ['没有找到符合这些条件的主要记录。']; }
  if (first.status === 'locked' || second.status === 'locked') { const failed = first.status === 'locked' ? first : second; if (failed.status === 'locked') countInvalid(canonicalKey(failed.doc), true); return ['当前线索尚不足以确认这条记录。继续检查已经打开的档案。']; }
  state.compareDocIds = [first.doc.id, second.doc.id];
  recordEvent(state, 'compare', { docId: first.doc.id, selected: true });
  recordEvent(state, 'compare', { docId: second.doc.id, selected: true });
  return [`已加入比较：${canonicalKey(first.doc)} · ${first.doc.title}`, `已加入比较：${canonicalKey(second.doc)} · ${second.doc.title}`];
};
const filesText = (): string[] => {
  if (!state.discovered.length) return ['尚未发现任何档案。', '从 B0 的四个地点开始：H 行政楼、R 电讯区、J 拘留／医疗区、C 钟楼。', '输入 HELP 查看指令。'];
  const lines: string[] = [`已发现档案（${state.discovered.length} 份）：`];
  for (const bell of content.bells) {
    const group = state.discovered.map((id) => documents.get(id)).filter((doc): doc is ArchiveDocument => Boolean(doc && doc.bell === bell.id));
    if (!group.length) continue;
    lines.push(`${bell.id.toUpperCase()}：`);
    for (const doc of group) lines.push(`  ${canonicalKey(doc)} · ${doc.title}${state.read.includes(doc.id) ? '' : '（未读）'}`);
  }
  return lines;
};
const goalsText = (): string[] => {
  const node = currentProgressNode(state.discovered);
  const unread = state.discovered.filter((id) => !state.read.includes(id));
  const lines = unread.length ? [`下一步：阅读未读档案（${unread.length} 份）。`, hintFor(node, 1)] : [`下一步：${hintFor(node, 2)}`, hintFor(node, 1)];
  return ['GOALS — 当前目标', ...lines];
};
const boardText = (): string[] => {
  const pinned = state.pinnedDocIds.map((id) => documents.get(id)?.title ?? id);
  return ['BOARD — 调查状态总览', `已发现档案：${state.discovered.length}`, `其中未读：${state.discovered.filter((id) => !state.read.includes(id)).length}`, `笔记与摘录：${state.notes.length}`, `固定档案：${pinned.length ? pinned.join('、') : '无'}`, `累计无效查询：${state.attempts}`];
};
const hintAction = (): string | null => {
  const node = currentProgressNode(state.discovered);
  if (!hintAvailable(state.hintState, node)) return null;
  const level = (state.hintState.shownLevel + 1) as 1 | 2 | 3 | 4;
  feedback = hintFor(node, level);
  state.hintState.shownLevel = level;
  state.hintState.interactionSinceHint = false;
  recordEvent(state, 'hint', { level, node });
  return feedback;
};
const inspectCommand = (name: string): string[] => {
  const item = findItem(name);
  if (!item) return ['没有找到该物品的档案记录。物品名称可在档案正文与附件中核对。'];
  return [`${item.name} — ${item.description}`];
};
const dispatchTerminal = (input: string): string[] => {
  const tokens = input.trim().split(/\s+/);
  const command = tokens[0].toUpperCase();
  if (command === 'HELP') return terminalHelp();
  if (command === 'GOALS') return goalsText();
  if (command === 'FILES') return filesText();
  if (command === 'BOARD') return boardText();
  if (command === 'HINT') { const text = hintAction(); return text ? [text] : ['提示尚未就绪。先尝试几次不同的查询，或继续阅读已发现档案。']; }
  if (command === 'CLEAR') { state.terminalLog = []; return ['指令日志已清空。']; }
  if (command === 'OPEN') { const rest = tokens.slice(1).join(' '); return rest ? openByKey(rest) : ['用法：OPEN <档案编号>，例如 OPEN B0-H-MARA-KOVAC-VERRI。']; }
  if (command === 'COMPARE') { if (tokens.length < 3) return ['用法：COMPARE <档案编号> <档案编号>，例如 COMPARE B0-R-KLARA B0-C-NIKO。']; return compareByKeys(tokens[1], tokens[2]); }
  if (command === 'INSPECT') { const rest = tokens.slice(1).join(' '); return rest ? inspectCommand(rest) : ['用法：INSPECT <物品名>。']; }
  if (!parseSceneKey(input)) return ['无法识别的指令或档案编号。输入 HELP 查看可用指令。'];
  return openByKey(input);
};
const processTerminal = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return;
  const output = dispatchTerminal(trimmed);
  recordEvent(state, 'terminal_command', { command: trimmed.split(/\s+/)[0].toUpperCase() });
  appendTerminal(trimmed, output);
  saveAndRender();
};
const onTerminalKey = (event: KeyboardEvent) => {
  const input = event.target as HTMLInputElement;
  if (event.key === 'Enter') { event.preventDefault(); terminalCursor = null; processTerminal(input.value); input.value = ''; }
  else if (event.key === 'ArrowUp') { event.preventDefault(); if (!state.terminalLog.length) return; terminalCursor = terminalCursor === null ? state.terminalLog.length - 1 : Math.max(0, terminalCursor - 1); input.value = state.terminalLog[terminalCursor].input; }
  else if (event.key === 'ArrowDown') { event.preventDefault(); if (terminalCursor === null) return; terminalCursor += 1; input.value = terminalCursor >= state.terminalLog.length ? '' : state.terminalLog[terminalCursor].input; if (terminalCursor >= state.terminalLog.length) terminalCursor = null; }
  else if (event.key === 'Tab') { event.preventDefault(); const completed = completionFor(input.value, state.discovered); if (completed) input.value = completed; }
};
app.addEventListener('keydown', (event) => { if ((event.target as HTMLElement)?.id === 'terminal-input') onTerminalKey(event as KeyboardEvent); });

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  markInteraction();
  if (target.id === 'bell') state.query.bell = target.value as SaveV4['query']['bell'];
  else if (target.id === 'location') state.query.location = target.value;
  else if (target instanceof HTMLInputElement && target.dataset.body) { const body = target.dataset.body; state.query.bodies = target.checked ? [...state.query.bodies, body].slice(0, 3) : state.query.bodies.filter((id) => id !== body); }
  else if (target.dataset.filter) state.archiveFilters[target.dataset.filter as keyof SaveV4['archiveFilters']] = target.value as never;
  else if (target.dataset.hypBell && target.dataset.hypBody) { const cell = state.hypotheses[target.dataset.hypBell as keyof SaveV4['hypotheses']][target.dataset.hypBody]; cell.primaryCandidate = target.value || null; recordEvent(state, 'hypothesis_edit', { bell: target.dataset.hypBell, body: target.dataset.hypBody }); }
  else if (target instanceof HTMLInputElement && target.dataset.hypUncertain) { const [bell, body] = target.dataset.hypUncertain.split(':'); state.hypotheses[bell as keyof SaveV4['hypotheses']][body].uncertain = target.checked; recordEvent(state, 'hypothesis_edit', { bell, body, uncertain: target.checked }); }
  else if (target.dataset.ringIndex) state.draftOriginalRing[Number(target.dataset.ringIndex)] = target.value;
  else if (target.dataset.modifiedField) { const field = target.dataset.modifiedField as keyof Pick<typeof state.modifiedFrameDraft, 'changedAfterBell' | 'modifierSoul' | 'removedName' | 'anchorBody'>; state.modifiedFrameDraft[field] = (target.value || null) as never; state.modifiedFrameSubmission = undefined; state.derivedOccupancyB5B7 = null; recordEvent(state, 'modified_frame_edit', { field }); }
  else if (target.dataset.liveRingIndex) { state.modifiedFrameDraft.sixBodyRing[Number(target.dataset.liveRingIndex)] = target.value; state.modifiedFrameSubmission = undefined; state.derivedOccupancyB5B7 = null; recordEvent(state, 'modified_frame_edit', { field: 'sixBodyRing' }); }
  else if (target.dataset.b7Time) { state.b7AlignmentDraft[target.dataset.b7Time] = target.value; }
  else if (target.dataset.examField) { state.finalExamDraft[target.dataset.examField] = target.value; }
  else if (target instanceof HTMLInputElement && target.id === 'import-file' && target.files?.[0]) { importSave(target.files[0]); return; }
  saveAndRender();
});
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!button) return;
  const action = button.dataset.action; const docId = button.dataset.doc || '';
  if (action === 'query') { executeQuery(); return saveAndRender(); }
  if (action === 'open') return openDoc(docId);
  if (action === 'pin-doc') { state.pinnedDocIds = state.pinnedDocIds.includes(docId) ? state.pinnedDocIds.filter((id) => id !== docId) : [...state.pinnedDocIds, docId]; return saveAndRender(); }
  if (action === 'compare-doc') return toggleCompare(docId);
  markInteraction();
  if (action === 'select-segment') { state.activeDoc = docId; state.activeSegmentId = button.dataset.segment || null; return saveAndRender(); }
  if (action === 'tag') { const key = `${button.dataset.segment}:${button.dataset.tag}`; const tags = state.annotations[docId] || []; state.annotations[docId] = tags.includes(key) ? tags.filter((tag) => tag !== key) : [...tags, key]; state.activeDoc = docId; state.activeSegmentId = button.dataset.segment || null; return saveAndRender(); }
  if (action === 'quote-segment') { const doc = documents.get(docId); const segment = doc?.segments.find((item) => item.id === button.dataset.segment); if (segment) { state.activeDoc = docId; state.activeSegmentId = segment.id; state.notes.push({ id: crypto.randomUUID(), text: `摘录：${segment.text}`, refs: [{ docId, segmentId: segment.id }] }); } return saveAndRender(); }
  if (action === 'add-note') { const input = document.querySelector<HTMLTextAreaElement>('#note-text'); if (input?.value.trim()) state.notes.push({ id: crypto.randomUUID(), text: input.value.trim(), refs: state.activeDoc ? [{ docId: state.activeDoc, ...(state.activeSegmentId ? { segmentId: state.activeSegmentId } : {}) }] : [] }); return saveAndRender(); }
  if (action === 'delete-note') { state.notes.splice(Number(button.dataset.index), 1); return saveAndRender(); }
  if (action === 'hint') { hintAction(); return saveAndRender(); }
  if (action === 'use-current-evidence') { const bell = button.dataset.hypBell as keyof SaveV4['hypotheses']; const body = button.dataset.hypBody!; if (state.activeDoc && state.activeSegmentId) { const cell = state.hypotheses[bell][body]; const ref = { docId: state.activeDoc, segmentId: state.activeSegmentId }; if (!cell.evidenceRefs.some((item) => item.docId === ref.docId && item.segmentId === ref.segmentId)) cell.evidenceRefs.push(ref); recordEvent(state, 'hypothesis_edit', { bell, body, evidence: state.activeDoc, segment: state.activeSegmentId }); } else feedback = '先在档案阅读器中选中一个具体段落，再把它放入假设格。'; return saveAndRender(); }
  if (action === 'submit-ring') { const candidate = state.draftOriginalRing; const complete = candidate.length === 7 && candidate.every(Boolean) && new Set(candidate).size === 7; const correct = complete && isSameOrientation(candidate); recordEvent(state, 'ring_submit', { complete, correct }); if (correct) { state.stageSubmissions.originalRing = { ring: [...candidate], submittedAt: new Date().toISOString(), correct: true }; maybeRevealLiveFrame(); feedback = '提交已保存。下表只按你提交的规则演算，仍由你决定如何解释证据。'; } else feedback = complete ? '这组方向与已读原件冲突。回看校样与早期记录；系统不会指出应替换哪一人。' : '请先填入七个互不重复的名字，再提交。'; return saveAndRender(); }
  if (action === 'add-modified-evidence') { if (state.activeDoc && state.activeSegmentId) { const ref = { docId: state.activeDoc, segmentId: state.activeSegmentId }; if (!state.modifiedFrameDraft.evidenceRefs.some((item) => item.docId === ref.docId && item.segmentId === ref.segmentId)) state.modifiedFrameDraft.evidenceRefs.push(ref); state.modifiedFrameSubmission = undefined; state.derivedOccupancyB5B7 = null; recordEvent(state, 'modified_frame_edit', { field: 'evidence', docId: ref.docId, segmentId: ref.segmentId }); } else feedback = '先在档案阅读器中选中一段可检验的记录，再加入实时版框证据。'; return saveAndRender(); }
  if (action === 'remove-modified-evidence') { state.modifiedFrameDraft.evidenceRefs.splice(Number(button.dataset.evidenceIndex), 1); state.modifiedFrameSubmission = undefined; state.derivedOccupancyB5B7 = null; recordEvent(state, 'modified_frame_edit', { field: 'evidence' }); return saveAndRender(); }
  if (action === 'open-modified-evidence') { const ref = button.dataset.evidenceIndex ? state.modifiedFrameDraft.evidenceRefs[Number(button.dataset.evidenceIndex)] : state.modifiedFrameSubmission?.evidenceRefs[0]; if (ref) { state.activeDoc = ref.docId; state.activeSegmentId = ref.segmentId ?? null; state.tab = 'archive'; } return saveAndRender(); }
  if (action === 'submit-modified-frame') { const result = validateModifiedFrame(state.modifiedFrameDraft); recordEvent(state, 'modified_frame_submit', { correct: result.correct, failures: result.failures.join(',') || 'none' }); if (result.correct && state.stageSubmissions.originalRing) { state.modifiedFrameSubmission = { ...state.modifiedFrameDraft, sixBodyRing: [...state.modifiedFrameDraft.sixBodyRing], evidenceRefs: [...state.modifiedFrameDraft.evidenceRefs], correct: true, submittedAt: new Date().toISOString() }; state.derivedOccupancyB5B7 = deriveModifiedOccupancy(state.stageSubmissions.originalRing.ring, state.modifiedFrameSubmission); feedback = '实时版框已提交。下表只按你提交的规则演算，并不判断任何终局责任。'; } else { const labels: Record<string, string> = { timing: '改版时段', roles: '人物／锚定关系', ring: '六槽方向或成员', evidence: '证据数量或来源' }; feedback = `提交尚未通过：请复核${result.failures.map((item) => labels[item]).join('、')}。`; } return saveAndRender(); }
  if (action === 'submit-b7-alignment') { const candidate = { ...state.b7AlignmentDraft }; const complete = Object.values(candidate).every(Boolean); const correct = complete && validateB7Alignment(candidate); recordEvent(state, 'b7_alignment_submit', { complete, correct }); if (correct) { state.b7Alignment = { assigned: candidate, submittedAt: new Date().toISOString(), correct: true }; feedback = '对齐已确认：机器日志、封条与名单位置指向同一顺序。'; } else feedback = complete ? '这组对齐与 B7 记录冲突。回读内信号间档案的秒级对齐表；系统不会指出应替换哪一行。' : '请先把七个事件全部对齐到时刻，再提交。'; return saveAndRender(); }
  if (action === 'submit-final-exam') { const candidate = { ...state.finalExamDraft }; const complete = examQuestions.every((question) => Boolean(candidate[question.id])); const correct = complete && validateExam(candidate); recordEvent(state, 'final_exam_submit', { complete, correct }); if (correct) { state.finalExam = { answers: candidate, submittedAt: new Date().toISOString(), correct: true }; feedback = '终局答卷已确认：九项结论全部由两条以上相互独立的证据支撑。'; } else feedback = complete ? '这组答卷与证据冲突。每条结论都必须由至少两处独立证据支撑；系统不会指出应替换哪一项。' : '请先回答全部九项，再提交答卷。'; return saveAndRender(); }
  if (action === 'select-bell') { state.query.bell = button.dataset.bell as SaveV4['query']['bell']; state.tab = 'query'; feedback = `已切换至 ${button.dataset.bell?.toUpperCase()}。`; return saveAndRender(); }
  if (action === 'tab') { state.tab = button.dataset.tab as SaveV4['tab']; return saveAndRender(); }
  if (action === 'export') return download(`seventh-chime-save-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-save', save: state });
  if (action === 'export-events') return download(`seventh-chime-playtest-${new Date().toISOString().slice(0, 10)}.json`, { format: 'seventh-chime-playtest-events', events: state.playtestEvents });
  if (action === 'reset' && confirm('重置本机的《黑潮钟》进度？建议先导出。')) { state = emptySave(content.characters); try { localStorage.removeItem(storageKey); localStorage.removeItem(backupKey); } catch { storageNotice = '浏览器未能清除旧进度；请导出后检查本地存储设置。'; } feedback = '进度已重置。'; return saveAndRender(); }
});
render(app, state, feedback, isB4Revealed(state.discovered), storageNotice);
