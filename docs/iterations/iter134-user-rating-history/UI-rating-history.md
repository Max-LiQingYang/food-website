# UI 设计规范：用户个人评分历史可视化

**迭代编号**：#134
**设计师**：UI Designer Agent
**文档版本**：v1.0
**最后更新**：2026-06-12
**关联文档**：[`PRD-rating-history.md`](./PRD-rating-history.md) · [`ARCH-rating-history.md`](./ARCH-rating-history.md) · [`REVIEW-plan.md`](./REVIEW-plan.md)
**状态**：待评审

---

## 0. 设计基线（从代码提取的既有规范）

| 维度 | 取值来源 | 备注 |
|---|---|---|
| 主色 | `--color-primary: #e8663e`（`frontend/src/global.css:9`） | 暖橙/陶土 |
| 强调色 | `--color-accent: #ff8c42` | 珊瑚橙 |
| 4 维色卡 | `frontend/src/global.css` 的 `--chart-c1~c8` + `DimensionRadar` 仅用单色（待扩展为 4 色） | 见 §2.1 |
| 阴影 3 级 | `--shadow-sm / --shadow-md / --shadow-lg` | `global.css` + `DESIGN_RULES.md §5` |
| 圆角 3 级 | `--radius-sm 8px` / `--radius-md 12px` / `--radius-lg 16px` | `DESIGN_RULES.md §4` |
| 字体 7 级 | 11 / 12 / 14 / 15 / 17 / 22 / 28 px | `DESIGN_RULES.md §2` |
| 间距体系 | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 px | `DESIGN_RULES.md §3` |
| 断点 3 个 | 480 / 768 / 1024 px | `DESIGN_RULES.md §8` |
| 内容最大宽 | 1200 px | `DESIGN_RULES.md §9` |
| 暗色触发 | `body.dark` | `global.css` 全文、`DimensionRadar.tsx:74` |
| 动画 token | `--ease-out-soft / --ease-out-back / --duration-fast 0.2s / --duration-normal 0.3s / --duration-slow 0.5s` | `global.css` 已有，可直接复用 |
| 8 色调色板 | `--chart-c1~c8` | 暗色模式下需逐个重写，本规范不强制，但建议沿用 |
| 卡片基线 | `background: var(--color-card); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);` | 取自 `StatsCharts.css:1-7` 与 `AchievementsPanel.css:3-8`，是站内"区块卡片"通用写法 |

> 本规范**沿用**以上 token，**不另起炉灶**。新增变量仅用于"模块特有"语义（如 delta 配色、模块骨架屏背景渐变等）。

---

## 1. 信息架构

### 1.1 模块在 UserProfilePage 的插入位置

依据 `ARCH §2.1` + `UserProfilePage.tsx:560-567` 的真实 JSX 顺序：

```
┌──────────────────────────────────────┐
│  Header（用户头像 / 名字 / 简介）    │
├──────────────────────────────────────┤
│  StatsCards（总食谱/总收藏/被收藏）  │  ← UserProfilePage 内联
├──────────────────────────────────────┤
│  AchievementSection（成就预览 +12个）│  ← UserProfilePage 内联
├──────────────────────────────────────┤
│  ActivityHeatmap（烹饪热力图）       │  ← 行 562
├──────────────────────────────────────┤
│  ┌─ RatingHistoryModule ──────────┐  │  ← **本模块插入点**
│  │  §1.2 容器 + 9 个子组件         │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  AchievementsPanel（成就面板）       │  ← 行 564
├──────────────────────────────────────┤
│  StatsCharts（全站数据图表）         │  ← 行 567
├──────────────────────────────────────┤
│  profile-tabs（食谱/收藏/收藏夹/足迹）│  ← 行 571+
└──────────────────────────────────────┘
```

**与 PRD 7.1 的差异说明**：PRD 写"在 `StatsCharts` 上方、`AchievementsPanel` 下方"，但 ARCH §2.1 在反复权衡后将插入点改为"**`AchievementsPanel` 之后、`StatsCharts` 之前**"。本规范以 **ARCH §2.1 为准**（位于 `ActivityHeatmap` 与 `AchievementsPanel` 之间）—— 视觉上承接"个人成就"叙事并与"全站数据"形成"个人 ↔ 整体"对照。**评审请在文档中统一此位置**。

### 1.2 9 个子组件的视觉层级

```
RatingHistoryModule（容器 / 主标题 + 隐私开关 + 整模块骨架）
├── §3.1 RatingEmptyState（5 级空状态 — 全模块替代品，仅在 0 条评分时显示）
├── §3.2 RatingPrivacyGate（私有占位 — 仅在非本人 + privacy=false 时显示）
├── §3.3 RatingLoginGate（登录占位 — 仅在未登录时显示）
└── 数据视图（≥1 条评分时显示，按"少数据/充足"分支裁剪子组件）
    ├── ① RatingModuleHeader（标题 + 隐私开关 + 维度偏好标签 [P1]）
    ├── ② RatingSampleBanner（"样本较少"提示条 — 仅 1-9 条时显示）
    ├── ③ RatingDimensionAverages（4 维平均卡片 — 4 列/2×2/1 列）
    ├── ④ RatingRadarSection（雷达图 + hover 浮窗）
    │     ├── RatingRadar（薄包装 DimensionRadar，size=lg）
    │     └── RatingRadarTooltip（hover 浮窗，portal 到 body）
    ├── ⑤ RatingTrendSection（趋势图 + 时间范围切换器 + ⚠️ 角标）
    │     └── RatingTrendChart（4 线 LineChart，30d/90d/1y/all）
    ├── ⑥ RatingDistribution（4 维直方图 2×2，<768px 横向滚动）
    ├── ⑦ RatingTopList（高分/低分 Tab 切换，5 条 + 封面）
    └── ⑧ RatingHistoryList（最近 10 条 + 排序 + 查看更多）
```

**视觉层级口径**：
- 一级：模块容器卡片（沿用 StatsCharts 卡片基线）
- 二级：模块内 5 个子区（雷达/趋势/分布/TOP/历史）—— **不需要**各自再嵌一层卡片，直接用 `margin-bottom: 24px` 分割 + H3 标题分隔
- 三级：子区内部元素（卡片/列表行/直方图）

> **设计取舍**：站内既有模块（`StatsCharts`、`AchievementsPanel`）都是"一整张大卡片 + 内部 grid"的写法，**不嵌套**卡片。本规范延续此风格，避免视觉割裂。

### 1.3 滚动行为

- **整页滚动**（与 `StatsCharts`、`AchievementsPanel` 一致）：不开启模块内独立滚动。模块本身是 `UserProfilePage` 文档流的一部分，`overflow` 默认为 visible
- 模块内任何"超长列表"（如 TOP 5 切换 / 历史 10 条）**按需展开**，不强制首屏显示完整
- "查看更多" 加载时**列表就地追加**，不滚动到顶部
- 雷达图/趋势图/分布图：高度固定（趋势 280px / 分布 240px / 雷达 300px），不随窗口抖动（Recharts `ResponsiveContainer` 默认行为）
- 移动端（<768px）：模块卡片左右 padding 由 24px 收缩为 16px（对齐 `StatsCharts.css:268` 的做法）

