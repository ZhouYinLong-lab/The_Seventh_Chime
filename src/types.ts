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
export type ArchiveKind = 'location' | 'person';
export interface ArchiveMeta { id: string; kind: ArchiveKind; entityId: string; title: string; subtitle: string; description: string }
export interface EvidenceReference { docId: string; segmentId?: string }
export type ExamCategory = 'body_location' | 'soul_identity' | 'causal_continuity';
export interface HypothesisCell { primaryCandidate: BodyId | null; uncertain: boolean; evidenceRefs: EvidenceReference[] }
export type HypothesisGrid = Record<BellId, Record<BodyId, HypothesisCell>>;
export interface Note { id: string; text: string; refs: EvidenceReference[] }
export interface QueryHistoryEntry { key: string; at: string; result: 'found' | 'locked' | 'invalid'; docId?: string }
export interface OriginalRingSubmission { ring: BodyId[]; submittedAt: string; correct: boolean }
export interface StageSubmissions { originalRing?: OriginalRingSubmission }
export interface ModifiedFrameDraft { changedAfterBell: BellId | null; modifierSoul: BodyId | null; removedName: BodyId | null; anchorBody: BodyId | null; sixBodyRing: BodyId[]; evidenceRefs: EvidenceReference[] }
export interface ModifiedFrameSubmission extends ModifiedFrameDraft { submittedAt: string; correct: true }
export type DerivedOccupancyB5B7 = Record<'b5' | 'b6' | 'b7', Record<BodyId, BodyId>>;
export interface HintState { nodeKey: string; invalidQueries: number; shownLevel: 0 | 1 | 2 | 3 | 4; interactionSinceHint: boolean; lastProgressAt: string }
export type PlaytestEventKind = 'query' | 'invalid_query' | 'unlock' | 'revisit' | 'compare' | 'hint' | 'b4_reveal' | 'hypothesis_edit' | 'ring_submit' | 'modified_frame_reveal' | 'modified_frame_edit' | 'modified_frame_submit' | 'terminal_command' | 'b7_alignment_submit' | 'final_exam_submit' | 'final_exam_evidence_edit';
export interface B7TimelineEvent { id: string; label: string }
export interface B7Alignment { assigned: Record<string, string>; submittedAt: string; correct: true }
export interface FinalExam { answers: Record<string, string>; submittedAt: string; correct: true; evidence?: Record<ExamCategory, EvidenceReference> }
export interface PlaytestEvent { kind: PlaytestEventKind; at: string; detail?: Record<string, string | number | boolean> }
export interface SaveV2 { version: 2 | 3 | 4 | 5; discovered: string[]; read: string[]; annotations: Record<string, string[]>; notes: Note[]; hypotheses: HypothesisGrid; queryHistory: QueryHistoryEntry[]; pinnedDocIds: string[]; compareDocIds: string[]; archiveFilters: ArchiveFilters; stageSubmissions: StageSubmissions; draftOriginalRing: BodyId[]; hintState: HintState; playtestEvents: PlaytestEvent[]; activeDoc: string | null; activeSegmentId: string | null; query: QueryState; attempts: number; tab: 'query' | 'archive' | 'facts' | 'world' | 'notes' | 'hypotheses'; updatedAt: string }
export interface SaveV3 extends Omit<SaveV2, 'version'> { version: 3; modifiedFrameDraft: ModifiedFrameDraft; modifiedFrameSubmission?: ModifiedFrameSubmission; derivedOccupancyB5B7: DerivedOccupancyB5B7 | null }
export interface TerminalEntry { input: string; output: string[]; at: string }
export interface SaveV4 extends Omit<SaveV3, 'version'> { version: 4; terminalLog: TerminalEntry[]; b7AlignmentDraft: Record<string, string>; b7Alignment: B7Alignment | null; finalExamDraft: Record<string, string>; finalExam: FinalExam | null }
export interface SaveV5 extends Omit<SaveV4, 'version'> { version: 5; finalExamEvidenceDraft: Record<ExamCategory, EvidenceReference | null> }
