import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const output = await files(dist);
const forbidden = ['author/', 'answers.json', 'occupancy.json', 'correctSoul', 'bySoul'];
for (const file of output) {
  const text = await readFile(file, 'utf8');
  if (forbidden.some((needle) => text.includes(needle))) throw new Error(`发布产物泄露检查失败：${file}`);
}
console.log(`发布产物检查通过：${output.length} 个文件未包含作者层路径或字段。`);