---

## 2. 视觉系统

### 2.1 色卡

#### A. 4 维色卡（与 PRD/ARCH 对齐）

> 当前 `DimensionRadar.tsx:83` 实际只用了**单色**（`--color-primary` 橙）；PRD 7.2 要求"与 DimensionRadar 一致：taste=橙 / difficulty=绿 / presentation=蓝 / value=黄"。这是**已知缺口**（ARCH §7 风险表第 7 条），本规范**借本次迭代同步定义** 4 维色卡变量。

| 维度 | 浅色模式 | 暗色模式 | 语义映射 | 站点参考 |
|---|---|---|---|---|
| `taste`（口味） | `#e8663e` | `#f59e6e` | 暖橙（主色） | `--color-primary` / `--chart-c1` |
| `difficulty`（难度） | `#52c41a` | `#7ed957` | 绿 | `--color-success` / `--chart-c2` |
| `presentation`（卖相） | `#1890ff` | `#5ab0ff` | 蓝 | `--color-info` / `--chart-c3` |
| `value`（性价比） | `#faad14` | `#ffc857` | 金黄 | `--color-warning` / `--chart-c4` |

**实现要求**（在 PR 描述中给前端编码者）：
- 新增 `--color-dim-taste / --color-dim-difficulty / --color-dim-presentation / --color-dim-value` 4 个变量
- `DimensionRadar.tsx` 扩展为支持 `multiColor` prop（默认 false 保持向后兼容；新模块用 true）
- 趋势图 4 条线、直方图 4 个图、TOP 列表 4 维徽标 — **统一引用这 4 个变量**

#### B. delta 配色（与全站平均对比）

> PRD 7.2 要求"正差 = 主色（积极），负差 = 中性灰（不强调'差'避免攻击性）"。

| 状态 | 浅色 | 暗色 | 视觉处理 |
|---|---|---|---|
| 正差（> 0） | `--color-primary #e8663e` | `--color-primary-light #f0946e` | 主色文字 + `▲` 三角 |
| 零差（= 0） | `--color-text-muted #999` | `#888` | 中性文字 + `—` 横线 |
| 负差（< 0） | `--color-text-muted #999` | `#888` | 中性文字 + `▼` 三角（灰色，不红） |

> **设计取舍**：PRD 写"负差 = 中性灰"，**不**用红色（站点有 `--color-error #ff4d4f` 但故意不用）。理由：个人口味偏好的"负差"是中性事实，不是"做错了"；红色会带来不必要的自我评价压力。

#### C. 隐私/状态色

| 状态 | 浅色 | 暗色 | 用途 |
|---|---|---|---|
| 私有占位 | `--color-bg-secondary #f5f0eb` | `#2a2520` | 容器背景 |
| 登录引导 | `--color-primary-bg #fff3ed` | `#2e1a14` | 容器背景 |
| 模块错误 | `--color-warning #faad14` | `#ffc857` | "重试"按钮 + 提示文字 |
| 样本不足角标 | `--color-warning` | 同上 | ⚠️ 图标色 |

### 2.2 间距

| 场景 | 值 | 备注 |
|---|---|---|
| 模块内子区上下间距 | 24px | 对齐 `StatsCharts.css:5` |
| 4 维平均卡之间 gap | 12px | 桌面 4 列横排；移动 16px |
| 雷达 + 趋势分栏 gap | 20px | 桌面左右分栏 |
| 分布 2×2 网格 gap | 16px | |
| TOP 5 列表行间距 | 12px | 沿用 `RankCard` 风格 |
| 历史列表行间距 | 12px | |
| 标题与内容间距 | 16px | 标题下 margin-bottom |
| 模块卡片内 padding | 24px（桌面）/ 16px（<768px） | 对齐 `StatsCharts.css:5, 268` |

### 2.3 字体

| 层级 | 字号 | 字重 | 颜色 | 用途 |
|---|---|---|---|---|
| 模块主标题 | 18px | 600 | `--color-text` | H3，与 `StatsCharts__title` / `AchievementsPanel__title` 完全一致（这两处都用了 18/600） |
| 子区标题 | 15px | 600 | `--color-text` | 雷达/趋势/分布小标题 |
| 大数字（平均分） | 28px | 700 | `--color-text` | 4 维卡片主数字（与 H1 同号） |
| delta 标识 | 12px | 500 | 见 §2.1 B | "▲ +0.3" |
| 维度名 | 13px | 500 | `--color-text-secondary` | "口味 / 难度 / 卖相 / 性价比" |
| 评分数 | 11px | 400 | `--color-text-muted` | "基于 43 次评分" |
| 列表行标题 | 14px | 600 | `--color-text` | 食谱名 |
| 列表行元数据 | 12px | 400 | `--color-text-muted` | 评分时间 |
| Tab 标签 | 14px | 600 | `--color-text` / `--color-primary`（active） | TOP 5 切换 / 排序切换 |
| 标签/徽标 | 11px | 500 | `--color-tag-text` | 4 维分小圆点（"T 4.2"） |

> **不引入**新字号层级，全部沿用 `DESIGN_RULES.md §2` 的 7 级体系。

### 2.4 圆角 / 阴影 / 边框

- 容器卡片圆角：`--radius-lg (16px)`（与 StatsCharts 一致）
- 内部子区**不嵌套**卡片：直接用 `margin-bottom: 24px` + 标题分隔
- 4 维平均分卡：圆角 `--radius-md (12px)`、边框 `1px solid var(--color-border)`、阴影**无**（与 `RecipeCard.css` 一致，保持"轻量卡片"观感）
- 历史列表行 / TOP 5 行：圆角 `--radius-md (12px)`、边框 `1px solid var(--color-border-light)`、hover 时 `box-shadow: var(--shadow-md)` + `translateY(-2px)`
- 4 维分小徽标：圆角 `9999px`（pill，参考 `RecipeCard.css` 中 `__badge` 风格）
- 直方图柱子：圆角 `4px 4px 0 0`（顶部圆角，底部平贴 X 轴）

### 2.5 暗色模式

`body.dark` 触发，全部沿用现有变量覆写规则。本模块**新增**的 CSS 变量在 `:root` 与 `body.dark` 两套值如下（详见 §7）。

**颜色对比度自检**（仅列关键组合）：

| 文字色 | 背景色 | 对比度 | 是否 ≥ 4.5:1 |
|---|---|---|---|
| `--color-text #2d2d2d` | `--color-card #fff` | 12.6 : 1 | ✅ |
| `--color-text #e0e0e0` | `--color-card #222` | 11.4 : 1 | ✅ |
| `--color-text-muted #999` | `--color-card #fff` | 2.85 : 1 | ❌（**仅用于元数据/时间戳**，属允许弱对比场景，参考 `DESIGN_RULES.md §10` 暗色模式规则——元数据非关键信息） |
| `--color-text-muted #888` | `--color-card #222` | 4.95 : 1 | ✅ |
| `--color-primary #e8663e` | `--color-card #fff` | 3.55 : 1 | ❌（**不用于大段正文**；本模块仅用于 delta ▲ 标识和 hover 链接，11/12px 字号，**符合"装饰性文字不强制 4.5:1"** 的 W3C 豁免） |
| `--color-primary-light #f0946e` | `--color-card #222` | 5.0 : 1 | ✅ |

