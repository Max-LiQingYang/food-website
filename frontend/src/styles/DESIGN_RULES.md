# DESIGN_RULES.md — Food Website 前端设计规则

> 本项目设计规范。所有前端开发必须遵守此文件。基于当前项目提取，参考 Pinterest、小红书 PC、下厨房的设计语言。

---

## 1. 色彩系统

所有颜色通过 CSS 变量声明，禁止硬编码色值。

### 主色系 — 暖橙（美食调性）
| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-primary` | `#e8663e` | 主色：按钮、链接、选中态、品牌色 |
| `--color-primary-hover` | `#d45a32` | 主色悬浮态 |
| `--color-primary-dark` | `#c94f2a` | 主色深色（暗色模式高亮） |
| `--color-primary-light` | `#f5a885` | 主色浅色（hover 边框、辅助强调） |
| `--color-primary-bg` | `#fff3ed` | 主色背景（hover 行/标签底） |
| `--color-star` | `#f59e0b` | 评分星级色 |

### 中性色（文字 + 背景）
| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-text` | `#333` | 主文字色 |
| `--color-text-secondary` | `#666` | 二级文字（meta 信息） |
| `--color-text-muted` | `#999` | 三级文字（辅助/占位符/时间） |
| `--color-bg` | `#faf6f1` | 页面背景（暖白） |
| `--color-bg-secondary` | `#f5f0eb` | 二级背景（section 底/卡片交替） |
| `--color-card` | `#fff` | 卡片背景 |
| `--color-border` | `#e8e0d8` | 默认边框（暖灰） |
| `--color-border-light` | `#f0ebe5` | 弱边框（分割线） |
| `--color-input-bg` | `#fff` | 输入框背景 |
| `--color-tag-bg` | `#f0ebe6` | 标签底色 |
| `--color-tag-text` | `#666` | 标签文字色 |
| `--color-skeleton-from` | `#f5f0eb` | 骨架屏起点 |
| `--color-skeleton-to` | `#e8e0d8` | 骨架屏终点 |

### 语义色
| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-success` | `#27ae60` | 成功/通过 |
| `--color-danger` | `#e74c3c` | 错误/删除 |
| `--color-warning` | `#f39c12` | 警告 |
| `--color-accent` | `#4a9eff` | 强调色（链接、信息） |

### 暗色模式覆写

在 `body.dark` 选择器下覆写以下变量：
```
--color-text: #e0e0e0
--color-text-secondary: #aaa
--color-text-muted: #888
--color-bg: #1a1a1a
--color-bg-secondary: #2a2a2a
--color-card: #222
--color-border: #3a3530
--color-border-dark: #444
--color-input-bg: #2a2520
--color-primary-bg: #2e1a14
--color-tag-bg: #333
```

---

## 2. 字体规范

字号使用 `rem` 或 `px`，所有标题/正文在同一文件内保持一致。

| 层级 | 字号 | 字重 | 行高 | 颜色 | 适用元素 |
|------|------|------|------|------|----------|
| H1 | 28px | 700 | 1.3 | `--color-text` | 页面大标题 |
| H2 | 22px | 700 | 1.35 | `--color-text` | Section 标题 |
| H3 | 17px | 600 | 1.4 | `--color-text` | 卡片标题/区块标题 |
| 正文 | 14px | 400 | 1.6 | `--color-text` | 段落/说明文字 |
| 元数据 | 12px | 400 | 1.4 | `--color-text-muted` | 时间、统计、标签 |
| 小标签 | 11px | 500 | 1.3 | `--color-tag-text` | Badge/Tag |
| 卡片标题 | 15px | 600 | 1.4 | `--color-text` | RecipeCard 标题行 |
| 按钮文字 | 14px | 600 | 1 | `--color-text` 或 #fff | 按钮 |

**禁止**：同时使用超过 3 个字号层级在一个组件内。标题不要使用 400 字重。

---

## 3. 间距系统

使用 4px 为基准单位，遵循以下层级：

| 层级 | 值 | 使用场景 |
|------|-----|----------|
| `4px` | 4px | 图标/文字之间极紧凑间距 |
| `8px` | 8px | 标签间距、按钮内 padding-x |
| `12px` | 12px | 卡片内间距、元素组间距 |
| `16px` | 16px | 标准 padding、gap |
| `20px` | 20px | Section 内间距 |
| `24px` | 24px | 大区块间距、页面左右 padding |
| `32px` | 32px | Section 上下间距 |
| `48px` | 48px | 页面底部/顶部大间距 |

**禁止**：使用 5px/7px/9px/13px 等非 4px 倍数的间距。卡片内左右 padding 统一为 `12px`。

---

## 4. 圆角规范

| 级别 | 值 | 使用场景 |
|------|-----|----------|
| `--radius-sm` | 8px | 输入框、小标签、按钮（非圆角） |
| `--radius-md` | 12px | 卡片、弹窗、大按钮 |
| `--radius-lg` | 16px | 大卡片、移动端底部 sheet |

特殊圆角：
- Pill 胶囊按钮/标签：`border-radius: 9999px`
- 圆形图标按钮：`border-radius: 50%`
- 输入框搜索条：`border-radius: 20px`（与搜索页统一）

**禁止**：圆角值小于 4px（无 Sharp corner）、大于 20px（除非 pill/圆形）。

---

## 5. 阴影规范

| 级别 | 值 | 使用场景 |
|------|-----|----------|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)` | 卡片默认态 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | 悬浮态、下拉菜单 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | 弹窗、模态框 |

暗色模式下阴影颜色加深：`rgba(0,0,0,0.4)` `rgba(0,0,0,0.5)`

**禁止**：`box-shadow: 0 0 ...` 无偏移的大面积发光阴影。

---

## 6. 按钮规范

### 主按钮（Primary）
| 属性 | 值 |
|------|-----|
| Padding | `10px 24px` |
| 背景 | `var(--color-primary)` |
| 字色 | `#fff` |
| 圆角 | `--radius-sm (8px)` |
| Hover | `var(--color-primary-hover)` + `transform: translateY(-1px)` |
| Active | `transform: scale(0.97)` |

