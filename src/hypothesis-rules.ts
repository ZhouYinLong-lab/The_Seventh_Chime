import type { HypothesisGrid } from './types';

export const conflictingBodies = (grid: HypothesisGrid, bell: keyof HypothesisGrid) => {
  const owners = new Map<string, string[]>();
  for (const [body, cell] of Object.entries(grid[bell])) if (cell.primaryCandidate) owners.set(cell.primaryCandidate, [...(owners.get(cell.primaryCandidate) ?? []), body]);
  return new Set([...owners.values()].filter((bodies) => bodies.length > 1).flat());
};