> **结论**：所有"可读关键文字"对比度均 ≥ 4.5:1；元数据/装饰性文字允许弱对比。

---

## 3. 9 个组件设计稿

> 以下草图全部为**桌面端 ≥ 1024px** 默认形态。响应式断点行为见 §5。

### 3.1 RatingHistoryModule（容器）

**位置**：紧跟 `ActivityHeatmap`（`UserProfilePage.tsx:562` 之后），在 `AchievementsPanel` 之前。

```
┌─ .module-card ──────────────────────────────────────────────┐
│  ┌── .module-header ──────────────────────────────────────┐ │
│  │ 📊 我的评分历史                            [🔒 仅自己可见]│ │  ← ① + ⑧ 隐私开关
│  │ 已评 47 道 · 共 92 次评分                              │ │  ← 模块副标题（meta）
│  └────────────────────────────────────────────────────────┘ │
│  ┌── .module-sample-banner (条件：1-9 条评分) ───────────┐  │  ← ② 样本不足提示
│  │ ⚠️ 样本较少，建议多评几条解锁完整画像                  │  │  （pale-warning-bg）
│  └────────────────────────────────────────────────────────┘ │
│  ┌── .module-body ────────────────────────────────────────┐ │
│  │  [ ③ 4 维平均分卡片区 4 列 ]                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │ │
│  │  │口味  │ │难度  │ │卖相  │ │性价比│                   │ │
│  │  │ 4.2  │ │ 3.1  │ │ 4.5  │ │ 3.8  │                   │ │
│  │  │▲+0.4 │ │▼-0.3 │ │▲+0.6 │ │▲+0.1 │                   │ │
│  │  │43 次 │ │42 次 │ │40 次 │ │43 次 │                   │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                   │ │
│  │                                                        │ │
│  │  [ ④ + ⑤ 雷达 + 趋势 分栏 ]                            │ │
│  │  ┌── 我的口味画像 ──┐ ┌── 评分趋势 ──[30d|90d|1y|all]┐ │ │
│  │  │   [雷达图 lg]    │ │   [4 线折线图]              │ │ │
│  │  │   hover 显示     │ │   ⚠️ 样本不足角标（<3 点）   │ │ │
│  │  │   "X 分 · N 次"  │ │   ⚠️ 角标（条件：<3 条样本）  │ │ │
│  │  └──────────────────┘ └─────────────────────────────┘ │ │
│  │                                                        │ │
│  │  [ ⑥ 评分分布 2×2 ]                                    │ │
│  │  ┌── 口味分布 ──┐ ┌── 难度分布 ──┐                     │ │
│  │  │ ▁▃▅▇█  (1-5) │ │ ▂▆█▅▁        │                   │ │
│  │  └───────────────┘ └───────────────┘                     │ │
│  │  ┌── 卖相分布 ──┐ ┌── 性价比分布 ┐                      │ │
│  │  │ ▁▁▃▅█▇       │ │ ▁▂▃▅▄▁        │                   │ │
│  │  └───────────────┘ └───────────────┘                     │ │
│  │                                                        │ │
│  │  [ ⑦ TOP 5 列表 ]                                      │ │
│  │  ┌── [高分榜|低分榜] 切换 ──────────────────────────┐  │ │
│  │  │ 高分榜（5 条，封面 + 标题 + 4 维分 + 时间）       │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  [ ⑧ 历史评分列表 ]                                    │ │
│  │  ┌── [时间倒序▼|评分高|评分低] 切换 ─────────────────┐  │ │
│  │  │ 行 1: 封面 + 标题 + 4 维分 + 时间  ──────────→     │  │ │
│  │  │ 行 2: ...                                            │  │ │
│  │  │ ... (10 条)                                          │  │ │
│  │  │              [ 查看更多 ▼ ]                         │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**关键交互**：
- **滚动到视口才加载**（lazy mount）：用 `IntersectionObserver`（`threshold: 0.1`）监听容器进入视口时再触发 3 个并发请求（summary / top / history page 1）。**在视口外**容器显示骨架屏（见 §4 A11y）
- **错误重试**：任一 API 失败 → 整模块降级为"加载失败"占位（保留 header），下方显示"加载失败 [重试]"按钮（次按钮风格）
- **加载态**：进入视口但未返回数据 → 整模块显示骨架屏（见 §4）
- **隐私开关**（`RatingPrivacyToggle`）位置：标题右侧，距右边缘 12px。仅 `isOwner=true` 时显示

**样式基线**：
- 卡片：`background: var(--color-card); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-sm);`
- 暗色：`body.dark .module-card` 下 `box-shadow` 不变（`AchievementsPanel.css:11-13` 暗色样式参考）
- 移动端（<768px）：`padding: 16px`

---

### 3.2 RatingDimensionAverages（4 维平均卡片）

> 容器内的 **③** 区域。

**桌面 ≥1024px**（4 列横排）：
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 🍴 口味    │ │ 🔥 难度    │ │ 🎨 卖相    │ │ 💰 性价比  │  ← 维度图标 + 中文
│            │ │            │ │            │ │            │
│   4.2      │ │   3.1      │ │   4.5      │ │   3.8      │  ← 大数字 28px
│ ▲ +0.4     │ │ ▼ -0.3     │ │ ▲ +0.6     │ │ ▲ +0.1     │  ← delta 12px
│ 43 次评分  │ │ 42 次评分  │ │ 40 次评分  │ │ 43 次评分  │  ← 元数据 11px
│ ⚠️         │ │            │ │            │ │ ⚠️         │  ← 1-2 条样本角标（可选）
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

**关键交互**：
- 数字 count-up 动画：500ms（沿用 `UserProfilePage.tsx:36` 的 `AnimatedNumber` 组件，duration 改为 500）
- 卡片 hover：`transform: translateY(-2px); box-shadow: var(--shadow-md);`（参考 `RecipeCard.css` 悬浮）
- delta 区域无交互（静态展示）

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中 | 数据未返回 | 4 列骨架卡片（高度 140px），仅显示图标+大数字骨架 |
| 1-2 条样本 | `count < 3` | 右上角 `⚠️` 角标（11px，金黄色 `--color-warning`），悬浮 tooltip "样本较少" |
| 3+ 条样本 | `count >= 3` | 无角标 |
| 4 维均无数据 | 极端边界 | 整卡片淡化（`opacity: 0.5`）+ "暂无数据"文案 |

**样式细节**：
- 卡片：`border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 16px; background: var(--color-card);`
- 数字：`font-size: 28px; font-weight: 700; color: var(--color-text); font-feature-settings: 'tnum';`（启用 tabular-nums 让 count-up 时数字不抖动）
- delta：正差用 `--color-primary`，负差/零用 `--color-text-muted`（**不用红/绿**）
- 4 维卡**不填充维度色块**——4 维色卡仅用于雷达/趋势/分布图表，4 维卡本身保持中性，仅图标暗示（emoji 或 SVG）
- 图标源：用 emoji（`🍴/🔥/🎨/💰`）保持轻量；如要更高一致性可改用 `DIMENSION_LABELS` + 自定义图标

---

### 3.3 RatingRadarSection（雷达图区域）

> 容器内的 **④** 区域。

**桌面**（与 `RatingTrendChart` 左右分栏）：
```
┌── 我的口味画像 ────────────┐
│  ⚠️ 样本不足               │  ← 角标（条件：chartData.length < 3）
│                            │
│       [雷达图 300×300]     │  ← DimensionRadar size=lg
│      (4 维多色填充)         │
│                            │
│  hover 任一顶点：           │
│    ┌─────────────┐         │
│    │ 口味 4.2 分  │         │
│    │ 基于 43 次评分│         │
│    └─────────────┘         │
└────────────────────────────┘
```

**关键交互**：
- 雷达图本身：复用 `DimensionRadar` 并扩展支持 `multiColor` prop（ARCH §7 风险第 7 条，标注为 component-level change）
- hover 顶点 → 浮窗 fade-in（150ms）：显示维度中文 + 平均分 + "基于 N 次评分"
  - 浮窗实现：Recharts 自带 `Tooltip` 不直接支持"按数据点触发"，需用 `onMouseEnter`/`onMouseLeave` 监听 `PolarAngleAxis` 的 tick 元素，配合 portal 到 body 定位
  - 浮窗样式：白底圆角阴影（`box-shadow: var(--shadow-lg); border-radius: 8px; padding: 8px 12px; font-size: 13px;`），与 `RatingTrendChart.tsx:21-26` 的 Tooltip 风格一致
- 点击维度名 → 该维度线隐藏/显示（**P1 F-13**）：在 PR 描述中标注，**MVP 不实现**

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中 | 数据未返回 | 300×300 圆形骨架 + "加载中..." |
| < 3 条样本 | 有效维度数 < 3 | 整区域**不显示雷达图**，替换为"再评 X 条就能看到口味画像"占位（带 `🍴` 图标 + 一句话） |
| 充足 | ≥ 3 维度有效 | 正常雷达图，4 维多色 |
| 全无数据 | 0 评分 | 由父级 `RatingEmptyState` 接管，不进入此组件 |

**样式细节**：
- 4 维多色：每条 `Radar` 单独画（4 个 `<Radar dataKey="taste">` 等等），stroke 与 fill 用对应 `--color-dim-*`
- 容器标题：`font-size: 15px; font-weight: 600; color: var(--color-text); margin-bottom: 12px;`
- 雷达图容器：width/height 固定 300px（`DimensionRadar` size=lg），居中显示

---

### 3.4 RatingTrendSection（趋势图区域）

> 容器内的 **⑤** 区域。

**桌面**（与雷达左右分栏）：
```
┌── 评分趋势 ─────────────[30d|90d|1y|all]─┐
│                                          │
│        [4 线折线图 高 240]               │
│         5.0 ┤                            │
│         4.0 ┤    ●─●                     │  ← taste 橙
│         3.0 ┤  ●─●─●                     │  ← difficulty 绿
│             │                            │  ← presentation 蓝
│             └────月────                  │  ← value 黄
│  ⚠️ 样本不足（< 3 个数据点）             │  ← 角标
└──────────────────────────────────────────┘
```

**关键交互**：
- **时间范围切换器**：右上角分段控件（4 段：30d/90d/1y/all），active 态 `background: var(--color-primary); color: #fff;`（**完全复用** `StatsCharts.css:30-40` 的 `__ranges / __range-btn` 样式）
- hover 折线 → Recharts `Tooltip` 显示该月 4 维数值 + 评分数（tooltip 样式对齐 `StatsCharts.css:21-26`）
- 切换时间范围：触发 summary API 重拉（trend 在 summary 内），其他组件不重拉
- ⚠️ 角标：数据点 < 3 时显示，位置在图表左下角，11px `--color-warning`

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中 | 数据未返回 | 240px 高度骨架 + shimmer 动画 |
| < 3 条样本 | 趋势点数 < 3 | 图表**不显示**，替换为"再评几条就能看到趋势"占位（与雷达的"样本不足"风格统一） |
| 充足 | ≥ 3 点 | 正常 4 线折线图 |
| 0 条 | 0 评分 | 父级空状态接管，不进入此组件 |

