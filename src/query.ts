import { canonicalBodies, queryKey } from './content';
import type { ArchiveDocument, QueryState } from './types';
export { queryKey };
export const isReady = (doc: ArchiveDocument, discovered: readonly string[]) => doc.initial || doc.prerequisites.every((id) => discovered.includes(id));
export const findByQuery = (documents: readonly ArchiveDocument[], query: QueryState) => documents.find((doc) => doc.bell === query.bell && doc.location === query.location && canonicalBodies(doc.bodies) === canonicalBodies(query.bodies));
export const allReachable = (documents: readonly ArchiveDocument[]) => { const reachable = new Set(documents.filter((doc) => doc.initial).map((doc) => doc.id)); let changed = true; while (changed) { changed = false; for (const doc of documents) if (!reachable.has(doc.id) && doc.prerequisites.every((id) => reachable.has(id))) { reachable.add(doc.id); changed = true; } } return reachable; };
