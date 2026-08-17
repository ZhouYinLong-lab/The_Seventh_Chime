// 物品档案登记：可被 INSPECT 查询并可被证据引用的物品。数据在 src/data/items.json。
import itemData from './data/items.json';

export interface ItemRecord {
  id: string;
  name: string;
  aliases: string[];
  description: string;
}
export const items: ItemRecord[] = itemData;
export const normaliseItem = (input: string) => {
  const folded = input.normalize('NFKC').normalize('NFKD');
  let output = '';
  for (const char of folded) { const code = char.codePointAt(0) as number; if (code < 0x300 || code > 0x36f) output += char; }
  return output.toUpperCase().replace(/[^A-Z0-9㐀-鿿]/g, '');
};
export const findItem = (input: string): ItemRecord | null => {
  const key = normaliseItem(input);
  return items.find((item) => normaliseItem(item.name) === key || item.aliases.some((alias) => normaliseItem(alias) === key)) ?? null;
};