**样式细节**：
- 折线图实现：参考 `StatsCharts/RatingTrendChart.tsx` 但扩展为 4 条 `Line`，颜色分别用 `--color-dim-taste / --color-dim-difficulty / --color-dim-presentation / --color-dim-value`
- Y 轴 domain `[1, 5]`，ticks `[1,2,3,4,5]`，与 `RatingTrendChart.tsx:17` 一致
- X 轴：按月聚合显示 `YYYY-MM`，间隔显示（避免拥挤）
- 网格线：`strokeDasharray="3 3"; stroke: var(--color-border);`
- 容器高度：240px（比全站 `StatsCharts` 的 280px 略小，让分栏视觉平衡）

---

### 3.5 RatingDistribution（4 维直方图）

> 容器内的 **⑥** 区域。

**桌面 ≥1024px**（2×2 网格）：
```
┌── 评分分布 ──────────────────────────────────────┐
│                                                   │
│  ┌── 口味分布 ──────┐  ┌── 难度分布 ──────┐        │
│  │ 5 │       ████   │  │ 5 │              │        │
│  │ 4 │   ███ ████   │  │ 4 │ ███          │        │
│  │ 3 │ ███          │  │ 3 │ █████        │        │
│  │ 2 │              │  │ 2 │ ███          │        │
│  │ 1 │              │  │ 1 │ ██           │        │
│  │   └────1─2─3─4─5─┘  │   └────1─2─3─4─5─┘        │
│  └────────────────────┘  └────────────────────┘    │
│  ┌── 卖相分布 ──────┐  ┌── 性价比分布 ────┐        │
│  │ ... (同上)        │  │ ... (同上)        │        │
│  └────────────────────┘  └────────────────────┘    │
└────────────────────────────────────────────────────┘
```

**关键交互**：
- hover 柱子 → 颜色加深（`opacity: 1 → 0.75` 反而是"加深"——实际处理是 `fill: var(--color-dim-*) → filter: brightness(0.85);`）
- hover 柱子 → Recharts `Tooltip` 显示"X 次给了 N 分"
- 4 个直方图**共享**一个 Tooltip 样式（白底圆角阴影）
- **移动端（<768px）**：2×2 改为**横向滚动**（4 个直方图排成一行，`overflow-x: auto`，每个固定宽度 240px）

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中 | 数据未返回 | 4 个骨架（高度 160px） |
| 0 评分 | 0 条评分 | 父级空状态接管 |
| 5-9 条 | 总样本 < 10 | 顶部 ⚠️ 角标 "样本较少"（同 4 维卡逻辑） |

