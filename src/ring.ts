import type { BellId, BodyId } from './types';
export const ORIGINAL_RING: BodyId[] = ['mara', 'klara', 'livia', 'niko', 'mateo', 'kovac', 'verri'];
export const normaliseRotation = (ring: readonly BodyId[]) => { if (!ring.length) return ''; return ring.map((_, index) => [...ring.slice(index), ...ring.slice(0, index)].join('|')).sort()[0]; };
export const isSameOrientation = (candidate: readonly BodyId[], expected = ORIGINAL_RING) => candidate.length === expected.length && new Set(candidate).size === expected.length && normaliseRotation(candidate) === normaliseRotation(expected);
export const deriveOccupancy = (ring: readonly BodyId[], bells: BellId[] = ['b1', 'b2', 'b3', 'b4']) => Object.fromEntries(bells.map((bell) => { const steps = Number(bell.slice(1)); return [bell, Object.fromEntries(ring.map((body, index) => [body, ring[(index - steps + ring.length) % ring.length]]))]; }));
