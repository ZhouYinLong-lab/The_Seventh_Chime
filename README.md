# 《黑潮钟》 / The Seventh Chime

固定故事的网页叙事推理游戏。玩家用“时段 + 地点 + 在场肉体”检索档案；记录确认客观肉体与地点，但不会替玩家判断其中的意志。

当前提交先以 B0–B4 的 13 份档案完成垂直切片验证，随后已按同一结构扩展为 B0–B7 的全部 35 份正史主要档案；包含查询、档案阅读、证据标注、客观地点表、自由笔记、B4 后的玩家假设、localStorage、导入导出与构建期校验。

## 启动

```bash
npm install
npm run dev
```

运行完整验证与生产构建：

```bash
npm run build
```

GitHub Pages 工作流会在 `main` 分支推送时构建并发布 `dist/`。作者层真相数据只用于构建前校验，不进入 `dist/`。

## 内容边界

- `src/data/public-content.json` 与 `src/data/extended-documents.json`：玩家可见文本与解锁条件。
- `author/baseline.json`：完整 B0–B7 时空母表，供校验器使用。
- 后续重点是进行可用性试玩，迭代提示密度、档案附件美术与完整的终局答卷交互。