**样式细节**：
- 直方图实现：4 个独立的 `BarChart`，每个 1 条 `Bar`，颜色用对应 `--color-dim-*`
- 柱顶圆角：`radius: [4, 4, 0, 0]`
- X 轴：`dataKey: "score"`，ticks `[1,2,3,4,5]`
- Y 轴：自适应（不固定 domain）
- 网格：底部 1 条 `CartesianGrid horizontal={false}`，仅保留 X 轴基线
- 单个直方图高度 160px（2×2 布局时单图不宜过大）
- 标题：每个子图标题 13px 灰色（`color: var(--color-text-secondary); margin-bottom: 8px;`）

---

### 3.6 RatingTopList（高/低分榜）

> 容器内的 **⑦** 区域。

```
┌── 我的 TOP 5 ──────[高分榜 | 低分榜]────────────────┐
│                                                     │
│  🥇 ┌──┐ 麻婆豆腐（家常版）  T5 D2 P4 V5  4.5      │  ← rank + 封面 + 标题 + 4 维徽标 + overall
│     │封面│ 2026-05-21                            │
│     └──┘                                            │
│  🥈 ┌──┐ ...                                       │
│     │封面│                                          │
│     └──┘                                            │
│  🥉 ... (3-5 名，无奖牌图标)                        │
│  4. ┌──┐ ...                                       │
│  5. ┌──┐ ...                                       │
└─────────────────────────────────────────────────────┘
```

**关键交互**：
- **Tab 切换**："高分榜" / "低分榜"（仅 2 个 Tab，**不区分维度**，与 Q-02 ARCH §8.1 建议一致）
- Tab 样式：与 `StatsCharts.css:42-58` 的 `__tabs / __tab--active` 完全一致（14px / 主色下划线）
- 切换时整个列表 fade-out → fade-in（150ms，对齐 §4 D）
- 整行可点：跳 `/recipes/{recipeId}?from=profile`（与历史列表一致）
- 封面：`80×80px` 圆角 `8px`（**完全复用** `DESIGN_RULES.md §7` RankCard 规格）
- 4 维分徽标：4 个 pill 形小标签横排（"T 5" "D 2" "P 4" "V 5"），文字色用对应 `--color-dim-*`，圆角 9999px，padding `2px 8px`，font-size 11px
- overall 大数字：行右侧 18px 粗体主色
- 奖牌：仅 1-3 名显示 `🥇🥈🥉`，4-5 名显示 `4. 5.` 数字编号
- 行 hover：`background: var(--color-primary-bg); transform: translateX(4px);`（横向轻移，对齐"列表行点击"暗示）

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中 | top API 未返回 | 5 行骨架（高度 96px） |
| 空数据 | 该榜单 0 条（极端：用户 0 评分时由父级接管，正常情况不会出现） | 居中"暂无数据"文字 + `📋` 图标 |
| 切换 Tab | 点击高分/低分 | 当前列表 fade-out（150ms）→ 数据替换 → fade-in（150ms） |

**样式细节**：
- 容器标题：`font-size: 15px; font-weight: 600; margin-bottom: 12px;`
- Tab 容器：右对齐（在 4 维分卡同列），`display: flex; gap: 4px; border-bottom: 1px solid var(--color-border);`
- 列表行：flex row，padding `12px`，border-bottom `1px solid var(--color-border-light)`（最后一行无 border），gap `12px`

---

### 3.7 RatingHistoryList（历史评分列表）

> 容器内的 **⑧** 区域。

```
┌── 我的评分历史 ─────[时间倒序▼ | 评分高 | 评分低]──┐
│                                                    │
│  ┌──┐ 麻婆豆腐（家常版）  T5 D2 P4 V5  ⭐4.5      │
│  │封面│ 2026-05-21 · 花椒香...                    │
│  └──┘                                              │
│  ┌──┐ 番茄炒蛋   T4 D1 P3 V4  ⭐4.0               │
│  │封面│ 2026-05-18                                │
│  └──┘                                              │
│  ... (默认 10 条)                                  │
│                                                    │
│                  [ 查看更多 ▼ ]                    │  ← 仅在 total > 10 时显示
└────────────────────────────────────────────────────┘
```

**关键交互**：
- **整行可点**：跳 `/recipes/{recipeId}?from=profile`（AC-08，URL 参数回溯）
- 排序切换：3 个选项（`时间倒序` / `评分高` / `评分低`），**用下拉菜单**而非 Tab（避免与 TOP 5 视觉冲突；可用 `<select>` 原生或 `ToggleList` 组件）
  - 推荐用 `<select>`：与 `FilterPanel.css` 风格一致
- 排序切换：列表 fade-out → 数据替换 → fade-in（150ms × 2 = 300ms）
- "查看更多"：点击 → 加载下一 10 条 → 新 10 条从下方滑入（200ms stagger，stagger = 20ms/条）
- 加载中：按钮内显示 spinner（沿用 `StatsCharts.css` 的 skeleton 风格），按钮禁用
- 加载完毕：若 `items.length < pageSize` → 按钮消失
- 0 条数据（极端边界）：显示"暂无评分记录"占位

**状态**：

| 状态 | 触发 | 视觉 |
|---|---|---|
| 加载中（首次） | history API 未返回 | 10 行骨架（高度 72px） |
| 加载中（分页） | 查看更多点击后 | 列表底部追加 10 行骨架（仅新条位置，保留原 10 条） |
| 加载错误 | API 失败 | 列表底部"加载失败 [重试]"次按钮（不影响已有 10 条） |
| 0 条 | `total === 0` | 由父级 `RatingEmptyState` 接管，不进入此组件 |
| < 10 条 | `total < pageSize` | 不显示"查看更多"按钮 |
| 已加载全部 | `items.length === total` | "查看更多"按钮消失，可选显示"— 已显示全部 —" 文字（11px 灰色） |

**样式细节**：
- 行布局：与 TOP 5 类似（封面 80×80 + 标题 + 元数据 + 4 维徽标 + 总体分），但**无奖牌**
- 4 维徽标：4 个 pill 排成 1 行在标题下方（不堆叠两行）
- 文字预览：行内显示评论前 30 字（"花椒香..."，单行省略），11px 灰色
- 排序切换控件：右上角 `<select>`，宽度 auto，padding `6px 12px`，圆角 `--radius-sm`
- 间距：行与行 12px（沿用 `DESIGN_RULES.md §9` 排行榜列表项间距）

---

### 3.8 RatingPrivacyToggle（隐私开关）

> 容器内的 **⑧** 区域（实际位置在 module header 右侧）。

```
[📊 我的评分历史                              ] [🔒 仅自己可见 ●─○]
```

**关键交互**：
- 开关样式：iOS 风格 toggle（`width: 44px; height: 24px;` 圆角 9999px，激活态 `background: var(--color-primary)`）
- 点击切换：乐观更新 UI + 调 PUT `/api/users/:userId/ratings/privacy`，失败回滚 + toast 提示
- 仅 `isOwner=true` 时显示（他人访问自己主页不显示）
- 切换为"仅自己可见"后，**他人访问**该用户主页时本模块整体替换为"该用户未公开评分历史"占位

**状态**：
- 仅 2 个状态：公开 / 私有
- 无 loading 显式状态（乐观更新）；失败时 toast 提示"切换失败，请重试"
- 无 empty 状态

