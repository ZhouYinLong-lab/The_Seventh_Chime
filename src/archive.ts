import { discoveredIn, locationArchives, membersOf, personArchives } from './archives';
import { content } from './content';
import type { ArchiveDocument, SaveV2 } from './types';
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
export const documentHasPlayerTag = (state: SaveV2, doc: ArchiveDocument, tag: string) => (state.annotations[doc.id] ?? []).some((entry) => entry.endsWith(`:${tag}`));
export const filteredDocuments = (documents: ArchiveDocument[], state: SaveV2) => documents.filter((doc) => state.discovered.includes(doc.id)).filter((doc) => (state.archiveFilters.bell === 'all' || doc.bell === state.archiveFilters.bell) && (state.archiveFilters.location === 'all' || doc.location === state.archiveFilters.location) && (state.archiveFilters.body === 'all' || doc.bodies.includes(state.archiveFilters.body)) && (state.archiveFilters.tag === 'all' || documentHasPlayerTag(state, doc, state.archiveFilters.tag)) && (state.archiveFilters.read === 'all' || (state.archiveFilters.read === 'read') === state.read.includes(doc.id)));
// 档案库：12 本整本档案分两组（地点记录／人事档案）。场景粒度筛选面已并入地图与检索台。
export const archiveLibrary = (state: SaveV2) => {
  const groups = [['location', '地点记录', locationArchives], ['person', '人事档案', personArchives]] as const;
  return `<section class="panel archive"><div class="archive-title"><h2>档案库 <span>${state.discovered.length}/${content.documents.length}</span></h2><p class="small">整本档案：地点记录与人事卷宗。未解封条目在书内以封条呈现。</p></div>${groups.map(([, label, metas]) => `<div class="archive-group"><h3>${label}</h3><div class="archive-list">${metas.map((meta) => { const unlocked = discoveredIn(meta, state.discovered); const total = membersOf(meta).length; return `<article class="archive-item ${unlocked === 0 ? 'sealed' : ''}"><button data-action="open-archive" data-archive="${esc(meta.id)}"><strong>${esc(meta.title)}</strong><small>${esc(meta.subtitle)}</small></button><span class="archive-progress">已解封 ${unlocked}/${total}</span></article>`; }).join('')}</div></div>`).join('')}</section>`;
};
