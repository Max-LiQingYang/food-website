# PRD：UserProfilePage 深度数据可视化增强

**项目**: food-website (React 18 + Express + MachiDB)  
**基线文件**: `frontend/src/pages/UserProfilePage.tsx` (753 行) + `UserProfilePage.css`  
**版本**: v1.0 | **日期**: 2026-06-11 | **作者**: 产品专家 Agent

---

## 目录

1. [背景与目标](#1-背景与目标)
2. [当前基线摘要](#2-当前基线摘要)
3. [数据流图](#3-数据流图)
4. [增强方案](#4-增强方案)
   - [P0-1：统计数据可视化增强](#p0-1-统计数据可视化增强)
   - [P0-2：成就系统深化](#p0-2-成就系统深化)
   - [P1-3：烹饪日志活动时间线](#p1-3-烹饪日志活动时间线)
   - [P1-4：用户技能雷达图](#p1-4-用户技能雷达图)
   - [P2-5：暗色模式全覆盖](#p2-5-暗色模式全覆盖)
   - [P2-6：移动端响应式深化](#p2-6-移动端响应式深化)
5. [工作量估算总表](#5-工作量估算总表)
6. [技术约束与风险](#6-技术约束与风险)
7. [附录：新 API 接口设计汇总](#7-附录新-api-接口设计汇总)

---

## 1. 背景与目标

### 业务背景
当前用户个人主页（UserProfilePage）已具备基础的统计展示（5 卡片 + CountUp 动画）、成就徽章墙、作者等级进度条、烹饪热力图和多 Tab 内容浏览。但存在以下体验缺口：

- 📊 **数据过于静态**：只有"当前值"，缺少趋势和时间维度，用户无法感知成长
- 🏅 **成就系统浅尝辄止**：仅展示前 12 个已解锁徽章，无分类、无全部视图、无解锁动效
- 📜 **缺少活动叙事**：用户的历史烹饪行为不可追溯，无法形成「烹饪足迹」的故事感
- 🧭 **技能画像缺失**：用户不知道自己偏好的菜系/口味，缺少个性化洞察
- 🎨 **暗色模式不全**：UserProfilePage 虽有部分 `body.dark` 样式，但未覆盖全部 UI 元素
- 📱 **移动端体验粗放**：480px 断点下仅做了基础栅格适配，缺少触屏交互优化

### 目标
1. **数据可感知** — 用户能「看到自己的进步」，收藏趋势、烹饪频率一目了然
2. **成就可追求** — 完整成就体系，分类筛选，进度可视化，解锁有爽感
3. **行为可追溯** — 烹饪日志转化为时间线叙事
4. **偏好可量化** — 雷达图呈现用户口味/菜系偏好画像
5. **全端适配** — 暗色模式无死角 + 移动端深度优化

---

## 2. 当前基线摘要

### 前端 `UserProfilePage.tsx`（753 行）

| 模块 | 现状 |
|------|------|
| 个人信息 | 头像/昵称/@username/加入时间 |
| 统计卡片 | 5 卡片（食谱/收藏/评论/粉丝/关注）+ CountUp 动画 + IntersectionObserver 懒触发 |
| 作者等级 | AuthorLevelBadge 进度条（Lv.1-5），含分数/下一级提示 |
| 成就徽章 | 前 12 个已解锁徽章网格，点击弹出 AchievementDetailModal |
| 活动热力图 | ActivityHeatmap 组件（userId prop），30 天 GitHub 风格热力 |
| Tab 内容 | 5 个 Tab：发布/收藏/收藏夹/我做過/足迹/改编（后 3 个仅本人可见） |
| 交互 | 收藏备注弹窗、编辑资料弹窗、分页加载、骨架屏 |
| 响应式 | 3 断点（1024+ / 768px / 480px），grid 列数自适应 |

### 后端 API（现有）

| 端点 | 方法 | 返回 | 用途 |
|------|------|------|------|
| `GET /users/:id/stats` | 统计查询 | `{ recipeCount, favoriteCount, commentCount, followersCount, followingCount }` | 5 卡片数据 |
| `GET /users/:id/author-info` | 等级计算 | `AuthorLevelInfo { level, title, icon, score, nextLevelScore, progress, isMaxLevel }` | 等级条 |
| `GET /achievements/user/:userId` | 成就查询 | `AchievementItem[]`（unlocked/progress/maxProgress/icon/title/description/category） | 徽章墙 |
| `GET /users/:id/cooked-recipes` | 分页查询 | `{ list: CookedRecipeItem[], total }` | "我做過" Tab |
| `GET /users/:id/activity-heatmap` | 聚合查询 | `{ daily: ActivityHeatmapDay[], maxTotal }` | 热力图组件 |
| `GET /cooking-logs` | 分页查询 | `{ list: CookingLog[], total }` | 烹饪日志列表 |
| `GET /cooking-logs/stats` | 聚合统计 | `{ totalCooked, byCategory, byMonth, avgRating }` | 个人烹饪概览 |

### 关键数据模型

**CookingLog** (`cooking_logs` 表)：
```
id, userId, recipeId, recipeTitle, recipeCategory, cookedAt (DATEONLY),
rating (1-5), notes (TEXT), duration (INT/min), photoUrl, createdAt, updatedAt
```

**Recipe** (`recipes` 表)：
```
categoryTags (JSON): { ingredient, method, cuisine, flavor, price }
```

**Achievement** (`achievements` 表)：
```
id, userId, type, title, description, icon, unlockedAt
```

---

## 3. 数据流图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UserProfilePage                              │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │ 统计卡片区    │   │ 图表面板 (新增)   │   │ 成就系统 (深化)   │  │
│  │              │   │                  │   │                   │  │
│  │ CountUp + 5  │   │ · 收藏趋势折线   │   │ · 全成就列表      │  │
│  │ cards        │   │ · 烹饪频率柱状   │   │ · 分类筛选        │  │
│  │              │   │ · 月度评分曲线   │   │ · 进度可视化      │  │
│  │              │   │                  │   │ · 解锁动画        │  │
│  └──────┬───────┘   └────────┬─────────┘   └────────┬──────────┘  │
│         │                    │                       │              │
│  ┌──────┴────────────────────┴───────────────────────┴──────────┐  │
│  │                     API 层 (apiClient)                        │  │
│  │                                                               │  │
│  │  getUserStats()   getStatsTrends()  getUserAchievements()    │  │
│  │  getAuthorInfo()  getSkillProfile() getActivityTimeline()    │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────┴───────────────────────────────────┐  │
│  │                   Express 后端路由                             │  │
│  │                                                               │  │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐  │  │
│  │  │ users.js        │ │ achievement.js  │ │ cookingLog.js  │  │  │
│  │  │ (新增路由)      │ │ (增强查询)      │ │ (增强查询)     │  │  │
│  │  │                 │ │                 │ │                │  │  │
│  │  │ /:id/stats-     │ │ /user/:id/      │ │ /user/:id/     │  │  │
│  │  │ trends          │ │ grouped         │ │ timeline       │  │  │
│  │  │ /:id/skill-     │ │                 │ │                │  │  │
│  │  │ profile         │ │                 │ │                │  │  │
│  │  └────────┬────────┘ └────────┬────────┘ └────────┬───────┘  │  │
│  └───────────┼──────────────────┼───────────────────┼───────────┘  │
│              │                  │                   │               │
│  ┌───────────┴──────────────────┴───────────────────┴───────────┐  │
│  │                    MachiDB / Sequelize                        │  │
│  │                                                               │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │  │
│  │  │ recipes   │  │ cooking_  │  │ achieve-  │  │ favorites │ │  │
│  │  │           │  │ logs      │  │ ments     │  │           │ │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**数据流说明**：

1. **现有数据流**（绿色路径）：UserProfilePage → `getUserStats` / `getAuthorInfo` / `getUserAchievements` → 后端聚合 → DB 查询 → 返回渲染
2. **新增趋势流**（蓝色路径）：UserProfilePage → `getStatsTrends(userId, days)` → 后端按天聚合 favorite 创建时间、cooking_logs cookedAt → 返回 `TrendPoint[]` → Recharts 渲染
3. **新增技能分析流**（橙色路径）：UserProfilePage → `getSkillProfile(userId)` → 后端 JOIN cooking_logs + recipes（通过 categoryTags.cuisine/flavor 字段）→ 聚合统计 → 返回 `SkillRadarData` → Recharts RadarChart 渲染
4. **新增时间线流**（紫色路径）：UserProfilePage → `getActivityTimeline(userId, limit)` → 后端按 `cookedAt DESC` 查询 cooking_logs + JOIN recipe → 返回 `TimelineEvent[]`
5. **深化成就流**：前端本地 groupBy category + 后端增强查询 → 全成就墙 + 分类筛选

---

## 4. 增强方案

### P0-1：统计数据可视化增强

**目标**：在现有 5 统计卡片下方增加交互式图表面板，让用户看到数据的时间维度变化。

#### 功能设计

**图表面板**（Collapsible section，默认展开）：
- 标题：`📊 数据趋势`
- 3 个子 Tab（复用现有 Tab 风格）：
  1. **收藏增长** — 面积图/折线图：每日新增收藏数 + 累计收藏数（双 Y 轴）
  2. **烹饪频率** — 柱状图：按周/月聚合的烹饪次数
  3. **评分变化** — 折线图：每次烹饪的评分走势（1-5 分）

**交互**：
- Tooltip 悬停显示详细数值
- 支持时间范围切换：近 30 天 / 近 90 天 / 近 365 天
- 响应式：移动端图表宽度自适应，图例简化

#### 新增 API

**`GET /api/users/:id/stats-trends?days=30`**

```typescript
// 响应
interface StatsTrendsResponse {
  userId: string
  days: number
  // 每日收藏趋势
  favorites: Array<{
    date: string          // "2026-06-01"
    dailyNew: number      // 当日新增收藏数
    cumulative: number    // 累计收藏数
  }>
  // 烹饪频率（按天聚合）
  cooking: Array<{
    date: string          // "2026-06-01"
    count: number         // 当日烹饪次数
    avgRating: number     // 当日平均评分（可选）
  }>
}
```

**实现要点**：
- 后端查询 `favorites` 表按 `createdAt` 每天 GROUP BY
- 后端查询 `cooking_logs` 表按 `cookedAt` 每天 GROUP BY
- 按 `days` 参数限制日期范围
- 前端使用 Recharts `<AreaChart>` / `<BarChart>` / `<LineChart>`

#### 前端组件拆分

```
frontend/src/
├── pages/
│   └── UserProfilePage.tsx          ← 引入 StatsCharts 面板
├── components/
│   └── StatsCharts/
│       ├── StatsCharts.tsx          ← 面板容器（Tab 切换 + 图表区域）
│       ├── StatsCharts.css
│       ├── FavoritesTrendChart.tsx   ← 收藏趋势面积图
│       ├── CookingFrequencyChart.tsx ← 烹饪频率柱状图
│       └── RatingTrendChart.tsx      ← 评分走势折线图
```

#### 工作量估算
- 后端路由：2h（SQL 聚合查询 + 路由注册）
- 前端 API 层：0.5h（新增 `getStatsTrends` 函数）
- 图表组件开发：4h（3 个 Recharts 图表 + Tab 容器）
- CSS 样式：1h
- **合计：7.5h**

---

### P0-2：成就系统深化

**目标**：从"12 个徽章预览"升级为全功能成就系统，增加分类筛选、进度可视化、解锁动画。

#### 功能设计

**成就面板重构**：
- 标题区：`🏅 成就 · 已解锁 X / Y 项` + 进度百分比
- **分类筛选栏**（Pill 按钮）：
  - 全部 | 发布者(publisher) | 收藏家(collector) | 评论家(commenter) | 厨神(cook) | 探索家(explorer) | 社交达人(social)
  - 每个 Pill 显示该分类已解锁/总数
- **成就网格**：展示所有成就（不再只显示已解锁的前 12 个）
  - 已解锁：彩色 + Glow 动画
  - 未解锁：灰度 + 显示进度条（progress / maxProgress）
  - 点击弹出 AchievementDetailModal（已有）
- **全局进度环**：面板顶部显示环形进度图（已解锁 / 总成就数）
- **解锁动画**：
  - 页面加载时，已解锁徽章依次弹出（stagger animation，间隔 80ms）
  - 使用 CSS `@keyframes` + `animation-delay` 实现

**成就数据增强**（不修改 DB schema）：
- 在后端路由中维护**全量成就定义**（hardcoded 常量），含默认 progress/maxProgress
- 查询用户已有成就 → 与定义合并 → 返回「完整成就列表」
- 新增 `GET /api/achievements/user/:userId/grouped` 接口

#### 新增 API

**`GET /api/achievements/user/:userId/grouped`**

```typescript
interface AchievementsGroupedResponse {
  userId: string
  totalCount: number
  unlockedCount: number
  categories: Array<{
    key: string           // "publisher" | "collector" | "commenter" | "cook" | "explorer" | "social"
    label: string         // "发布者"
    color: string         // "#e8663e"
    total: number
    unlocked: number
    achievements: AchievementItem[]
  }>
}
```

**实现要点**：
- 后端维护 `ALL_ACHIEVEMENTS` 常量（约 30+ 条定义），每条定义 category/type/title/description/icon/maxProgress
- 查询 `achievements` 表用户已有记录 → 按 type 做 left-join → 补全 progress（从用户行为数据实时计算）
- 对于未解锁成就：progress 由后端实时聚合（如收藏类：count(favorites)；发布类：count(recipes WHERE authorId=userId)）

#### 前端组件拆分

```
frontend/src/components/Achievements/
├── AchievementsPanel.tsx        ← 面板容器（分类筛选 + 网格 + 进度环）
├── AchievementsPanel.css
├── AchievementCategoryPills.tsx ← 分类筛选 Pill 按钮组
├── AchievementGrid.tsx          ← 成就网格（替代页面内嵌的 achievement-badge 列表）
├── AchievementProgressRing.tsx  ← 环形进度图（CSS/SVG 实现，不依赖 Recharts）
└── AchievementUnlockAnimation.tsx ← 解锁 stagger 动画包装器
```

#### 工作量估算
- 后端路由增强：3h（全量成就定义 + grouped 接口 + 进度实时计算）
- 前端 API 层：0.5h
- 成就面板组件：5h（ProgressRing + 分类 Pills + 全量网格）
- 动画实现：2h（stagger entrance + unlock sparkle 粒子效果）
- CSS：1.5h
- **合计：12h**

---

### P1-3：烹饪日志活动时间线

**目标**：在个人主页中增加"最近活动"时间线，将用户的 cookingLogs 数据转化为可视化叙事。

#### 功能设计

**时间线面板**（位于统计卡片下方、热力图上方）：
- 标题：`🔥 烹饪动态`
- 垂直时间线布局，最新的在最上方
- 每一条事件显示：
  - 📅 日期（相对时间："3 天前" / "昨天" / 绝对日期）
  - 🍳 食谱名称（可点击跳转）
  - ⭐ 评分（1-5 星）
  - 📝 笔记摘要（前 50 字，可展开）
  - 📷 照片缩略图（如有 photoUrl）
  - 🕐 烹饪时长（如有 duration）
- 默认显示最近 10 条，底部"加载更多"按钮
- **骨架屏占位**：加载时显示 3 条时间线骨架

#### API 复用

**无需新增后端路由**，复用现有 `GET /cooking-logs?page=1&pageSize=10`：
- 添加 `userId` 参数过滤（如现有接口不支持，则增强现有路由）
- 检查现有接口：`getCookingLogs({ page, pageSize, recipeId })` — 当前缺少 `userId` 参数

**需轻量增强**现有 `GET /cooking-logs` 路由：
- 支持 `?userId=xxx` 查询参数（公开查询，不要求鉴权）
- 响应顺序：`ORDER BY cookedAt DESC`

#### 前端组件拆分

```
frontend/src/components/
├── ActivityTimeline/
│   ├── ActivityTimeline.tsx      ← 时间线容器组件
│   ├── ActivityTimeline.css
│   ├── TimelineEvent.tsx         ← 单条事件行（日期 + 食谱 + 评分 + 笔记 + 照片）
│   ├── TimelineSkeleton.tsx      ← 骨架屏
```

#### 工作量估算
- 后端路由增强：1h（给 cooking-logs 加 userId 查询参数）
- 前端 API 层：0h（复用 `getCookingLogs`）
- 时间线组件：3h
- CSS：1h
- **合计：5h**

---

### P1-4：用户技能雷达图

**目标**：基于用户烹饪日志中的 recipeCategory 和关联 Recipe 的 categoryTags，生成多维度技能画像。

#### 功能设计

**技能雷达图面板**（位于成就面板下方）：
- 标题：`🧭 烹饪技能画像`
- Recharts `<RadarChart>` 六边形雷达图
- 6 个维度：
  1. **中式烹饪** — 基于 category='chinese' 或 categoryTags.cuisine='中式'
  2. **西式料理** — 基于 category='western' 或 categoryTags.cuisine='西式'
  3. **甜点烘焙** — 基于 category='dessert'
  4. **日韩料理** — 基于 category IN ('japanese', 'korean')
  5. **辛辣口味** — 基于 categoryTags.flavor 含 '辣'
  6. **清淡口味** — 基于 categoryTags.flavor 含 '清淡/鲜'
- 每个维度数值 = 该类别下用户烹饪次数（ceil 归一化到 0-100）
- Tooltip 悬停显示具体次数
- 配色：半透明渐变填充 + 描边
- **无数据状态**：烹饪日志 < 3 条时展示占位图 + `📝 多记录一些烹饪日志，就会生成你的专属技能画像哦～`

#### 新增 API

**`GET /api/users/:id/skill-profile`**

```typescript
interface SkillProfileResponse {
  userId: string
  totalCooked: number
  dimensions: Array<{
    name: string       // "中式烹饪"
    value: number      // 0-100 归一化值
    rawCount: number   // 原始烹饪次数
  }>
}
```

**实现要点**：
- 后端查询 cooking_logs JOIN recipes ON recipeId（利用 category 字段 + categoryTags JSON）
- 聚合计算每个维度的 count
- 归一化：`value = Math.min(100, Math.round((rawCount / maxRawCount) * 100))`
- 不修改 DB schema

#### 前端组件拆分

```
frontend/src/components/
├── SkillRadar/
│   ├── SkillRadar.tsx            ← 雷达图容器
│   ├── SkillRadar.css
│   └── SkillRadarEmpty.tsx       ← 空数据占位
```

#### 工作量估算
- 后端路由：3h（JOIN 查询 + 维度聚合 + 归一化）
- 前端 API 层：0.5h
- 雷达图组件：2h（Recharts RadarChart 配置）
- CSS：0.5h
- **合计：6h**

---

### P2-5：暗色模式全覆盖

**目标**：补齐 UserProfilePage 中所有未适配暗色模式的 UI 元素。

#### 现状分析

已覆盖的暗色模式样式（来自 CSS 文件 grep）：
- ✅ `.profile-stats__card` → `background: var(--color-card-dark)`
- ✅ `.profile-tabs` → `border-bottom-color: var(--color-border-dark)`
- ✅ `.profile-tab` → `color: var(--color-text-secondary-dark)`
- ✅ `.profile-level` → `background: var(--color-card-dark)`
- ✅ `.collection-card` → 已适配 dark
- ✅ `.modal-content` → 已适配 dark
- ✅ `.achievement-badge` → 已适配 dark
- ✅ `.user-note-preview` → 已适配 dark
- ✅ `.form-input` / `.form-label` → 已适配 dark

**未覆盖**（需补齐）：
- ❌ `.profile-header` — 无 dark 样式（正常，文本用 CSS variables）
- ❌ `.profile-empty__text` — 硬编码 `color: #999`，应改用变量
- ❌ `.profile-notfound` — 硬编码颜色
- ❌ `.profile-pagination` — `.pagination-btn` 硬编码 `background: #fff`、`color: #333`
- ❌ `.collection-card__cover` — 硬编码 `background: linear-gradient(135deg, #f5a885, #e8663e)`（渐变可保留，但需确认暗色下可读性）
- ❌ StatsCharts 新增组件（P0-1）— 需全新适配
- ❌ AchievementsPanel 新增组件（P0-2）— 需全新适配
- ❌ ActivityTimeline（P1-3）— 需全新适配
- ❌ SkillRadar（P1-4）— 需全新适配

#### 修复策略

1. **硬编码 → CSS 变量**：将所有 `#999`、`#333`、`#fff` 替换为 `var(--color-text-muted)` 等已有变量
2. **Recharts 图表暗色适配**：通过 ThemeContext 传入 `isDark` prop → Recharts 组件动态设置 `stroke` / `fill` / tick 颜色
3. **新增组件默认同时适配 light/dark**：所有 CSS 同时提供 `body.dark` 规则
4. **渐变背景暗色化**：暗色下 `collection-card__cover` 改用更深色调

#### 工作量估算
- 现有页面 CSS 修复：1.5h
- 新增组件暗色适配（含 P0/P1 组件）：3h（已在各组件预估中包含）
- 图表暗色适配：1h
- 回归测试：1h
- **合计（增量）：2.5h**

---

### P2-6：移动端响应式深化

**目标**：在现有 3 断点基础上，针对移动端触屏场景做精细优化。

#### 优化项

| 优化点 | 现状 | 目标 |
|--------|------|------|
| 统计卡片 | 5 列等宽 flex | ≤480px 时改为 3+2 两行布局，图标缩小 |
| 标签页 | 横向滚动（overflow-x: auto） | 增加惯性滚动 + 隐藏滚动条 + 选中态自动滚动到可视区 |
| 成就徽章 | flex-wrap，可能很宽 | 限制每行最多 4 个，≤360px 时 3 个 |
| 图表面板 | 桌面端正常渲染 | ≤480px 时图例简化、tooltip 位置调整、Y 轴标签截短 |
| 雷达图 | 固定 300px 尺寸 | ≤480px 时缩放至 260px，保持可读性 |
| 时间线 | 桌面端垂直布局 | ≤480px 时缩小左侧时间戳宽度，照片缩略图缩小 |
| 编辑资料弹窗 | 固定 max-width: 420px | ≤400px 时全屏 modal（max-width: 100vw，圆角归零） |
| 骨架屏 | 3-6 列 grid | 移动端降至 1-2 列 |
| 底部间距 | padding-bottom: 48px | ≤480px 时加大至 80px（防止底部导航遮挡） |

#### 技术方案

```css
/* 新增断点 */
@media (max-width: 360px) { /* 超小屏 */ }

/* 标签页横向滚动优化 */
.profile-tabs {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE */
}
.profile-tabs::-webkit-scrollbar {
  display: none;
}

/* 选中 tab 自动滚动到可见区 */
/* JS: tabRef.scrollIntoView({ behavior: 'smooth', inline: 'center' }) */
```

#### 工作量估算
- CSS 断点优化：2h
- Tab 滚动行为 JS：0.5h
- 图表响应式配置：1h
- 测试多设备尺寸：1h
- **合计：4.5h**

---

## 5. 工作量估算总表

| 优先级 | 模块 | 后端 | 前端 | 测试 | 合计 | 依赖 |
|--------|------|------|------|------|------|------|
| **P0** | 统计数据可视化增强 | 2h | 5h | 0.5h | **7.5h** | Recharts 已有 |
| **P0** | 成就系统深化 | 3h | 8h | 1h | **12h** | — |
| **P1** | 烹饪日志活动时间线 | 1h | 3.5h | 0.5h | **5h** | P0-2 成就分类色板可复用 |
| **P1** | 用户技能雷达图 | 3h | 2.5h | 0.5h | **6h** | cooking-logs 有数据 |
| **P2** | 暗色模式全覆盖 | — | 2h | 0.5h | **2.5h** | P0/P1 组件完成后 |
| **P2** | 移动端响应式深化 | — | 3.5h | 1h | **4.5h** | 所有功能完成后 |
| **总计** | | **9h** | **24.5h** | **4h** | **37.5h** | |

### 交付建议

- **Sprint 1（P0，约 3 天）**: 统计数据可视化 + 成就系统深化
  - 这两个模块是用户感知最强的"增量"，独立上线即可显著提升体验
- **Sprint 2（P1，约 2 天）**: 活动时间线 + 技能雷达图
  - 依赖 cooking-logs 数据，需确认数据量充足
- **Sprint 3（P2，约 1.5 天）**: 暗色模式全覆盖 + 移动端深化
  - 可与其他模块并行推进，但最终整合在 P0/P1 之后

---

## 6. 技术约束与风险

### 约束

| 约束 | 影响 | 应对 |
|------|------|------|
| ❌ 不可 ALTER TABLE | 无法新增 DB 字段 | 所有新数据通过现有表 + 后端聚合/计算得出 |
| ✅ 可新增 Express 路由 | 可注册新端点 | 新增路由在 `backend/routes/users.js` 等文件中追加 |
| ✅ 可新增前端组件 | 组件化拆分 | 按 `components/{FeatureName}/` 目录组织 |
| ✅ Recharts ^3.8.1 已安装 | 无需额外依赖 | 直接 import 使用 |

### 风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 烹饪日志数据不足（用户可能无记录） | 高 | 图表/雷达图无数据 | 设计空状态 UI（P1-3、P1-4 均已覆盖） |
| 成就进度实时计算性能（每次请求需聚合多个表） | 中 | 接口响应慢 | 加 5min 内存缓存（Redis 或 node-cache） |
| Recharts 暗色模式渲染异常 | 低 | 图表不可读 | 通过 ThemeContext 动态传 CSS 变量值给 Recharts |
| 移动端 Recharts 触摸交互冲突 | 低 | 滚动误触图表 | 图表区域加 `touchAction: 'pan-y'` |

---

## 7. 附录：新 API 接口设计汇总

### A1. `GET /api/users/:id/stats-trends`

**用途**: 获取用户统计数据的时间趋势（收藏数变化 + 烹饪频率）。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `days` | number | 否 | 30 | 统计天数范围 |

**响应 200**:
```json
{
  "userId": "uuid",
  "days": 30,
  "favorites": [
    { "date": "2026-06-01", "dailyNew": 2, "cumulative": 45 },
    { "date": "2026-06-02", "dailyNew": 0, "cumulative": 45 }
  ],
  "cooking": [
    { "date": "2026-06-01", "count": 3, "avgRating": 4.2 },
    { "date": "2026-06-02", "count": 1, "avgRating": 5.0 }
  ]
}
```

**内部实现**（伪 SQL）:
```sql
-- favorites 趋势
SELECT DATE(f.createdAt) as date, COUNT(*) as dailyNew
FROM favorites f
JOIN recipes r ON f.recipeId = r.id
WHERE r.authorId = :userId
  AND f.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
GROUP BY DATE(f.createdAt)
ORDER BY date ASC

-- cooking 趋势
SELECT cookedAt as date, COUNT(*) as count, AVG(rating) as avgRating
FROM cooking_logs
WHERE userId = :userId
  AND cookedAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
GROUP BY cookedAt
ORDER BY date ASC
```

---

### A2. `GET /api/achievements/user/:userId/grouped`

**用途**: 获取用户全部成就（含未解锁），按分类分组。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 否 | 筛选单个分类（不传则返回全部） |

**响应 200**:
```json
{
  "userId": "uuid",
  "totalCount": 30,
  "unlockedCount": 8,
  "categories": [
    {
      "key": "publisher",
      "label": "发布者",
      "color": "#e8663e",
      "total": 5,
      "unlocked": 2,
      "achievements": [
        {
          "type": "first_recipe",
          "title": "初次下厨",
          "description": "发布第一篇食谱",
          "icon": "🍳",
          "category": "publisher",
          "unlocked": true,
          "unlockedAt": "2026-01-15",
          "progress": 1,
          "maxProgress": 1
        },
        {
          "type": "ten_recipes",
          "title": "小有名气",
          "description": "发布 10 篇食谱",
          "icon": "📝",
          "category": "publisher",
          "unlocked": false,
          "progress": 3,
          "maxProgress": 10
        }
      ]
    }
  ]
}
```

**后端常量定义**（节选）:
```javascript
const ALL_ACHIEVEMENTS = [
  // 发布者类
  { type: 'first_recipe', title: '初次下厨', description: '发布第一篇食谱', icon: '🍳', category: 'publisher', maxProgress: 1 },
  { type: 'ten_recipes', title: '小有名气', description: '发布 10 篇食谱', icon: '📝', category: 'publisher', maxProgress: 10 },
  { type: 'fifty_recipes', title: '食谱达人', description: '发布 50 篇食谱', icon: '📚', category: 'publisher', maxProgress: 50 },
  { type: 'hundred_recipes', title: '食谱大师', description: '发布 100 篇食谱', icon: '👨‍🍳', category: 'publisher', maxProgress: 100 },
  { type: 'popular_recipe', title: '人气食谱', description: '一篇食谱获得 100+ 收藏', icon: '🔥', category: 'publisher', maxProgress: 1 },
  // 收藏家类
  { type: 'first_favorite', title: '初次收藏', description: '收藏第一篇食谱', icon: '❤️', category: 'collector', maxProgress: 1 },
  { type: 'ten_favorites', title: '收藏爱好者', description: '收藏 10 篇食谱', icon: '💕', category: 'collector', maxProgress: 10 },
  { type: 'fifty_favorites', title: '美食收藏家', description: '收藏 50 篇食谱', icon: '📋', category: 'collector', maxProgress: 50 },
  // 评论家类
  { type: 'first_comment', title: '首次发言', description: '发表第一篇评论', icon: '💬', category: 'commenter', maxProgress: 1 },
  { type: 'ten_comments', title: '活跃评论', description: '发表 10 条评论', icon: '🗣️', category: 'commenter', maxProgress: 10 },
  { type: 'fifty_comments', title: '评论达人', description: '发表 50 条评论', icon: '📢', category: 'commenter', maxProgress: 50 },
  // 厨神（烹饪）类
  { type: 'first_cook', title: '初次烹饪', description: '记录第一次烹饪', icon: '🔪', category: 'cook', maxProgress: 1 },
  { type: 'ten_cooks', title: '烹饪新手', description: '完成 10 次烹饪', icon: '🥘', category: 'cook', maxProgress: 10 },
  { type: 'thirty_cooks', title: '家常大厨', description: '完成 30 次烹饪', icon: '🍲', category: 'cook', maxProgress: 30 },
  { type: 'hundred_cooks', title: '厨神降临', description: '完成 100 次烹饪', icon: '👑', category: 'cook', maxProgress: 100 },
  { type: 'streak_7', title: '连续七天', description: '连续 7 天下厨', icon: '🔥', category: 'cook', maxProgress: 7 },
  // 探索家类
  { type: 'browse_50', title: '美食探索者', description: '浏览 50 篇食谱', icon: '🔍', category: 'explorer', maxProgress: 50 },
  { type: 'cuisine_master', title: '菜系通吃', description: '烹饪过 5 种菜系', icon: '🌏', category: 'explorer', maxProgress: 5 },
  // 社交达人类
  { type: 'first_follow', title: '首次关注', description: '关注第一位用户', icon: '👋', category: 'social', maxProgress: 1 },
  { type: 'ten_followers', title: '小有人气', description: '获得 10 位粉丝', icon: '🌟', category: 'social', maxProgress: 10 },
  { type: 'fifty_followers', title: '人气之星', description: '获得 50 位粉丝', icon: '⭐', category: 'social', maxProgress: 50 },
]
```

---

### A3. `GET /api/users/:id/activity-timeline`

**用途**: 获取用户的烹饪活动时间线（最近 N 条）。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `limit` | number | 否 | 10 | 返回条数（最大 50） |
| `before` | string | 否 | — | 游标分页（ISO 日期） |

**响应 200**:
```json
{
  "userId": "uuid",
  "events": [
    {
      "id": "uuid",
      "recipeId": "uuid",
      "recipeTitle": "红烧排骨",
      "recipeCategory": "chinese",
      "cookedAt": "2026-06-10",
      "rating": 5,
      "notes": "这次火候控制得很好，排骨很入味",
      "duration": 45,
      "photoUrl": "[\"https://...\"]",
      "createdAt": "2026-06-10T19:30:00Z"
    }
  ],
  "hasMore": true
}
```

**实现要点**：可直接增强现有 `GET /cooking-logs`，增加 `userId` 可选参数 + `ORDER BY cookedAt DESC`。

---

### A4. `GET /api/users/:id/skill-profile`

**用途**: 获取用户的烹饪技能雷达图数据。

**响应 200**:
```json
{
  "userId": "uuid",
  "totalCooked": 28,
  "dimensions": [
    { "name": "中式烹饪", "value": 87, "rawCount": 13 },
    { "name": "西式料理", "value": 53, "rawCount": 8 },
    { "name": "甜点烘焙", "value": 20, "rawCount": 3 },
    { "name": "日韩料理", "value": 7, "rawCount": 1 },
    { "name": "辛辣口味", "value": 60, "rawCount": 9 },
    { "name": "清淡口味", "value": 33, "rawCount": 5 }
  ]
}
```

**内部实现**（伪代码）:
```javascript
// 1. 查询用户所有 cooking_logs，JOIN recipes 获取 category + categoryTags
const logs = await CookingLog.findAll({
  where: { userId },
  include: [{ model: Recipe, attributes: ['category', 'categoryTags'] }]
})

// 2. 按维度聚合
const dims = {
  '中式烹饪': 0,
  '西式料理': 0,
  '甜点烘焙': 0,
  '日韩料理': 0,
  '辛辣口味': 0,
  '清淡口味': 0,
}

for (const log of logs) {
  const cat = log.Recipe?.category
  const tags = parseCategoryTags(log.Recipe?.categoryTags)

  if (cat === 'chinese' || tags.cuisine === '中式') dims['中式烹饪']++
  if (cat === 'western' || tags.cuisine === '西式') dims['西式料理']++
  if (cat === 'dessert') dims['甜点烘焙']++
  if (cat === 'japanese' || cat === 'korean') dims['日韩料理']++
  if (tags.flavor?.includes('辣')) dims['辛辣口味']++
  if (tags.flavor?.includes('清淡') || tags.flavor?.includes('鲜')) dims['清淡口味']++
}

// 3. 归一化到 0-100
const maxRaw = Math.max(...Object.values(dims), 1)
return Object.entries(dims).map(([name, rawCount]) => ({
  name,
  rawCount,
  value: Math.round((rawCount / maxRaw) * 100)
}))
```

---

## 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-11 | v1.0 | 初始版本，覆盖 6 项增强方案 |

---

**PRD 输出完成。** 输出路径：`~/Projects/food-website/iter-profile-deepening/PRD-profile-deepening.md`