**样式细节**：
- 标签文字：`font-size: 12px; color: var(--color-text-secondary);` "仅自己可见" / "公开"
- 开关：圆角 12px 滑块（白圆 + 灰色轨道）
- 暗色模式：轨道 `var(--color-border-dark)`，滑块保持白色
- 不增加 padding（紧凑放 module header 右侧）

---

### 3.9 RatingEmptyState（5 级空状态）

> 整个模块的**替代品**，仅在 `totalRatings === 0` 时显示。**注意**：此组件**不**承接 1-9 条样本场景（那部分由 §3.2 角标 + §3.3/3.4 占位 + §3.1 顶部 banner 共同处理）。

```
0 条评分（全空）：
┌────────────────────────────────────────────────┐
│                                                │
│                  📊 (插画 120×120)              │  ← 用 emoji 或 inline SVG
│                                                │
│          你还没有评过任何菜                     │  ← H3 主文案
│                                                │
│     评分可以帮你记录口味偏好，下次回来          │  ← 副文案 1-2 句
│     就能看到自己的"口味画像"哦                  │
│                                                │
│              [ 去看看 → ]                       │  ← 主按钮（橙底白字）
│              （跳 / 路由）                      │
│                                                │
│     登录用户访问自己：                          │
│     公开用户： 完整模块（不进入空态）           │
│     私有用户： 完整模块（不进入空态）           │
└────────────────────────────────────────────────┘
```

**5 级空状态对应表**（与 PRD §4.4 + ARCH §3.5 对齐）：

| 级别 | 触发 | 子组件显隐 | 顶部 banner | 角标 | 文案 | CTA |
|---|---|---|---|---|---|---|
| **L0 全空** | `totalRatings === 0` | **全部不显示**（包括 4 维卡） | 不显示 | N/A | "你还没有评过任何菜" + 副文案 | 主按钮"去看看" |
| **L1 极少** | `1 ≤ count ≤ 2` | 4 维卡**显示** + ⚠️ 角标；雷达**不显示**（占位）；趋势**不显示**（占位）；分布**不显示**（占位）；TOP 5 取决于实际数据；历史列表显示 1-2 条 | 不显示 | 4 维卡 ⚠️ | 占位文案"再评 X 条就能看到..." | 无（鼓励继续评分） |
| **L2 少** | `3 ≤ count ≤ 4` | 4 维卡 + 雷达**显示**；趋势**不显示**（仍 < 5 条）；分布**不显示**；TOP 5 + 历史正常 | **显示** "样本较少" 提示条 | 分布 ⚠️ | 同上 | 无 |
| **L3 充足** | `5 ≤ count ≤ 9` | **全部显示** | **显示** "样本较少" 提示条 | 分布 ⚠️ | 无 | 无 |
| **L4 丰富** | `count ≥ 10` | **全部显示** | 不显示 | 无 | 无 | 无 |

> **关键决策**：L1/L2 中"不显示"的子区**渲染为占位**（与该子区"样本不足"分支共享占位组件），不直接隐藏（避免页面跳动）。占位高度与该子区正常态一致（雷达 300px / 趋势 240px / 分布 240px）。

**样式细节**：
- 容器：垂直居中（`display: flex; flex-direction: column; align-items: center; justify-content: center;`），高度自适应，最小高度 320px
- 插画：120×120，inline SVG 或 emoji（**不引入新图片资源**）
- 主文案：`font-size: 17px; font-weight: 600; color: var(--color-text); margin: 16px 0 8px;`
- 副文案：`font-size: 14px; color: var(--color-text-secondary); text-align: center; max-width: 360px; margin-bottom: 24px;`
- 主按钮：`background: var(--color-primary); color: #fff; padding: 10px 24px; border-radius: var(--radius-sm);`（**完全复用** `DESIGN_RULES.md §6` 主按钮规格）
- 暗色模式：背景不变（容器透明），仅文字色由 `--color-text` 切到 `--color-text #e0e0e0`

**两个补充占位**（非 0 评分场景）：

**RatingPrivacyGate**（他人访问 + 隐私私有）：
```
┌────────────────────────────────────────────────┐
│              🔒                                │
│         该用户未公开评分历史                    │
│     想看自己的口味画像？登录后即可查看          │
└────────────────────────────────────────────────┘
```

**RatingLoginGate**（未登录访问他人）：
```
┌────────────────────────────────────────────────┐
│              👤                                │
│      登录后查看完整评分历史                     │
│         [ 登录 ] [ 注册 ]                       │
└────────────────────────────────────────────────┘
```

> 三个占位（Empty / Privacy / Login）**视觉风格统一**（居中布局 + emoji 头部 + 一行标题 + 一行副标题 + 可选 CTA），便于用户认知"这是占位区"。

---

## 4. 关键交互流程

### A. 首次进入视口

| 时序 | 状态 | 视觉 |
|---|---|---|
| t=0 | 容器渲染到 DOM，但未进入视口 | 显示整模块骨架屏（见 §A11y） |
| t=0~N | 滚动 → 容器进入视口（`IntersectionObserver` 触发） | 触发 3 个并发请求（summary + top + history page 1） |
| t=N+300ms | 数据返回 | 骨架屏淡出（`opacity: 1 → 0`，200ms），真实内容淡入（`opacity: 0 → 1`，300ms `ease-out-soft`） |
| 失败 | 任一 API 失败 | 整模块降级为"加载失败"占位（保留 header），主按钮"重试" |

**骨架屏细节**：
- 整模块骨架：`background: linear-gradient(90deg, var(--color-skeleton-from) 25%, var(--color-skeleton-to) 50%, var(--color-skeleton-from) 75%); background-size: 200% 100%; animation: shimmer 1.6s infinite;`
- 子组件骨架形状：
  - 4 维卡骨架：4 个 140px 高的圆角矩形横排
  - 雷达骨架：300×300 圆形（`border-radius: 50%`）
  - 趋势骨架：240px 高的圆角矩形
  - 分布骨架：2×2 个 160px 高的圆角矩形
  - 列表骨架：5-10 个 72px 高的圆角矩形，gap 12px

### B. 数字 count-up 动画

- 仅 4 维平均分卡片的"大数字"和总评分次数（副标题）做 count-up
- 沿用 `UserProfilePage.tsx:36-67` 的 `AnimatedNumber` 组件
- `duration: 500ms`（PRD 7.4 要求）
- `ease-out` 缓动（`progress * (2 - progress)`，与现有实现一致）
- 字体启用 `font-feature-settings: 'tnum'`（等宽数字），避免 count-up 时数字宽度抖动
- 触发：进入视口时（IntersectionObserver），与骨架屏淡入**同步**触发

### C. 列表"查看更多"加载

- 点击 → 按钮内显示 spinner（16px 圆形）+ 文字变为"加载中..."
- 同时调 `getUserRatingHistory(page+1)`
- 新 10 条返回后：
  - 新条目从下方滑入：`opacity: 0 → 1, transform: translateY(8px) → translateY(0)`，每条 stagger 20ms，**总计 200ms 内完成**
  - 按钮：若 `items.length >= total` → 按钮淡出（200ms）后 `display: none`；否则按钮恢复
