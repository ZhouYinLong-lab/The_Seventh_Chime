import { discoveredIn, membersOf } from './archives';
import { sceneEntry } from './archive-reader';
import { bellName, content } from './content';
import type { ArchiveMeta, SaveV2 } from './types';
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const bellOrder = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
// 整本档案阅读器：未解锁成员渲染为封条（仅编号、钟次与地点代号，不泄场景标题），已解锁成员逐条展开。
export const archiveBook = (meta: ArchiveMeta, state: SaveV2, revealed: boolean, sealNotice: string | null): string => {
  const members = membersOf(meta);
  const unlocked = discoveredIn(meta, state.discovered);
  const entries = members.map((doc) => {
    if (state.discovered.includes(doc.id)) return sceneEntry(doc, state, revealed, 'entry');
    const slot = bellOrder.indexOf(doc.bell) + 1;
    const code = content.locations.find((location) => location.id === doc.location)?.code ?? '';
    return `<article class="entry seal" aria-label="封存条目 ${slot}"><p class="eyebrow">封存条目 №${slot}</p><p class="seal-line">${esc(bellName(doc.bell))} · ${esc(code)}</p><button class="quiet" data-action="seal-hit" data-doc="${esc(doc.id)}">尝试解封</button></article>`;
  });
  return `<section id="reader" class="panel reader book ${meta.kind === 'location' ? 'kind-location' : 'kind-personnel'}" tabindex="-1"><div class="archive-heading"><div><p class="eyebrow">${meta.kind === 'location' ? '地点记录' : '人事卷宗'}</p><h2>${esc(meta.title)}</h2><p class="subtitle">${esc(meta.subtitle)}</p></div><span class="book-badge">已解封 ${unlocked}/${members.length}</span></div><p class="book-description">${esc(meta.description)}</p><div class="segments">${entries}</div>${sealNotice ? `<p class="seal-feedback" role="status">${esc(sealNotice)}</p>` : ''}</section>`;
};
