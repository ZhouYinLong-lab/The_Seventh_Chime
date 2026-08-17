import type { B7TimelineEvent, SaveV4 } from './types';

// B7 秒级物证对齐：把七件机器事件对齐到固定时刻。顺序与作者基线 b7Timeline 完全一致。
export const b7Events: B7TimelineEvent[] = [
  { id: 'jump', label: '第七声钟响，完成最后跳转', time: '23:00:00' },
  { id: 'tape_start_and_interlock', label: '发送带启动并触发内门联锁', time: '23:00:08' },
  { id: 'list_to_signal_room', label: '名单进入内信号间', time: '23:00:26' },
  { id: 'identity_check_blocked', label: '身份核对被火花噪声遮蔽', time: '23:00:38' },
  { id: 'holster_seal_broken', label: 'K-17 枪套封条断裂', time: '23:00:39' },
  { id: 'shot', label: '子弹命中维里肉体', time: '23:00:43' },
  { id: 'tape_complete', label: '发送带完成，远端回执返回', time: '23:01:12' }
];
export const b7TimelineTimes = b7Events.map((event) => event.time);
export const b7AlignmentDraftEmpty: Record<string, string> = Object.fromEntries(b7Events.map((event) => [event.id, '']));
export const b7AlignmentAvailable = (state: Pick<SaveV4, 'discovered'>) => state.discovered.includes('doc_b7_r_klara_kovac_verri');
export const validateB7Alignment = (assigned: Record<string, string>): boolean => b7Events.every((event) => assigned[event.id] === event.time);
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
export const b7AlignmentPanel = (state: SaveV4) => {
  if (!b7AlignmentAvailable(state)) return '';
  const submitted = Boolean(state.b7Alignment?.correct);
  const values = state.b7AlignmentDraft;
  const timeOptions = (selected: string) => `<option value="">请选择</option>${b7TimelineTimes.map((time) => `<option value="${time}" ${selected === time ? 'selected' : ''}>${time}</option>`).join('')}`;
  const rows = b7Events.map((event) => `<tr><th scope="row">${esc(event.label)}</th><td><select data-b7-time="${event.id}" ${submitted ? 'disabled' : ''}>${timeOptions(values[event.id] || '')}</select></td></tr>`).join('');
  return `<section class="b7-timeline" aria-labelledby="b7-timeline-title"><div class="live-frame-heading"><p class="eyebrow">SECOND-LEVEL EVIDENCE</p><h2 id="b7-timeline-title">B7 秒级对齐</h2><p class="small">机器日志、枪套封条与名单位置三者共同还原 23:00 的先后。把每个事件对齐到它的时刻；提交时整体判定。</p></div>${submitted ? `<p class="small ok">对齐已确认：机器日志、封条与名单位置三条证据线指向同一顺序。</p>` : `<div class="table-wrap"><table><thead><tr><th>事件</th><th>时刻</th></tr></thead><tbody>${rows}</tbody></table></div><button class="primary" data-action="submit-b7-alignment">提交对齐</button>`}</section>`;
};
