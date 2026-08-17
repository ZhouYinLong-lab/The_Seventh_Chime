import { deriveOccupancy, normaliseRotation } from './ring';
import type { BodyId, DerivedOccupancyB5B7, ModifiedFrameDraft, SaveV3 } from './types';

export const MODIFIED_FRAME_ANSWER = {
  changedAfterBell: 'b4' as const,
  modifierSoul: 'verri',
  removedName: 'niko',
  anchorBody: 'niko',
  sixBodyRing: ['mara', 'klara', 'livia', 'verri', 'mateo', 'kovac'] as BodyId[]
};
export const emptyModifiedFrameDraft = (): ModifiedFrameDraft => ({ changedAfterBell: null, modifierSoul: null, removedName: null, anchorBody: null, sixBodyRing: [], evidenceRefs: [] });
export const isSameSixRingOrientation = (candidate: readonly BodyId[], expected = MODIFIED_FRAME_ANSWER.sixBodyRing) => candidate.length === expected.length && new Set(candidate).size === expected.length && normaliseRotation(candidate) === normaliseRotation(expected);
export const validateModifiedFrame = (draft: ModifiedFrameDraft) => {
  const failures: Array<'timing' | 'roles' | 'ring' | 'evidence'> = [];
  if (draft.changedAfterBell !== MODIFIED_FRAME_ANSWER.changedAfterBell) failures.push('timing');
  if (draft.modifierSoul !== MODIFIED_FRAME_ANSWER.modifierSoul || draft.removedName !== MODIFIED_FRAME_ANSWER.removedName || draft.anchorBody !== MODIFIED_FRAME_ANSWER.anchorBody) failures.push('roles');
  if (!isSameSixRingOrientation(draft.sixBodyRing)) failures.push('ring');
  if (draft.evidenceRefs.length < 3 || new Set(draft.evidenceRefs.map((ref) => ref.docId)).size < 2) failures.push('evidence');
  return { correct: failures.length === 0, failures };
};
export const liveFrameAvailable = (save: SaveV3) => Boolean(save.stageSubmissions.originalRing?.correct && save.read.includes('doc_b6_a_niko'));
export const deriveModifiedOccupancy = (originalRing: BodyId[], draft: ModifiedFrameDraft): DerivedOccupancyB5B7 => {
  let previous = deriveOccupancy(originalRing, ['b4']).b4;
  const derived = {} as DerivedOccupancyB5B7;
  for (const bell of ['b5', 'b6', 'b7'] as const) {
    const next: Record<BodyId, BodyId> = { [draft.anchorBody!]: draft.modifierSoul! };
    draft.sixBodyRing.forEach((body, index) => { next[draft.sixBodyRing[(index + 1) % draft.sixBodyRing.length]] = previous[body]; });
    derived[bell] = next;
    previous = next;
  }
  return derived;
};
