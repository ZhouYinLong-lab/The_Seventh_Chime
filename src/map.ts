import { discoveredIn, locationArchives, membersOf, personArchives } from './archives';
import { content } from './content';
import type { SaveV2 } from './types';
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
// 设施内部示意图：房间点击打开整本地点档案，名册点击打开人事卷宗。均为整本展开，锁定条目以封条呈现。
export const mapPanel = (state: SaveV2) => {
  const rooms = locationArchives.map((meta) => {
    const members = membersOf(meta);
    const unlocked = discoveredIn(meta, state.discovered);
    const status = unlocked === 0 ? 'sealed' : unlocked === members.length ? 'complete' : 'partial';
    const location = content.locations.find((item) => item.id === meta.entityId)!;
    const atBell = members.some((doc) => doc.bell === state.query.bell && state.discovered.includes(doc.id));
    return `<button class="room-card ${status}" data-action="open-archive" data-archive="${esc(meta.id)}"><span class="room-code">${esc(location.code)}</span><strong>${esc(location.name)}</strong><small>${esc(location.description)}</small><span class="room-progress">已解封 ${unlocked}/${members.length}</span><span class="room-bell">本钟：${atBell ? '已有记录' : '尚无记录'}</span></button>`;
  }).join('');
  const roster = personArchives.map((meta) => {
    const character = content.characters.find((item) => item.id === meta.entityId)!;
    const unlocked = discoveredIn(meta, state.discovered);
    return `<button class="roster-card" data-action="open-archive" data-archive="${esc(meta.id)}"><strong>${esc(character.cn)}</strong><small>${esc(character.role)}</small><span class="roster-progress">已解封 ${unlocked}/${membersOf(meta).length}</span></button>`;
  }).join('');
  return `<section class="panel facility-map"><p class="eyebrow">设施平面</p><h2>站内示意</h2><p class="small">点击房间打开整本记录；未解封条目以封条呈现，不显示标题与姓名。</p><div class="rooms">${rooms}</div><h3>人事名册</h3><div class="roster">${roster}</div></section>`;
};
