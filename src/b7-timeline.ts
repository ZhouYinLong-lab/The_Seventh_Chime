import { sha256Hex } from './digest';
import type { B7TimelineEvent, SaveV5 } from './types';

// B7 秒级物证对齐：把七件机器事件对齐到固定时刻。事件顺序与作者基线 b7Timeline 完全一致；
// 时刻只作为下拉选项明文存在，事件与时刻的对应关系以摘要形式分发，校验时重算比对。
export const b7Events: B7TimelineEvent[] = [
  { id: 'jump', label: '第七声钟响，完成最后跳转' },
  { id: 'tape_start_and_interlock', label: '发送带启动并触发内门联锁' },
  { id: 'list_to_signal_room', label: '名单进入内信号间' },
  { id: 'identity_check_blocked', label: '身份核对被火花噪声遮蔽' },
  { id: 'holster_seal_broken', label: 'K-17 枪套封条断裂' },
  { id: 'shot', label: '子弹命中维里肉体' },
  { id: 'tape_complete', label: '发送带完成，远端回执返回' }
];
export const B7_SALT = 'seventh-chime:b7-alignment:';
export const b7AlignmentDigests: Record<string, string> = {
  jump: '1c9945ceaab1d4b1ab4c282170010512ad5b52ecbc6aef6699d9edbc43d8e44b',
  tape_start_and_interlock: '30853267831812a1680f1bd4d586a59c1665193d155f4fbcf16ce6d6fc5821b6',
  list_to_signal_room: 'da7a5eac10e99fa2d5f2aa613727aaa2ca0791b8c54d154ffd98478853a931cb',
  identity_check_blocked: '91a4fa9ab2e6551d2c42c6532360525905f183a4fd5b4d6dacdd7e820ec1aa70',
  holster_seal_broken: 'c17a8d1c1093773a03220c6c2677e8b1f54d2332744024cc581374c9bd45e2b6',
  shot: '393fdee4fc85fca208e1815acbd10ca2d27a2baf924871ba19f5ebade476f641',
  tape_complete: '7eedc7f271159b538db22d4d46db93053aafc495a6e532f2ae16ceaf3a8b4fdd'
};
export const b7TimeOptions = ['23:00:00', '23:00:08', '23:00:26', '23:00:38', '23:00:39', '23:00:43', '23:01:12'];
export const makeB7AlignmentDraft = (): Record<string, string> => Object.fromEntries(b7Events.map((event) => [event.id, '']));
export const b7AlignmentAvailable = (state: Pick<SaveV5, 'discovered'>) => state.discovered.includes('doc_b7_r_klara_kovac_verri');
export const validateB7Alignment = (assigned: Record<string, string>): boolean => b7Events.every((event) => sha256Hex(B7_SALT + event.id + ':' + assigned[event.id]) === b7AlignmentDigests[event.id]);
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
export const b7AlignmentPanel = (state: SaveV5) => {
  if (!b7AlignmentAvailable(state)) return '';
  const submitted = Boolean(state.b7Alignment?.correct);
  const values = state.b7AlignmentDraft;
  const timeOptions = (selected: string) => `<option value="">请选择</option>${b7TimeOptions.map((time) => `<option value="${time}" ${selected === time ? 'selected' : ''}>${time}</option>`).join('')}`;
  const rows = b7Events.map((event, index) => `<tr><th scope="row">${esc(event.label)}</th><td><select data-b7-index="${index}" ${submitted ? 'disabled' : ''}>${timeOptions(values[event.id] || '')}</select></td></tr>`).join('');
  return `<section class="b7-timeline" aria-labelledby="b7-timeline-title"><div class="live-frame-heading"><p class="eyebrow">SECOND-LEVEL EVIDENCE</p><h2 id="b7-timeline-title">B7 秒级对齐</h2><p class="small">机器日志、枪套封条与名单位置三者共同还原 23:00 的先后。把每个事件对齐到它的时刻；提交时整体判定。</p></div>${submitted ? `<p class="small ok">对齐已确认：机器日志、封条与名单位置三条证据线指向同一顺序。</p>` : `<div class="table-wrap"><table><thead><tr><th>事件</th><th>时刻</th></tr></thead><tbody>${rows}</tbody></table></div><button class="primary" data-action="submit-b7-alignment">提交对齐</button>`}</section>`;
};
