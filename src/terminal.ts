import { canonicalBodies, content, documents } from './content';
import type { BellId, QueryState } from './types';

// 指令台纯逻辑：编号解析、规范文件名、Tab 补全与指令帮助。查询执行路径在 main.ts 中与点击式共用同一套核心。
export const commandNames = ['HELP', 'GOALS', 'FILES', 'OPEN', 'COMPARE', 'INSPECT', 'BOARD', 'HINT', 'CLEAR'];
const stripDiacritics = (input: string) => {
  const folded = input.normalize('NFKC').normalize('NFKD');
  let output = '';
  for (const char of folded) { const code = char.codePointAt(0) as number; if (code < 0x300 || code > 0x36f) output += char; }
  return output;
};
export const normaliseKey = (input: string) => stripDiacritics(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
const bodyIds = content.characters.map((character) => character.id.toUpperCase());
const matchBodies = (rest: string): string[] | null => {
  const used: string[] = [];
  const solve = (remainder: string): string[] | null => {
    if (!remainder) return used.length ? [...used] : null;
    for (const id of bodyIds) {
      if (used.includes(id)) continue;
      if (remainder.startsWith(id)) {
        used.push(id);
        const result = solve(remainder.slice(id.length));
        if (result) return result;
        used.pop();
      }
    }
    return null;
  };
  return solve(rest);
};
export const parseSceneKey = (input: string): QueryState | null => {
  const normalized = normaliseKey(input);
  const match = /^(B[0-7])(.+)$/.exec(normalized);
  if (!match) return null;
  const bell = match[1].toLowerCase() as BellId;
  let rest = match[2];
  let best: { code: string; id: string } | null = null;
  for (const location of content.locations) { const code = location.code.toUpperCase(); if (rest.startsWith(code) && (!best || code.length > best.code.length)) best = { code, id: location.id }; }
  if (!best) return null;
  const bodies = matchBodies(rest.slice(best.code.length));
  return bodies ? { bell, location: best.id, bodies: bodies.map((id) => id.toLowerCase()) } : null;
};
export const canonicalKey = (doc: { bell: string; location: string; bodies: string[] }) => `${doc.bell.toUpperCase()}-${content.locations.find((location) => location.id === doc.location)?.code ?? doc.location.toUpperCase()}-${canonicalBodies(doc.bodies).toUpperCase().split('+').join('-')}`;
export const discoveredKeys = (discovered: readonly string[]) => discovered.map((id) => documents.get(id)).filter((doc) => doc).map((doc) => canonicalKey(doc as { bell: string; location: string; bodies: string[] }));
const commonPrefix = (items: string[]) => { if (!items.length) return ''; let prefix = items[0]; for (const item of items) { while (!item.startsWith(prefix)) prefix = prefix.slice(0, -1); } return prefix; };
export const completionFor = (input: string, discovered: readonly string[]): string | null => {
  const tokens = input.split(/\s+/);
  const last = tokens[tokens.length - 1] ?? '';
  const normalised = normaliseKey(last);
  if (!normalised) return null;
  const keys = discoveredKeys(discovered);
  const matches = (key: string) => normaliseKey(key).startsWith(normalised);
  const candidates = tokens.length === 1 ? [...commandNames.filter((name) => name.startsWith(normalised)), ...keys.filter(matches)] : keys.filter(matches);
  if (!candidates.length) return null;
  const prefix = commonPrefix(candidates);
  if (prefix.length <= normalised.length) return null;
  return [...tokens.slice(0, -1), prefix].join(' ') + (candidates.length === 1 ? ' ' : '');
};
export const terminalHelp = (): string[] => {
  const codes = content.locations.map((location) => `${location.code}｜${location.name}`).join(' · ');
  return [
    '调查指令：',
    'HELP — 显示本说明',
    'GOALS — 显示当前可推进的目标',
    'FILES — 列出已发现档案',
    'OPEN <编号> — 打开档案，编号格式：时段-地点-肉体，例如 OPEN B0-H-MARA-KOVAC-VERRI',
    'COMPARE <编号> <编号> — 并排比较两份已发现档案',
    'INSPECT <物品> — 查询物品的档案记录',
    'BOARD — 显示调查状态总览',
    'HINT — 显示下一层调查方向',
    'CLEAR — 清空指令日志',
    '也可直接输入档案编号，如 B0-C-NIKO。',
    `地点代号：${codes}`,
    '档案编号对大小写、分隔符与肉体顺序不敏感。'
  ];
};
