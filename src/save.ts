import { isSameOrientation } from './ring';
import { deriveModifiedOccupancy, emptyModifiedFrameDraft, validateModifiedFrame } from './modified-frame';
import type { ArchiveDocument, ArchiveFilters, BellId, BodyId, Character, DerivedOccupancyB5B7, EvidenceReference, HintState, HypothesisCell, HypothesisGrid, ModifiedFrameDraft, ModifiedFrameSubmission, Note, PlaytestEvent, SaveV2, SaveV3, SaveV4, TerminalEntry } from './types';

export const storageKey = 'btb.save.v1.current';
export const backupKey = 'btb.save.v1.backup';
const bells: BellId[] = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
const hypothesisBells = bells.slice(1) as BellId[];
const emptyCell = (): HypothesisCell => ({ primaryCandidate: null, uncertain: true, evidenceRefs: [] });
export const createHypothesisGrid = (characterIds: BodyId[]) => Object.fromEntries(hypothesisBells.map((bell) => [bell, Object.fromEntries(characterIds.map((body) => [body, emptyCell()]))])) as HypothesisGrid;
export const defaultFilters = (): ArchiveFilters => ({ bell: 'all', location: 'all', body: 'all', tag: 'all', read: 'all' });
const now = () => new Date().toISOString();
export const defaultHintState = (): HintState => ({ nodeKey: 'b0-start', invalidQueries: 0, shownLevel: 0, interactionSinceHint: false, lastProgressAt: now() });
const emptySaveV2 = (characters: Character[]): SaveV2 => ({ version: 2, discovered: [], read: [], annotations: {}, notes: [], hypotheses: createHypothesisGrid(characters.map((character) => character.id)), queryHistory: [], pinnedDocIds: [], compareDocIds: [], archiveFilters: defaultFilters(), stageSubmissions: {}, draftOriginalRing: [], hintState: defaultHintState(), playtestEvents: [], activeDoc: null, activeSegmentId: null, query: { bell: 'b0', location: 'h_admin', bodies: ['mara', 'kovac', 'verri'] }, attempts: 0, tab: 'query', updatedAt: now() });
export const emptySave = (characters: Character[]): SaveV4 => ({ ...emptySaveV2(characters), version: 4, modifiedFrameDraft: emptyModifiedFrameDraft(), derivedOccupancyB5B7: null, terminalLog: [] });

