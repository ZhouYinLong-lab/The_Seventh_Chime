import { content } from './content';
import type { SaveV4 } from './types';

// 终局答卷：九个语义答案，整体判定。与作者基线终局真相一一对应。
export const examQuestions: { id: string; label: string; answer: string }[] = [
  { id: 'corpse_body', label: '被枪杀的肉体', answer: 'verri' },
  { id: 'dead_soul', label: '死在枪下的灵魂', answer: 'niko' },
  { id: 'shooter_soul', label: '开枪的灵魂', answer: 'kovac' },
  { id: 'shooter_body', label: '开枪时使用的肉体', answer: 'kovac' },
  { id: 'believed_target_soul', label: '开枪者以为的目标灵魂', answer: 'verri' },
  { id: 'escaped_soul', label: '借少年身体逃离的灵魂', answer: 'verri' },
  { id: 'escaped_body', label: '逃离所用的肉体', answer: 'niko' },
  { id: 'frame_modifier', label: '改动活字版框的灵魂', answer: 'verri' },
  { id: 'anchored_body', label: '被排除出轮转的锚点肉体', answer: 'niko' }
];
export const examDraftEmpty: Record<string, string> = Object.fromEntries(examQuestions.map((question) => [question.id, '']));
export const examAvailable = (state: Pick<SaveV4, 'b7Alignment'>) => Boolean(state.b7Alignment?.correct);
export const validateExam = (answers: Record<string, string>): boolean => examQuestions.every((question) => answers[question.id] === question.answer);
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const options = (selected: string) => `<option value="">未定</option>${content.characters.map((character) => `<option value="${character.id}" ${selected === character.id ? 'selected' : ''}>${esc(character.cn)}</option>`).join('')}`;
export const finalExamPanel = (state: SaveV4) => {
  if (!examAvailable(state)) return '';
  const submitted = Boolean(state.finalExam?.correct);
  const values = state.finalExamDraft;
  const rows = examQuestions.map((question) => `<tr><th scope="row">${esc(question.label)}</th><td><select data-exam-field="${question.id}" ${submitted ? 'disabled' : ''}>${options(values[question.id] || '')}</select></td></tr>`).join('');
  return `<section class="final-exam live-frame" aria-labelledby="final-exam-title"><div class="live-frame-heading"><p class="eyebrow">FINAL EXAM</p><h2 id="final-exam-title">终局答卷</h2><p class="small">把改版、开枪与逃亡的语义答案一次性写全。每条结论都应由至少两条相互独立的证据支撑；提交时整体判定，系统不会指出应替换哪一项。</p></div>${submitted ? `<p class="small ok">答卷已确认。九项结论全部由两条以上相互独立的证据支撑。</p><section class="evidence-triangle" aria-labelledby="triangle-title"><h3 id="triangle-title">三角还原</h3><div class="triangle-cards"><article class="triangle-card"><h4>机器日志</h4><ul><li>发送带先启动。</li><li>火花噪声在喊话前出现。</li><li>发送启动并联锁内门，随后验证卡被使用、枪套破封、名单伸向传递槽，最后开枪。</li></ul></article><article class="triangle-card"><h4>枪套封条</h4><ul><li>B0–B6 连续完整。</li><li>B7 只在 Kovač 肉体到 R 后破坏。</li><li>弹道与 Kovač 肉体位置一致。</li></ul></article><article class="triangle-card"><h4>名单位置</h4><ul><li>名单在 B2 由 Mateo 藏入 Verri 肉体外套。</li><li>B7 由 Verri 肉体带入内信号间。</li><li>枪击后名单落在发送核对台内侧，而非出口、火炉或毁证容器旁。</li></ul></article></div><p class="small">三者共同推出：Verri 肉体中的意志试图把名单送进已经启动的发送流程；Kovač 基于截断警告、自身回归和被噪声破坏的验证，把联锁与持证动作误读为 Verri 正在劫证，于噪声中开枪。身份语义仍需结合改版六人环与 Niko 的连续意图，才能得出死者灵魂是 Niko。</p></section><section class="epilogue" aria-labelledby="epilogue-title"><h3 id="epilogue-title">终局</h3><p>第七声后，K-17 的一发子弹穿过有线玻璃，命中 Verri 肉体——留在里面的灵魂是 Niko。</p><p>Kovač 以为老搭档 Augusto 的灵魂已经回到自己的肉体，正在劫走证据。他破封、举枪，在火花噪声里扣动扳机。他没有杀死 Verri；他杀死的是 Niko。</p><p>发送带完成，以 Mara 名义署名的电报抵达大陆，证明五年前的旧案不是 Mateo 一人的罪行——名字、证言与死亡登记都被人从内部改写，灵魂契约被劫持。</p><p>清晨，少年模样的 Verri 借 Niko 的肉体从防波堤泊位离开港口，带走 Niko 的钥匙、名字与身体。站台与钟楼留在身后；火炉里没有名单——发送核对台上，名单压着那本联锁日志。</p><p>旧案在当夜收口：Mateo 印刷了不该消失的证词；Verri 劫持并改造了契约；Mara 传来过时而被简化过的结论；Kovač 在截断与噪声中武断扣动扳机；Livia 让死亡登记安静如常。而 Niko，直到最后一刻，都在把证据送进已经启动的发送流程。</p></section>` : `<div class="table-wrap"><table><thead><tr><th>问题</th><th>答案</th></tr></thead><tbody>${rows}</tbody></table></div><button class="primary" data-action="submit-final-exam">提交答卷</button>`}</section>`;
};
