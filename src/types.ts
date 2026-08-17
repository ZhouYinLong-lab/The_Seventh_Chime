export type BellId = `b${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
export type BodyId = string;
export type LocationId = string;
export type TagId = string;
export interface Bell { id: BellId; label: string }
export interface Character { id: BodyId; name: string; cn: string; role: string; traits: string }
export interface Location { id: LocationId; code: string; name: string; description: string }
export interface Segment { id: string; type: 'document' | 'machine' | 'dialogue' | 'observation'; text: string; speaker?: BodyId }
export interface ArchiveDocument { id: string; sceneId: string; title: string; bell: BellId; location: LocationId; bodies: BodyId[]; sources: string; reliability: string; initial: boolean; prerequisites: string[]; hints: string[]; segments: Segment[]; attachments: string[]; tagOptions: TagId[] }
export interface Content { contentVersion: string; bells: Bell[]; characters: Character[]; locations: Location[]; tags: Record<TagId, { before: string; after: string }>; documents: ArchiveDocument[]; hints: string[] }
export interface QueryState { bell: BellId; location: LocationId; bodies: BodyId[] }
export interface ArchiveFilters { bell: BellId | 'all'; location: LocationId | 'all'; body: BodyId | 'all'; tag: TagId | 'all'; read: 'all' | 'read' | 'unread' }
export interface EvidenceReference { docId: string; segmentId?: string }
export interface HypothesisCell { primaryCandidate: BodyId | null; uncertain: boolean; evidenceRefs: EvidenceReference[] }
export type HypothesisGrid = Record<BellId, Record<BodyId, HypothesisCell>>;
export interface Note { id: string; text: string; refs: EvidenceReference[] }
export interface QueryHistoryEntry { key: string; at: string; result: 'found' | 'locked' | 'invalid'; docId?: string }
export interface OriginalRingSubmission { ring: BodyId[]; submittedAt: string; correct: boolean }
export interface StageSubmissions { originalRing?: OriginalRingSubmission }
export interface HintState { nodeKey: string; invalidQueries: number; shownLevel: 0 | 1 | 2 | 3 | 4; interactionSinceHint: boolean; lastProgressAt: string }
export type PlaytestEventKind = 'query' | 'invalid_query' | 'unlock' | 'revisit' | 'compare' | 'hint' | 'b4_reveal' | 'hypothesis_edit' | 'ring_submit';
export interface PlaytestEvent { kind: PlaytestEventKind; at: string; detail?: Record<string, string | number | boolean> }
export interface SaveV2 { version: 2; discovered: string[]; read: string[]; annotations: Record<string, string[]>; notes: Note[]; hypotheses: HypothesisGrid; queryHistory: QueryHistoryEntry[]; pinnedDocIds: string[]; compareDocIds: string[]; archiveFilters: ArchiveFilters; stageSubmissions: StageSubmissions; draftOriginalRing: BodyId[]; hintState: HintState; playtestEvents: PlaytestEvent[]; activeDoc: string | null; activeSegmentId: string | null; query: QueryState; attempts: number; tab: 'query' | 'archive' | 'facts' | 'notes' | 'hypotheses'; updatedAt: string }
