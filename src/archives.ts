import rawArchives from './data/archives.json' with { type: 'json' };
import { content } from './content';
import type { ArchiveDocument, ArchiveMeta } from './types';

// 档案层：在 35 份场景切片之上提供整本聚合。成员关系纯推导，不写入存档格式。
const base = rawArchives as unknown as ArchiveMeta[];
const bellOrder = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
export const archiveMetas: ArchiveMeta[] = [...base];
export const archiveById = new Map(archiveMetas.map((meta) => [meta.id, meta]));
export const locationArchives = archiveMetas.filter((meta) => meta.kind === 'location');
export const personArchives = archiveMetas.filter((meta) => meta.kind === 'person');
export const membersOf = (meta: ArchiveMeta): ArchiveDocument[] => {
  const members = content.documents.filter((doc) => meta.kind === 'location'
    ? doc.location === meta.entityId
    : doc.bodies.includes(meta.entityId) || doc.segments.some((segment) => segment.speaker === meta.entityId));
  return [...members].sort((a, b) => bellOrder.indexOf(a.bell) - bellOrder.indexOf(b.bell) || a.id.localeCompare(b.id));
};
export const parentArchive = (doc: ArchiveDocument): ArchiveMeta | undefined => locationArchives.find((meta) => meta.entityId === doc.location);
export const archivesForDoc = (doc: ArchiveDocument): ArchiveMeta[] => archiveMetas.filter((meta) => membersOf(meta).some((member) => member.id === doc.id));
export const discoveredIn = (meta: ArchiveMeta, discovered: readonly string[]): number => membersOf(meta).filter((doc) => discovered.includes(doc.id)).length;
