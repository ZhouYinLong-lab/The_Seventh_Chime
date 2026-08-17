import { bellName, content, locationName } from './content';
import { isReady } from './query';
import type { ArchiveDocument, HintState } from './types';

export const currentProgressNode = (discovered: string[]) => content.documents.find((doc) => !discovered.includes(doc.id) && isReady(doc, discovered))?.id ?? (discovered.includes('doc_b4_a_mateo') ? 'b4-ring' : 'b0-start');
export const resetHintState = (nodeKey: string): HintState => ({ nodeKey, invalidQueries: 0, shownLevel: 0, interactionSinceHint: false, lastProgressAt: new Date().toISOString() });
export const hintAvailable = (state: HintState, nodeKey: string, now = Date.now()) => state.nodeKey === nodeKey && state.shownLevel < 4 && (state.shownLevel === 0 ? state.invalidQueries >= 8 || now - Date.parse(state.lastProgressAt) >= 15 * 60_000 : state.interactionSinceHint);
const nodeDocument = (node: string): ArchiveDocument | undefined => content.documents.find((doc) => doc.id === node);
export const hintFor = (node: string, level: 1 | 2 | 3 | 4) => {
  if (node === 'b4-ring') return [
    '回看原始校样：它描述的是排列与方向，而不是某一格应当填入的现成答案。',
    '把范围收回七个名字与一次钟响后的前进方向；先确认每个名字只出现一次。',
    '比较原始校样与 B0 钟楼记录：两份材料各自提供了排列或循环的不同部分。',
    '先固定“原始校样”的七个顺序位置，再检查箭头方向是否与“向前一格”的说明一致。'
  ][level - 1];
  const doc = nodeDocument(node);
  if (!doc) return '回看最近打开的档案，选择一条尚未完成的查询链。';
  return [
    `先回读已经打开的记录，寻找能把调查推进到 ${bellName(doc.bell)} 的异常行为或地点事实。`,
    doc.hints[0] ?? `将范围缩小到 ${bellName(doc.bell)} 的 ${locationName(doc.location)}。`,
    `下一步集中在 ${bellName(doc.bell)} 的 ${locationName(doc.location)}；肉体条件必须与该地点的物理在场者完全一致。`,
    `查询时先固定 ${bellName(doc.bell)} 与 ${locationName(doc.location)}，再依据地点表和已读档案选择肉体。`
  ][level - 1];
};
