# 《黑潮钟》 / The Seventh Chime

[![在线试玩](https://img.shields.io/badge/在线试玩-the_seventh_chime.zylatent.com-2e5f5c?style=flat-square)](http://the_seventh_chime.zylatent.com/)
[![PR 门禁](https://img.shields.io/github/actions/workflow/status/ZhouYinLong-lab/The_Seventh_Chime/ci.yml?style=flat-square&label=PR%20门禁)](https://github.com/ZhouYinLong-lab/The_Seventh_Chime/actions/workflows/ci.yml)
[![部署](https://img.shields.io/github/deployments/ZhouYinLong-lab/The_Seventh_Chime/github-pages?style=flat-square&label=部署)](https://github.com/ZhouYinLong-lab/The_Seventh_Chime/deployments)

1928 年，圣维拉港。钟楼会在黑潮夜敲响七次。

档案记得每一张脸——谁在岗、谁换班、谁拿着钥匙、谁走进维护井。但记录只告诉你「谁在场」，从不回答那个真正的问题：**在场的，究竟是谁。**

用「时段 + 地点 + 角色」检索记录，或在设施地图上翻开整本档案；在七次钟声之内，把 35 份碎片拼成一个名字。

## 玩法

- **检索**：指令台（OPEN / COMPARE / HINT / INSPECT）或「时段 + 地点 + 角色」条件查询
- **地图**：设施内部示意图为主界面，点击房间翻开整本地点记录；人事名册收录七份角色卷宗
- **档案**：未解封条目以封条呈现——只见编号与钟次，不见标题；解封后整本阅读
- **推演**：B4 之后开放假设工作台，对齐七次钟声，终局以九问定案

## 启动

```bash
npm install
npm run dev
```

完整验证与生产构建：

```bash
npm run build
```

## 内容边界

- `src/data/public-content.json` 与 `src/data/extended-documents.json`：玩家可见文本与解锁条件，共 35 份档案
- `src/data/archives.json`：12 本档案（5 地点 + 7 人事）的标题、卷首描述与成员归整
- `author/baseline.json`：完整 B0–B7 时空母表，只用于构建前校验，不进入发布产物
