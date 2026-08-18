// 背景志：1928 圣维拉的世界条目。数据在 src/data/world-content.json。
import worldData from './data/world-content.json';

export interface WorldEntry {
  id: string;
  title: string;
  text: string;
}
export const worldEntries: WorldEntry[] = worldData;
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
export const worldPanel = () => `<section class="panel world-panel"><p class="eyebrow">背景志</p><h2>1928 · 圣维拉</h2><ul class="world-list">${worldEntries.map((entry) => `<li><h3>${esc(entry.title)}</h3><p>${esc(entry.text)}</p></li>`).join('')}</ul></section>`;
