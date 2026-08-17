<!-- @source: dog-frontier/phase-2 -->
<!-- @phase: design-system -->
<!-- @date: 2026-08-17 -->
<!-- @based_on: seventh-chime vertical slice -->
<!-- @design_system_version: 1.0.0 -->

# 《黑潮钟》设计系统

## 1. 风格方案

深海档案室：暗色、低饱和纸张材质与克制的警示色。界面应像可检索的站内记录，不模拟老旧电脑，也不以故障特效遮挡文本。

## 2. 配色方案

| Token | Hex | 用途 |
|---|---|---|
| `--bg-primary` | `#0e151a` | 页面背景 |
| `--bg-secondary` | `#17242a` | 面板 |
| `--accent-primary` | `#d7aa65` | 可操作强调 |
| `--accent-secondary` | `#7eb8ba` | 已确认客观事实 |
| `--text-primary` | `#f2eee3` | 正文 |
| `--text-secondary` | `#b9c4c1` | 辅助文本 |

## 3. 字体搭配

UI 使用系统中文无衬线；档案正文使用 `Songti SC, STSong, SimSun, serif`。等宽记录使用 `ui-monospace, Consolas, monospace`。

## 4. 效果系统

圆角 6px / 12px；仅使用低对比边框与 160ms opacity/transform 过渡。支持 `prefers-reduced-motion`。

## 5. 反模式警告

- 不用闪烁、抖动或噪音效果传达关键证据。
- 不用颜色单独区分“肉体”“确认事实”和“玩家假设”。

## 6. 预交付清单

- [x] 语义色值以 CSS 变量集中声明。
- [x] 正文、控件与焦点态达到可读对比。
- [x] 不依赖外部字体网络请求。