- 失败：按钮恢复，列表底部追加"加载失败 [重试]"次按钮（不影响已有数据）

### D. 排序切换

- 点击排序下拉 → 选新值
- 列表 fade-out：`opacity: 1 → 0, height: auto → auto`（150ms）—— 仅淡出内容区，不动高度避免抖动
- 触发新 API 请求
- 数据返回 → fade-in：`opacity: 0 → 1`（150ms）

### E. 雷达图 hover 浮窗

- mouse enter `PolarAngleAxis` 的 tick（"口味"/"难度" 等）→ 浮窗 fade-in（150ms）
- 浮窗内容：`维度名 + 平均分（1 位小数）+ "基于 N 次评分"`
- mouse leave → 浮窗 fade-out（100ms）
- 浮窗位置：tick 元素正上方 8px 偏移，`transform: translate(-50%, -100%);`
- 浮窗样式：白底 / 8px 圆角 / shadow-lg / 8px 12px padding / 13px 字号
- 移动端：tap 替代 hover（单击 → 显示浮窗，再单击其他位置关闭）

### F. 隐私切换

- 点击 toggle → 乐观更新 UI（开关立即移动）
- 调 PUT `/api/users/:userId/ratings/privacy`
- 失败：UI 回滚 + toast "切换失败，请重试"
- 成功：UI 保持 + 主动失效本地缓存
- 切到"私有"后，本人**仍可见完整模块**（ARCH §3.5 矩阵）

---

## 5. 响应式

| 断点 | 4 维平均卡 | 雷达 + 趋势 | 分布 | 列表（TOP + 历史） | 模块 padding |
|---|---|---|---|---|---|
| **≥1024px** | 4 列横排（`grid-template-columns: repeat(4, 1fr); gap: 12px;`） | 左右分栏（`display: grid; grid-template-columns: 1fr 1fr; gap: 20px;`） | 2×2 网格 | 单列（每行横排，封面 + 信息横排） | 24px |
| **768-1023px** | 2×2 网格（`grid-template-columns: repeat(2, 1fr); gap: 16px;`） | 单列堆叠（雷达在上，趋势在下，各占满宽） | 2×2 网格 | 单列 | 20px |
| **<768px** | 单列（`grid-template-columns: 1fr; gap: 12px;`） | 单列堆叠 | **横向滚动**（`overflow-x: auto; display: flex; gap: 12px;`，每个直方图固定宽 240px） | 单列（封面 60×60，缩窄行内 padding） | 16px |

**补充规则**：
- <480px：4 维卡的"delta"标识与"评分数"在同一行（默认是两行，缩小屏合并以减少垂直高度）
- 雷达图在 <768px 时尺寸从 300 缩到 240（`DimensionRadar` size=md）
- 趋势图 X 轴在 <768px 时仅显示每 2 月一个 tick（避免拥挤）
- 排序下拉在 <768px 时**保持下拉**（不强制改为按钮组，与移动端 FilterPanel 风格一致）
- "查看更多"按钮：移动端宽度撑满（`width: 100%;`）

**实现提示**（给前端编码者，非强制）：
- 桌面/平板断点用 `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` 可减少媒体查询
- 但**不推荐**用 auto-fit（PRD 明确要 4 列 → 2×2 → 1 列的硬切换），用媒体查询更可控

---

## 6. 可访问性（A11y）

### 6.1 图表 aria-label

每个图表必须有 `aria-label` 描述数据内容（**不**只标"雷达图"）：

- **雷达图**：`aria-label="雷达图：用户口味画像。口味 4.2 分（基于 43 次评分），难度 3.1 分（基于 42 次），卖相 4.5 分（基于 40 次），性价比 3.8 分（基于 43 次）。"`
- **趋势图**：`aria-label="折线图：近 1 年 4 维度评分趋势。taste 4.1→4.3，difficulty 3.0→3.2，..."` （自动生成）
- **分布图（每个子图）**：`aria-label="直方图：口味维度评分分布。1 分 0 次，2 分 1 次，3 分 5 次，4 分 18 次，5 分 19 次。"`
- **TOP 5 列表**：`aria-label="高分榜：5 道菜。"`（具体内容由列表项自身 `<li>` 提供）
- **历史列表**：`aria-label="历史评分列表：第 N 页，共 10 条。"`

### 6.2 键盘导航

- **列表项**（TOP 5 / 历史）：用 `<a>` 而非 `<div onClick>`，天然支持 Tab + Enter
- **Tab 切换**（TOP 5 高/低分榜 / 排序）：用 `<button role="tab" aria-selected="true|false">`，左右方向键切换（参考 WAI-ARIA tab pattern）
- **隐私开关**：用 `<button role="switch" aria-checked="true|false">`，Space/Enter 切换
- **图表**：不强制支持键盘交互（数据可视化本身就是视觉为主），但**周围容器**（Tab 切换、排序切换、查看更多）必须可 Tab 到达
- **跳过链接**：在 module 顶部加 `Skip to module content` 链接（参考 `SkipLink.css` 已有模式）

### 6.3 颜色对比度

- 关键文字：`--color-text` on `--color-card` → 12.6:1（浅）/ 11.4:1（暗）→ **远超 4.5:1**
- delta ▲▼：用主色（橙）/ 中性灰，对比度均 ≥ 3:1（**非关键文字，仅作辅助标识，符合 WAI 装饰豁免**）
- ⚠️ 角标：`--color-warning` on `--color-card` → 浅色 2.4:1（**不达标**）—— 解决方案：角标配 **`aria-label="样本较少"`** + 文字"⚠️" 字符（11px 已可读，1.4 行高），让屏幕阅读器宣读文字而非依赖颜色识别

### 6.4 暗色模式

- 暗色模式下 `--color-text #e0e0e0` on `--color-card #222` → 11.4:1 ✅
- 4 维色卡在暗色下提亮 20%（如 `#e8663e → #f59e6e`），保证暗色背景上的视觉对比
- 图表 `Tooltip` 在暗色模式下：`background: var(--color-chart-tooltip-bg) #2d2d2d; color: #fff;`（已有变量，**复用**）
- 暗色模式下图片/封面：`filter: brightness(0.9);`（沿用 `DESIGN_RULES.md §12`）

### 6.5 prefers-reduced-motion

- 检测 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → 关闭 count-up / 滑入动画，直接显示终态
- 骨架屏 shimmer 动画保留（属于"功能可见性"动画，非装饰）

---

## 7. CSS 变量扩展建议

### 7.1 新增变量（仅本模块新增，全部在 `:root` 与 `body.dark` 两套定义）

> 命名规范：遵循 `DESIGN_RULES.md §10-6` "同含义单变量" 原则；本规范不引入 `--color-dim-taste-bg` 之类的派生变量（需要时用 `color-mix()`）。