### 次按钮（Secondary）
| 属性 | 值 |
|------|-----|
| Padding | `8px 20px` |
| 背景 | `transparent` |
| 边框 | `1px solid var(--color-border)` |
| 字色 | `var(--color-text)` |
| Hover | 边框变为主色，文字变主色 |

### 文字按钮（Text/CTA）
| 属性 | 值 |
|------|-----|
| Padding | `6px 12px` |
| 背景 | `transparent` |
| 字色 | `var(--color-primary)` |
| Hover | `background: var(--color-primary-bg)` |

### 标签按钮（Pill/Chip）
| 属性 | 值 |
|------|-----|
| Padding | `6px 16px` |
| 圆角 | `9999px` |
| 字号 | `13px` |
| Active | `background: var(--color-primary)` + `color: #fff` |

---

## 7. 卡片规范

### 食谱卡片（RecipeCard）
| 属性 | 值 |
|------|-----|
| 宽 | 自适应（grid 子项） |
| 圆角 | `--radius-md (12px)` |
| 边框 | `1px solid var(--color-border)` |
| 背景 | `var(--color-card)` |
| 图片比例 | `aspect-ratio: 4/3` |
| 信息区 padding | `10px 12px 12px` |
| 悬浮态 | `translateY(-4px)` + `--shadow-lg` |
| 入场动画 | `cardFadeIn 0.4s ease` |

### 排行榜卡片（RankCard）
| 属性 | 值 |
|------|-----|
| 布局 | flex row（排名柱 + 封面 + 信息 + 数据） |
| 圆角 | `--radius-lg (16px)` |
| 图片 | `80×80px` 圆角 `8px` |

---

## 8. 响应式断点

| 断点 | 名称 | 适配内容 |
|------|------|----------|
| `≤480px` | 手机小屏 | 单列 grid, 底部导航, 字号不缩放, 全宽 |
| `≤768px` | 手机/平板竖 | 2 列 grid, hover 效果转 tap |
| `≤1024px` | 平板横/小屏PC | 3 列 grid |
| `>1024px` | PC 宽屏 | 4 列 grid, 内容区域最大宽度 `1200px` |

**原则**：移动端优先（Mobile-first）。桌面端功能完整，不加额外限制。
**移动端特殊规则**：
- iOS `font-size: 16px` 防止缩放（`-webkit-text-size-adjust: 100%`）
- `:active` 态 `scale(0.97)` 替代 hover
- touch 事件 `passive: true`

---

## 9. 布局密度

| 属性 | 值 |
|------|-----|
| 内容区域最大宽度 | `1200px` |
| Grid 默认列数 | 4 列（`repeat(4, 1fr)`） |
| Grid gap | `16px` |
| 页面左右 padding | `16px`（移动端）→ `24px`（PC） |
| Section 间距 | `32px` 垂直 |
| 排行榜/列表项间距 | `12px` |

---

## 10. 禁止项

以下是本项目**禁止**使用的样式模式：

1. ❌ **冷色主色调**：不要使用蓝色/紫色作为主色（`#6366f1` 除外可用于排行榜活跃态排序按钮）
2. ❌ **大段纯黑文字**：禁用 `color: #000`，文字色使用 `--color-text: #333`
3. ❌ **大 padding 间距**：卡片内 padding 不超过 `12px`，页面 padding 不超过 `24px`
4. ❌ **多色混乱**：同页面主色不超过 2 种（暖橙 + 灰色系），语义色（绿/红/蓝）用于特定状态
5. ❌ **阴影过大**：`box-shadow` 不超过 `--shadow-lg` 的强度
6. ❌ **不同名 CSS 变量重复**：同一个含义只用一个变量名（如 `--color-card` 不加 `--color-card-bg`）
7. ❌ **移动端 hover 依赖**：所有交互在 touch 设备必须可以用 `:active` 完成
8. ❌ **字号小于 11px**：最小可读字号为 `11px`
9. ❌ **行内样式**：禁止在 JSX 中用 `style={{}}` 替代 CSS 类，例外：动态颜色（`--cat-color`）
10. ❌ **未使用 CSS 变量的硬编码**：所有颜色/间距/圆角/阴影必须使用 `var(--xxx)` 声明

---

## 11. 动画过渡

| 级别 | 值 | 使用场景 |
|------|-----|----------|
| `--transition-fast` | `0.2s ease` | hover/active 微交互 |
| `--transition-normal` | `0.3s ease` | 标准过渡 |

弹性动画：`0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`（卡片悬浮/入场弹跳）
骨架屏：`shimmer` `1.5s infinite`（`background-size: 200% 100%`）

**禁止**：`transition: all`（应精确指定属性）。

---

## 12. 暗色模式

通过 `body.dark` CSS 选择器覆写变量。所有组件必须同时提供浅色/深色两套样式。

```css
/* 标准模式 */
.element { color: var(--color-text); }

/* 暗色覆写 */
body.dark .element { color: var(--color-text-dark, #eee); }
```

**组件级覆写原则**：先在全局变量层覆写，如果组件有特殊需求则在组件 CSS 中针对性覆写。
暗色模式下图片/封面降低亮度（`filter: brightness(0.9)`），卡片边框加深(`var(--color-border-dark)`)。

---

*最后更新：2026-05-29*
*本文件由设计规则生成，后续迭代应持续更新此文件以反映实际设计决策。*