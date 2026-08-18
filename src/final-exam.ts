import { content, documents } from './content';
import { sha256Hex } from './digest';
import { EXAM_CATEGORIES, EXAM_CATEGORY_LABELS } from './exam-evidence';
import type { EvidenceReference, ExamCategory, SaveV5 } from './types';

// 终局答卷：九个语义问题，整体判定。答案不进入发布产物——
// 这里只保留每个问题对答案的 SHA-256 摘要（盐 + 问题键 + 答案），
// 校验时重算比对；与作者基线终局真相的对应关系由单元测试从 baseline.json 重算锚定。
export const EXAM_SALT = 'seventh-chime:final-exam:';
export const examQuestions: { id: string; label: string }[] = [
  { id: 'corpse_body', label: '被枪杀的肉体' },
  { id: 'dead_soul', label: '死在枪下的灵魂' },
  { id: 'shooter_soul', label: '开枪的灵魂' },
  { id: 'shooter_body', label: '开枪时使用的肉体' },
  { id: 'believed_target_soul', label: '开枪者以为的目标灵魂' },
  { id: 'escaped_soul', label: '借少年身体逃离的灵魂' },
  { id: 'escaped_body', label: '逃离所用的肉体' },
  { id: 'frame_modifier', label: '改动活字版框的灵魂' },
  { id: 'anchored_body', label: '被排除出轮转的锚点肉体' }
];
export const examDigests: Record<string, string> = {
  corpse_body: 'aff68bfbc75cbbef57b79213f040a7f6bfd37497bc20a6bfb6e1273abb49adfb',
  dead_soul: 'efffab0860122e84e83ab716e7ce50732a2d24103a251fbdfd0edc9fc58d8307',
  shooter_soul: '702763e192352255da99053ed5038097254a528098fae78f92897359fdf8a993',
  shooter_body: '9783b0d00d113d2beca3ec88f059de3a2c9746b975260d1f3e25e808853c8122',
  believed_target_soul: '63676f47a7bdf600c64026a1b8bd3c71334f377ea50108afefc01ec1c4066952',
  escaped_soul: '8ceb47c712204ba7ff3882f9376867d90824fad7179a745068638630ef80dd5b',
  escaped_body: '0fa987e773f2f46aa83ec0f0e2c41fd8799d4552bd2c0a352af4979d890961bd',
  frame_modifier: '8c18756925a2f45dc3f892b417fb6eca7503d9978af7dcb5bb1b43a3f1be93ea',
  anchored_body: '85c10cc014f9b661c604c129ff339fc340b906729b7060ae22674acd97907a60'
};
export const makeExamDraft = (): Record<string, string> => Object.fromEntries(examQuestions.map((question) => [question.id, '']));
export const examAvailable = (state: Pick<SaveV5, 'b7Alignment'>) => Boolean(state.b7Alignment?.correct);
export const validateExam = (answers: Record<string, string>): boolean => examQuestions.every((question) => sha256Hex(EXAM_SALT + question.id + ':' + answers[question.id]) === examDigests[question.id]);
const esc = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const options = (selected: string) => `<option value="">未定</option>${content.characters.map((character) => `<option value="${character.id}" ${selected === character.id ? 'selected' : ''}>${esc(character.cn)}</option>`).join('')}`;
const examEvidenceSlot = (category: ExamCategory, ref: EvidenceReference | null) => `<section class="exam-evidence-slot"><h3>${EXAM_CATEGORY_LABELS[category]}</h3><p class="small exam-evidence-ref">${ref ? `${esc(documents.get(ref.docId)?.title || ref.docId)} · ${ref.segmentId ? esc(ref.segmentId) : '未引用段落'}` : '尚未引用段落。'}</p><div class="exam-evidence-actions"><button class="quiet" data-action="add-exam-evidence" data-category="${category}">放入当前选中段</button>${ref ? `<button class="quiet" data-action="remove-exam-evidence" data-category="${category}" aria-label="移除${EXAM_CATEGORY_LABELS[category]}证据">×</button>` : ''}</div></section>`;
export const finalExamPanel = (state: SaveV5) => {
  if (!examAvailable(state)) return '';
  const submitted = Boolean(state.finalExam?.correct);
  const values = state.finalExamDraft;
  const rows = examQuestions.map((question, index) => `<tr><th scope="row">${esc(question.label)}</th><td><select data-exam-index="${index}" ${submitted ? 'disabled' : ''}>${options(values[question.id] || '')}</select></td></tr>`).join('');
  const evidenceSlots = EXAM_CATEGORIES.map((category) => examEvidenceSlot(category, state.finalExamEvidenceDraft[category])).join('');
  return `<section class="final-exam live-frame" aria-labelledby="final-exam-title"><div class="live-frame-heading"><p class="eyebrow">FINAL EXAM</p><h2 id="final-exam-title">终局答卷</h2><p class="small">把改版、开枪与逃亡的语义答案一次性写全。提交前为身体／地点、灵魂指认与因果连续三个类别各引用一段已发现档案中的段落（至少来自两份不同档案）；提交时整体判定，系统不会指出应替换哪一项。</p></div>${submitted ? `<p class="small ok">答卷已确认。九项结论由身体／地点、灵魂指认与因果连续三类证据共同支撑。</p><section class="evidence-triangle" aria-labelledby="triangle-title"><h3 id="triangle-title">三角还原</h3><div class="triangle-cards"><article class="triangle-card"><h4>机器日志</h4><ul><li>发送带先启动。</li><li>火花噪声在喊话前出现。</li><li>发送启动并联锁内门，随后验证卡被使用、枪套破封、名单伸向传递槽，最后开枪。</li></ul></article><article class="triangle-card"><h4>枪套封条</h4><ul><li>B0–B6 连续完整。</li><li>B7 只在 Kovač 肉体到 R 后破坏。</li><li>弹道与 Kovač 肉体位置一致。</li></ul></article><article class="triangle-card"><h4>名单位置</h4><ul><li>名单在 B2 由 Mateo 藏入 Verri 肉体外套。</li><li>B7 由 Verri 肉体带入内信号间。</li><li>枪击后名单落在发送核对台内侧，而非出口、火炉或毁证容器旁。</li></ul></article></div><p class="small">三者共同推出：Verri 肉体中的意志试图把名单送进已经启动的发送流程；Kovač 基于截断警告、自身回归和被噪声破坏的验证，把联锁与持证动作误读为 Verri 正在劫证，于噪声中开枪。身份语义仍需结合改版六人环与 Niko 的连续意图，才能得出死者灵魂是 Niko。</p></section><section class="epilogue" aria-labelledby="epilogue-title"><h3 id="epilogue-title">终局</h3><p>第七声后，K-17 的一发子弹穿过有线玻璃，命中 Verri 肉体——留在里面的灵魂是 Niko。</p><p>Kovač 以为老搭档 Augusto 的灵魂已经回到自己的肉体，正在劫走证据。他破封、举枪，在火花噪声里扣动扳机。他没有杀死 Verri；他杀死的是 Niko。</p><p>发送带完成，以 Mara 名义署名的电报抵达大陆，证明五年前的旧案不是 Mateo 一人的罪行——名字、证言与死亡登记都被人从内部改写，灵魂契约被劫持。</p><p>清晨，少年模样的 Verri 借 Niko 的肉体从防波堤泊位离开港口，带走 Niko 的钥匙、名字与身体。站台与钟楼留在身后；火炉里没有名单——发送核对台上，名单压着那本联锁日志。</p><p>旧案在当夜收口：Mateo 印刷了不该消失的证词；Verri 劫持并改造了契约；Mara 传来过时而被简化过的结论；Kovač 在截断与噪声中武断扣动扳机；Livia 让死亡登记安静如常。而 Niko，直到最后一刻，都在把证据送进已经启动的发送流程。</p></section>` : `<div class="table-wrap"><table><thead><tr><th>问题</th><th>答案</th></tr></thead><tbody>${rows}</tbody></table></div><section class="exam-evidence" aria-labelledby="exam-evidence-title"><h3 id="exam-evidence-title">答卷证据</h3><p class="small">先在档案阅读器中选中具体段落，再放入对应类别。</p><div class="exam-evidence-slots">${evidenceSlots}</div></section><button class="primary" data-action="submit-final-exam">提交答卷</button>`}</section>`;
};