| 变量 | 浅色 | 暗色 | 用途 |
|---|---|---|---|
| `--color-dim-taste` | `#e8663e` | `#f59e6e` | 4 维色卡：口味 |
| `--color-dim-difficulty` | `#52c41a` | `#7ed957` | 4 维色卡：难度 |
| `--color-dim-presentation` | `#1890ff` | `#5ab0ff` | 4 维色卡：卖相 |
| `--color-dim-value` | `#faad14` | `#ffc857` | 4 维色卡：性价比 |
| `--color-delta-positive` | `#e8663e` | `#f0946e` | delta ▲ 正差文字色（**与主色一致**） |
| `--color-delta-negative` | `#999999` | `#888888` | delta ▼ 负差文字色（中性灰，**不**用红） |
| `--color-delta-zero` | `#999999` | `#888888` | delta = 0 文字色 |
| `--color-sample-warning-bg` | `#fff7e6` | `#3a2e1a` | "样本较少" 提示条背景 |
| `--color-sample-warning-text` | `#ad6800` | `#ffc857` | "样本较少" 提示条文字 |
| `--color-gate-bg` | `#f5f0eb` | `#2a2520` | 三个占位（Empty / Privacy / Login）背景 |

### 7.2 复用现有变量（**不新增**，仅引用）

- 主色：`--color-primary` / `--color-primary-hover` / `--color-primary-bg`
- 文字：`--color-text` / `--color-text-secondary` / `--color-text-muted`
- 背景：`--color-bg` / `--color-bg-secondary` / `--color-card`
- 边框：`--color-border` / `--color-border-light`
- 状态：`--color-success` / `--color-warning` / `--color-error`
- 阴影：`--shadow-sm` / `--shadow-md` / `--shadow-lg`
- 圆角：`--radius-sm` / `--radius-md` / `--radius-lg` / `9999px`（pill）
- 间距：4 / 8 / 12 / 16 / 20 / 24 / 32 px（**用 px，不用变量**——DESIGN_RULES.md §3 未定义间距变量）
- 动画：`--ease-out-soft` / `--ease-out-back` / `--duration-fast 0.2s` / `--duration-normal 0.3s` / `--duration-slow 0.5s`
- 骨架屏：`--color-skeleton-from` / `--color-skeleton-to`
- Tooltip：`--color-chart-tooltip-bg` / `--color-chart-tooltip-text`

### 7.3 不引入的变量

- **不**为每个 4 维度单独定义背景色（用 `color-mix(in srgb, var(--color-dim-*) 10%, transparent)` 现算）
- **不**为每种断点定义 padding 变量（用媒体查询硬切换）
- **不**为组件内每个 padding/gap 定义变量（避免变量爆炸）

---

## 8. 估算的工作量参考

> 供前端 fullstack 专家编码时排期。**只估 CSS + 组件骨架行数**，不含业务逻辑/数据请求/测试。

| 组件 | CSS 行数 | TSX 行数 | 备注 |
|---|---|---|---|
| RatingHistoryModule（容器 + Header + SampleBanner） | 200 | 180 | 包含卡片基线、media query、3 个 gate 分支、lazy mount |
| RatingDimensionAverages | 180 | 120 | 4 维卡 + count-up + 角标 + 5 种状态 |
| RatingRadarSection（含 Tooltip） | 120 | 90 | 薄包装 DimensionRadar + portal tooltip |
| RatingTrendSection | 140 | 100 | 4 线 LineChart + 时间切换器 + 角标 |
| RatingDistribution | 160 | 90 | 4 个 BarChart + 横向滚动 |
| RatingTopList | 140 | 100 | Tab 切换 + 列表行 + 奖牌 |
| RatingHistoryList | 200 | 160 | 行渲染 + 排序下拉 + 查看更多 + 加载态 |
| RatingPrivacyToggle | 60 | 40 | 开关组件 |
| RatingEmptyState（含 Privacy/Login Gate） | 180 | 120 | 3 个占位共享布局 + 5 级分支 |
| **新增 CSS 变量** | 30 | 0 | 11 个新变量（:root + body.dark） |
| **DimensionRadar 扩展（multiColor prop）** | 40 | 30 | ARCH §7 风险第 7 条同步项 |
| **总计（不含全局变量与 DimensionRadar 扩展）** | **1380** | **1000** | |
| **总计（含扩展）** | **1450** | **1030** | |

**工作量小计**：约 **1450 行 CSS + 1030 行 TSX ≈ 2480 行**（与 ARCH §6.2 排期"Day 4-5 前端 UI" 2 人天吻合）。

---

## 9. 设计决策摘要

> 编码前 PM / 前端 leader 必读。

1. **4 维色卡首次正式定义**：本规范借本迭代同步补齐 `DimensionRadar` 的多色支持（ARCH §7 风险第 7 条的 component-level change），新增 4 个 `--color-dim-*` 变量。后续所有维度相关组件（评分详情、统计、推荐解释）统一引用。
2. **delta 故意不用红/绿**：负差用中性灰而非红色，传达"个人口味偏好是中性事实"的产品价值观（PRD 7.2 原文）。
3. **不嵌套卡片**：模块内 5 个子区（雷达/趋势/分布/TOP/历史）不各自再嵌一层卡片，直接用 `margin-bottom: 24px` + H3 标题分隔——与 `StatsCharts` / `AchievementsPanel` 风格一致，避免视觉割裂。
4. **5 级空状态由"父级+子级"共同承担**：0 条评分由 `RatingEmptyState` 替代整模块；1-9 条样本通过"子组件不显示 + 顶部 banner + ⚠️ 角标"组合表达，不渲染独立的"L1 极少"占位组件。
5. **滚动行为统一为整页滚动**：模块不开启独立滚动，**不**做"内部 virtual scroll"——历史列表最多 10-20 条/页，无需虚拟化。

---

## 10. 待 UI 决策事项

> 评审会上需 PM / UX 确认。

| 编号 | 事项 | 建议 |
|---|---|---|
| UI-Q-01 | 4 维平均卡是否用维度色块做强调（顶部 4px 彩色 border） | **建议不加**——保持卡片中性，让色彩集中在图表 |
| UI-Q-02 | 维度偏好标签（P1 F-16）"你是个对颜值要求很高的食客" 文案放在哪里 | **建议放 module header 副标题**（"已评 47 道 · 共 92 次 · 你是个对颜值要求很高的食客"） |
| UI-Q-03 | "查看更多" 加载完毕后是否显示"— 已显示全部 —" | **建议显示**（11px 灰色），给用户明确终止感 |
| UI-Q-04 | 移动端排序切换用 `<select>` 还是按钮组 | **建议 `<select>`**（节省空间、与 FilterPanel 一致） |
| UI-Q-05 | 雷达图 hover 浮窗在移动端用 tap 还是长按 | **建议 tap**（再次 tap 关闭，符合移动端习惯） |
| UI-Q-06 | 模块标题图标用 emoji 还是 inline SVG | **建议 emoji**（不引入新资源，跨平台稳定） |
| UI-Q-07 | DimensionRadar 的多色改造是否本期一并做（PR 跨组件） | **建议本期做**（ARCH §7 风险第 7 条已标注为 component-level change，避免后续 PR 被卡 review） |

---

## 11. 评审签字

| 角色 | 姓名 | 签字 | 日期 |
|---|---|---|---|
| 产品 |  |  |  |
| 设计 |  |  |  |
| 前端 |  |  |  |
| QA |  |  |  |

---

*文档结束*