const array = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const records = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const same = (values: string[]) => new Set(values).size === values.length;
export interface SaveContext { characters: Character[]; documents: ArchiveDocument[] }
const contextFor = (characters: Character[], documents: ArchiveDocument[]): SaveContext => ({ characters, documents });
const evidenceRef = (value: unknown, documentById: Map<string, ArchiveDocument>): EvidenceReference | null => {
  if (typeof value === 'string') return documentById.has(value) ? { docId: value } : null;
  const ref = records(value); if (typeof ref.docId !== 'string') return null;
  const doc = documentById.get(ref.docId); if (!doc) return null;
  if (ref.segmentId !== undefined && (typeof ref.segmentId !== 'string' || !doc.segments.some((segment) => segment.id === ref.segmentId))) return null;
  return { docId: ref.docId, ...(typeof ref.segmentId === 'string' ? { segmentId: ref.segmentId } : {}) };
};
const noteList = (value: unknown, documentById: Map<string, ArchiveDocument>, strict: boolean): Note[] | null => {
  if (!Array.isArray(value)) return strict ? null : [];
  const output: Note[] = [];
  for (let index = 0; index < value.length; index++) { const note = records(value[index]); if (typeof note.text !== 'string' || !note.text.trim() || !Array.isArray(note.refs)) return null; const refs = note.refs.map((ref) => evidenceRef(ref, documentById)); if (refs.some((ref) => !ref)) return null; output.push({ id: typeof note.id === 'string' && note.id ? note.id : `legacy-${index}`, text: note.text, refs: refs as EvidenceReference[] }); }
  return output;
};
const validateArrayIds = (value: unknown, allowed: Set<string>, strict: boolean) => { const ids = array(value); return (!strict && !Array.isArray(value)) || (same(ids) && ids.every((id) => allowed.has(id))) ? ids : null; };
const parseAnnotations = (value: unknown, documentById: Map<string, ArchiveDocument>): Record<string, string[]> | null => {
  const source = records(value); const output: Record<string, string[]> = {};
  for (const [docId, entries] of Object.entries(source)) { const doc = documentById.get(docId); const tags = array(entries); if (!doc || !same(tags) || tags.some((entry) => { const [segment, tag] = entry.split(':'); return !doc.segments.some((item) => item.id === segment) || !doc.tagOptions.includes(tag); })) return null; output[docId] = tags; }
  return output;
};
const parseHintState = (value: unknown): HintState | null => { const source = records(value); if (!Object.keys(source).length) return defaultHintState(); if (typeof source.nodeKey !== 'string' || typeof source.invalidQueries !== 'number' || source.invalidQueries < 0 || !Number.isInteger(source.invalidQueries) || ![0, 1, 2, 3, 4].includes(source.shownLevel as number) || typeof source.interactionSinceHint !== 'boolean' || !validDate(source.lastProgressAt)) return null; return { nodeKey: source.nodeKey, invalidQueries: source.invalidQueries, shownLevel: source.shownLevel as HintState['shownLevel'], interactionSinceHint: source.interactionSinceHint, lastProgressAt: source.lastProgressAt }; };
const parseStage = (value: unknown, ids: Set<string>) => { const stage = records(value); if (!Object.keys(stage).length) return {}; const original = records(stage.originalRing); if (!Object.keys(original).length) return {}; const ring = array(original.ring); if (!same(ring) || ring.length !== 7 || !ring.every((id) => ids.has(id)) || original.correct !== true || !validDate(original.submittedAt) || !isSameOrientation(ring)) return null; return { originalRing: { ring, correct: true, submittedAt: original.submittedAt } }; };
const parseV2 = (source: Record<string, unknown>, context: SaveContext): SaveV2 | null => {
  const fresh = emptySaveV2(context.characters); const ids = new Set(context.characters.map((character) => character.id)); const documentById = new Map(context.documents.map((doc) => [doc.id, doc])); const documentIds = new Set(documentById.keys());
  if (source.version !== 2 || !validDate(source.updatedAt)) return null;
  const discovered = validateArrayIds(source.discovered, documentIds, true); const read = validateArrayIds(source.read, documentIds, true); const pinned = validateArrayIds(source.pinnedDocIds, documentIds, true); const compare = validateArrayIds(source.compareDocIds, documentIds, true); const annotations = parseAnnotations(source.annotations, documentById); const savedNotes = noteList(source.notes, documentById, true); const hintState = parseHintState(source.hintState); const stage = parseStage(source.stageSubmissions, ids);
  if (!discovered || !read || !pinned || !compare || compare.length > 2 || !annotations || !savedNotes || !hintState || stage === null || pinned.some((id) => !discovered.includes(id)) || compare.some((id) => !discovered.includes(id)) || read.some((id) => !discovered.includes(id))) return null;
  const query = records(source.query); if (!bells.includes(query.bell as BellId) || typeof query.location !== 'string') return null; const queryBodies = validateArrayIds(query.bodies, ids, true); if (!queryBodies || queryBodies.length > 3) return null;
  const activeDoc = source.activeDoc === null ? null : typeof source.activeDoc === 'string' && discovered.includes(source.activeDoc) ? source.activeDoc : null; if (source.activeDoc !== null && !activeDoc) return null;
  const activeSegment = source.activeSegmentId === null ? null : typeof source.activeSegmentId === 'string' && activeDoc && documentById.get(activeDoc)?.segments.some((segment) => segment.id === source.activeSegmentId) ? source.activeSegmentId : null; if (source.activeSegmentId !== null && !activeSegment) return null;
  const filters = records(source.archiveFilters); const archiveFilters: ArchiveFilters = { ...fresh.archiveFilters, ...filters } as ArchiveFilters; if (!(archiveFilters.bell === 'all' || bells.includes(archiveFilters.bell)) || !(archiveFilters.location === 'all' || context.documents.some((doc) => doc.location === archiveFilters.location)) || !(archiveFilters.body === 'all' || ids.has(archiveFilters.body)) || !(archiveFilters.tag === 'all' || context.documents.some((doc) => doc.tagOptions.includes(archiveFilters.tag))) || !['all', 'read', 'unread'].includes(archiveFilters.read)) return null;
  const draft = validateArrayIds(source.draftOriginalRing, ids, true); if (!draft || draft.length > 7) return null;
  const gridSource = records(source.hypotheses); const grid = createHypothesisGrid(context.characters.map((character) => character.id));
  for (const bell of hypothesisBells) { const sourceBell = records(gridSource[bell]); if (!Object.keys(sourceBell).length) return null; for (const body of ids) { const cell = records(sourceBell[body]); if (typeof cell.primaryCandidate !== 'string' && cell.primaryCandidate !== null || (typeof cell.primaryCandidate === 'string' && !ids.has(cell.primaryCandidate)) || typeof cell.uncertain !== 'boolean' || !Array.isArray(cell.evidenceRefs)) return null; const refs = cell.evidenceRefs.map((ref) => evidenceRef(ref, documentById)); if (refs.some((ref) => !ref)) return null; grid[bell][body] = { primaryCandidate: cell.primaryCandidate, uncertain: cell.uncertain, evidenceRefs: refs as EvidenceReference[] }; } }
  const history = Array.isArray(source.queryHistory) ? source.queryHistory.map((value) => records(value)) : null; if (!history) return null; const queryHistory = history.map((entry) => typeof entry.key === 'string' && validDate(entry.at) && ['found', 'locked', 'invalid'].includes(entry.result as string) && (entry.docId === undefined || typeof entry.docId === 'string' && documentIds.has(entry.docId)) ? { key: entry.key, at: entry.at as string, result: entry.result as SaveV2['queryHistory'][number]['result'], ...(typeof entry.docId === 'string' ? { docId: entry.docId } : {}) } : null); if (queryHistory.some((entry) => !entry)) return null;
  const eventKinds = new Set<PlaytestEvent['kind']>(['query', 'invalid_query', 'unlock', 'revisit', 'compare', 'hint', 'b4_reveal', 'hypothesis_edit', 'ring_submit', 'modified_frame_reveal', 'modified_frame_edit', 'modified_frame_submit', 'terminal_command']); if (!Array.isArray(source.playtestEvents)) return null; const events = source.playtestEvents.map((value) => { const event = records(value); return eventKinds.has(event.kind as PlaytestEvent['kind']) && validDate(event.at) ? { kind: event.kind as PlaytestEvent['kind'], at: event.at as string, ...(records(event.detail) ? { detail: Object.fromEntries(Object.entries(records(event.detail)).filter(([, detail]) => ['string', 'number', 'boolean'].includes(typeof detail))) } : {}) } : null; }); if (events.some((event) => !event)) return null;
  if (typeof source.attempts !== 'number' || source.attempts < 0 || !Number.isInteger(source.attempts) || !['query', 'archive', 'facts', 'notes', 'hypotheses'].includes(source.tab as string)) return null;
  return { ...fresh, version: 2, discovered, read, annotations, notes: savedNotes, hypotheses: grid, queryHistory: queryHistory as SaveV2['queryHistory'], pinnedDocIds: pinned, compareDocIds: compare, archiveFilters, stageSubmissions: stage, draftOriginalRing: draft, hintState, playtestEvents: events as PlaytestEvent[], activeDoc, activeSegmentId: activeSegment, query: { bell: query.bell as BellId, location: query.location, bodies: queryBodies }, attempts: source.attempts, tab: source.tab as SaveV2['tab'], updatedAt: source.updatedAt };
};
const migrateV1 = (source: Record<string, unknown>, context: SaveContext): SaveV2 | null => {
  const documentById = new Map(context.documents.map((doc) => [doc.id, doc])); const ids = new Set(context.characters.map((character) => character.id)); const documentIds = new Set(documentById.keys()); const fresh = emptySaveV2(context.characters);
  const discovered = validateArrayIds(source.discovered, documentIds, true); const read = validateArrayIds(source.read, documentIds, true); const annotations = parseAnnotations(source.annotations, documentById); const savedNotes = noteList(source.notes, documentById, false); if (!discovered || !read || !annotations || !savedNotes || read.some((id) => !discovered.includes(id))) return null;
  const result = { ...fresh, discovered, read, annotations, notes: savedNotes, activeDoc: typeof source.activeDoc === 'string' && discovered.includes(source.activeDoc) ? source.activeDoc : null, attempts: typeof source.attempts === 'number' && source.attempts >= 0 ? Math.floor(source.attempts) : 0, updatedAt: validDate(source.updatedAt) ? source.updatedAt : fresh.updatedAt };
  const query = records(source.query); if (bells.includes(query.bell as BellId)) result.query.bell = query.bell as BellId; if (typeof query.location === 'string') result.query.location = query.location; const queryBodies = validateArrayIds(query.bodies, ids, false); if (queryBodies) result.query.bodies = queryBodies.slice(0, 3);
  if (Array.isArray(source.hypotheses)) for (const item of source.hypotheses) { const legacy = records(item); if (typeof legacy.body === 'string' && typeof legacy.soul === 'string' && ids.has(legacy.body) && ids.has(legacy.soul)) result.hypotheses.b1[legacy.body].primaryCandidate = legacy.soul; }
  return result;
};
const upgradeV2 = (save: SaveV2): SaveV3 => ({ ...save, version: 3, modifiedFrameDraft: emptyModifiedFrameDraft(), derivedOccupancyB5B7: null });
const upgradeV3 = (save: SaveV3): SaveV4 => ({ ...save, version: 4, terminalLog: [] });
const parseTerminalLog = (value: unknown): TerminalEntry[] | null => {
  if (!Array.isArray(value)) return null;
  const output: TerminalEntry[] = [];
  for (const entry of value) { const item = records(entry); if (typeof item.input !== 'string' || !item.input.trim() || !Array.isArray(item.output) || item.output.some((line) => typeof line !== 'string') || !validDate(item.at)) return null; output.push({ input: item.input, output: item.output as string[], at: item.at }); if (output.length === 60) break; }
  return output;
};
const parseV4 = (source: Record<string, unknown>, context: SaveContext): SaveV4 | null => {
  if (source.version !== 4) return null;
  const base = parseV3({ ...source, version: 3 }, context); if (!base) return null;
  const terminalLog = parseTerminalLog(source.terminalLog); if (!terminalLog) return null;
  return { ...base, version: 4, terminalLog };
};
const parseModifiedDraft = (value: unknown, ids: Set<string>, documentById: Map<string, ArchiveDocument>, discovered: string[]): ModifiedFrameDraft | null => {
  const source = records(value); if (!Object.keys(source).length) return null;
  const idOrNull = (candidate: unknown) => candidate === null || typeof candidate === 'string' && ids.has(candidate) ? candidate : undefined;
  const changed = source.changedAfterBell === null || bells.includes(source.changedAfterBell as BellId) ? source.changedAfterBell as BellId | null : undefined;
  const modifierSoul = idOrNull(source.modifierSoul); const removedName = idOrNull(source.removedName); const anchorBody = idOrNull(source.anchorBody); const sixBodyRing = array(source.sixBodyRing);
  if (changed === undefined || modifierSoul === undefined || removedName === undefined || anchorBody === undefined || !Array.isArray(source.sixBodyRing) || sixBodyRing.length > 6 || sixBodyRing.some((id) => !ids.has(id)) || !Array.isArray(source.evidenceRefs)) return null;
  const evidenceRefs = source.evidenceRefs.map((ref) => evidenceRef(ref, documentById)); if (evidenceRefs.some((ref) => !ref) || (evidenceRefs as EvidenceReference[]).some((ref) => !discovered.includes(ref.docId))) return null;
  return { changedAfterBell: changed, modifierSoul: modifierSoul as BodyId | null, removedName: removedName as BodyId | null, anchorBody: anchorBody as BodyId | null, sixBodyRing, evidenceRefs: evidenceRefs as EvidenceReference[] };
};
const sameDerived = (left: DerivedOccupancyB5B7, right: DerivedOccupancyB5B7) => JSON.stringify(left) === JSON.stringify(right);
const parseV3 = (source: Record<string, unknown>, context: SaveContext): SaveV3 | null => {
  if (source.version !== 3) return null;
  const base = parseV2({ ...source, version: 2 }, context); if (!base) return null;
  const ids = new Set(context.characters.map((character) => character.id)); const documentById = new Map(context.documents.map((doc) => [doc.id, doc]));
  const modifiedFrameDraft = parseModifiedDraft(source.modifiedFrameDraft, ids, documentById, base.discovered); if (!modifiedFrameDraft) return null;
  const submitted = source.modifiedFrameSubmission === undefined ? undefined : records(source.modifiedFrameSubmission);
  let modifiedFrameSubmission: ModifiedFrameSubmission | undefined;
  if (submitted) { const submissionDraft = parseModifiedDraft(submitted, ids, documentById, base.discovered); if (!submissionDraft || submitted.correct !== true || !validDate(submitted.submittedAt) || !base.stageSubmissions.originalRing?.correct || !validateModifiedFrame(submissionDraft).correct) return null; modifiedFrameSubmission = { ...submissionDraft, correct: true, submittedAt: submitted.submittedAt }; }
  const derivedRaw = source.derivedOccupancyB5B7;
  if (modifiedFrameSubmission) { if (!derivedRaw || !base.stageSubmissions.originalRing || !sameDerived(derivedRaw as DerivedOccupancyB5B7, deriveModifiedOccupancy(base.stageSubmissions.originalRing.ring, modifiedFrameSubmission))) return null; }
  else if (derivedRaw !== null) return null;
  return { ...base, version: 3, modifiedFrameDraft, ...(modifiedFrameSubmission ? { modifiedFrameSubmission } : {}), derivedOccupancyB5B7: modifiedFrameSubmission ? derivedRaw as DerivedOccupancyB5B7 : null };
};
export const migrateSave = (raw: unknown, characters: Character[], documents: ArchiveDocument[] = []): SaveV4 | null => { const source = records(raw); if (!Object.keys(source).length) return null; const context = contextFor(characters, documents); if (source.version === 4) return parseV4(source, context); if (source.version === 3) { const v3 = parseV3(source, context); return v3 ? upgradeV3(v3) : null; } if (source.version === 2) { const v2 = parseV2(source, context); return v2 ? upgradeV3(upgradeV2(v2)) : null; } if (source.version === 1) { const v1 = migrateV1(source, context); return v1 ? upgradeV3(upgradeV2(v1)) : null; } return null; };
export const chooseNewestSave = (candidates: unknown[], characters: Character[], documents: ArchiveDocument[]) => candidates.map((candidate) => migrateSave(candidate, characters, documents)).filter((candidate): candidate is SaveV4 => Boolean(candidate)).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
export const loadSave = (characters: Character[], documents: ArchiveDocument[]) => { const candidates: unknown[] = []; for (const key of [storageKey, backupKey]) try { const raw = localStorage.getItem(key); if (raw) candidates.push(JSON.parse(raw)); } catch { /* unreadable storage is handled as an empty session */ } return chooseNewestSave(candidates, characters, documents) ?? emptySave(characters); };
export const persistSave = (state: SaveV4): boolean => { try { state.updatedAt = now(); const current = localStorage.getItem(storageKey); localStorage.setItem(backupKey, current || ''); localStorage.setItem(storageKey, JSON.stringify(state)); return true; } catch { return false; } };
export const recordEvent = (state: SaveV4, kind: PlaytestEvent['kind'], detail?: PlaytestEvent['detail']) => { state.playtestEvents.push({ kind, at: now(), ...(detail ? { detail } : {}) }); };
