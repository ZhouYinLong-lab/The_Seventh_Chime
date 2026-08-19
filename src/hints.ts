import { bellName, content, locationName } from './content';
import { isReady } from './query';
import { canonicalKey } from './terminal';
import type { ArchiveDocument, HintState } from './types';

// 汇聚式提示：每个推进节点提供四层提示，逐层收敛到可直接输入的查询键。
export const currentProgressNode = (discovered: string[]): string => {
  if (discovered.length >= content.documents.length) return 'final';
  return content.documents.find((doc) => !discovered.includes(doc.id) && isReady(doc, discovered))?.id ?? (discovered.includes('doc_b4_a_mateo') ? 'b4-ring' : 'b0-start');
};
export const resetHintState = (nodeKey: string): HintState => ({ nodeKey, invalidQueries: 0, shownLevel: 0, interactionSinceHint: false, lastProgressAt: new Date().toISOString() });
export const hintAvailable = (state: HintState, nodeKey: string, now = Date.now()) => state.nodeKey === nodeKey && state.shownLevel < 4 && (state.shownLevel === 0 ? state.invalidQueries >= 3 || now - Date.parse(state.lastProgressAt) >= 15 * 60_000 : state.interactionSinceHint);
const nodeDocument = (node: string): ArchiveDocument | undefined => content.documents.find((doc) => doc.id === node);
const bodyNames = (doc: ArchiveDocument) => doc.bodies.map((id) => content.characters.find((character) => character.id === id)?.cn ?? id).join('、');
export const hintFor = (node: string, level: 1 | 2 | 3 | 4) => {
  if (node === 'b4-ring') return [
    '回看原始校样：它描述的是排列与方向，而不是某一格应当填入的现成答案。',
    '把范围收回七个名字与一次钟响后的前进方向；先确认每个名字只出现一次。',
    '比较原始校样与 B0 钟楼记录：两份材料各自提供了排列或循环的不同部分。',
    '先固定“原始校样”的七个顺序位置，再检查箭头方向是否与“向前一格”的说明一致。'
  ][level - 1];
  if (node === 'final') return [
    '所有档案都已打开。回到最早一批记录，重读它们的标签、方向与结论草稿。',
    '用 FILES 与 BOARD 清点已发现内容；把 B7 档案与 A、J、H 的排除证据并读。',
    '整理三件事：枪击现场由谁开枪、谁逃离、谁的名字不再出现在轮转中。',
    '最终结论需要至少两份互相独立的证据；先写下谁被杀、谁逃走、谁开火，再核对证据。'
  ][level - 1];
  const doc = nodeDocument(node);
  if (!doc) return '回看最近打开的档案，选择一条尚未完成的查询链。';
  return [
    doc.hints[0] ?? `寻找 ${bellName(doc.bell)} 的 ${locationName(doc.location)} 记录。`,
    `下一步记录在 ${bellName(doc.bell)} 的 ${locationName(doc.location)}。`,
    `该时段 ${locationName(doc.location)} 的在场角色：${bodyNames(doc)}。查询条件须与档案登记完全一致。`,
    `直接输入：${canonicalKey(doc)}。`
  ][level - 1];
};
