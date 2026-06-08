# UI 规范：全局加载状态骨架屏升级

> 迭代: iter102 · 版本: v1.0 · 日期: 2026-06-08
> 对应问题清单：见任务说明（Router Suspense fallback / 页面 loading 状态 / Toast 硬编码颜色 / PageTransition.css 重复 / pageEnter 缺漏）

---

## 1. 设计原则

- **复用现有 shimmer 体系**：所有骨架元素必须复用 `Skeleton.tsx`（基础 shimmer 块）和 `RecipeCardSkeleton.tsx`（卡片骨架），禁止引入新动画/新变量。
- **CSS 变量统一**：颜色必须使用 `global.css :root` 已定义的 `--color-*` 变量（`--color-skeleton-from/to`、`--color-success/error/warning/info` 等），暗色模式通过 `body.dark` 选择器覆盖。
- **类型驱动（type-driven）**：通过 `type` 参数控制骨架布局，避免每个页面写一份专属骨架屏。
- **结构对位真实页面**：骨架屏的"占位块数量/位置/比例"必须与真实页面渲染后的真实内容大致一致，避免出现"加载完后布局跳动"（CLS）。
- **`pointer-events: none`**：骨架屏仅作占位，不可点击、不可聚焦。
- **`prefers-reduced-motion` 友好**：如用户启用"减少动效"，shimmer 动画应停用（CSS 媒体查询包裹）。

---

## 2. PageSkeleton 通用骨架屏组件

### 2.1 组件契约

```tsx
// frontend/src/components/PageSkeleton.tsx
import './PageSkeleton.css'
import Skeleton from './Skeleton'
import RecipeCardSkeleton from './RecipeCardSkeleton'

export type PageSkeletonType = 'home' | 'list' | 'detail' | 'profile' | 'default'

interface PageSkeletonProps {
  type?: PageSkeletonType
  /** 列表/卡片网格列数（仅 home/list/profile 生效），默认 3 */
  columns?: 1 | 2 | 3 | 4
  /** 网格行数（仅 home/list/profile 生效），默认 3 */
  rows?: number
  className?: string
}

export default function PageSkeleton({
  type = 'default',
  columns = 3,
  rows = 3,
  className = '',
}: PageSkeletonProps) {
  // 根据 type 分发到不同 layout
  // 详见 §2.3 各类型布局
}
```

### 2.2 使用示例

```tsx
// Router Suspense fallback（替换 router/index.tsx:56 的纯文本）
import PageSkeleton from '../components/PageSkeleton'

const Fallback = () => <PageSkeleton type="default" />

// HomePage 加载
{loading && <PageSkeleton type="home" />}

// SearchResults 加载
{loading && <PageSkeleton type="list" />}

// RecipeDetail 加载
{loading && <PageSkeleton type="detail" />}

// UserProfile 加载
{loading && <PageSkeleton type="profile" />}
```

### 2.3 各 type 布局描述

#### 2.3.1 `type="default"` — 通用 fallback

适用：Router Suspense 兜底、未知页面、404 之前的过渡。

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│         ┌──────────────┐                 │  ← 居中大圆 shimmer 块
│         │              │  (96×96 circle) │
│         └──────────────┘                 │
│                                          │
│         ┌──────────────────────┐         │  ← 标题行 60% 宽
│         └──────────────────────┘         │
│                                          │
│         ┌───────────────┐                │  ← 副标题行 40% 宽
│         └───────────────┘                │
│                                          │
└──────────────────────────────────────────┘
```

实际 DOM：
```tsx
<div className="page-skeleton page-skeleton--default">
  <Skeleton circle width={96} height={96} />
  <Skeleton width="60%" height={22} />
  <Skeleton width="40%" height={14} />
</div>
```

样式要点：
- 容器 `min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 60px 20px;`
- 文字行 `Skeleton` 高度 22 / 14，宽度 60% / 40%。

#### 2.3.2 `type="home"` — 首页布局

适用：`HomePage`、Landing。

```
┌──────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐ │  ← HeroSection 占位
│ │                                              │ │     (100% × 280, 大圆角)
│ │  ┌────────────┐                              │ │
│ │  └────────────┘  ┌────────────────────┐      │ │  ← Hero 内: 圆形 logo + 标题
│ │                   └────────────────────┘      │ │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │  ← Hero 内: 3 个 CTA 按钮占位
│ │  └──────────┘  └──────────┘  └──────────┘    │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────┐  今日推荐 / 分类标题占位    │  ← Section heading (40%×28)
│  └──────────────────┘                            │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐                │  ← 3 列 RecipeCardSkeleton
│  │  封面  │ │  封面  │ │  封面  │                │     (rows × 3 grid)
│  │  标题  │ │  标题  │ │  标题  │                │
│  │  meta  │ │  meta  │ │  meta  │                │
│  └────────┘ └────────┘ └────────┘                │
│  ┌────────┐ ┌────────┐ ┌────────┐                │  ← 第 2 行
│  │  ...   │ │  ...   │ │  ...   │                │
│  └────────┘ └────────┘ └────────┘                │
│  ... (rows 行，默认 3) ...                      │
└──────────────────────────────────────────────────┘
```

实际 DOM 概要：
```tsx
<div className="page-skeleton page-skeleton--home">
  {/* Hero */}
  <div className="ps-home__hero">
    <Skeleton className="ps-home__hero-bg" width="100%" height={280} rounded={14} />
    <div className="ps-home__hero-content">
      <Skeleton circle width={64} height={64} />
      <Skeleton width="60%" height={28} />
      <div className="ps-home__hero-ctas">
        <Skeleton width={100} height={36} rounded={18} />
        <Skeleton width={100} height={36} rounded={18} />
        <Skeleton width={100} height={36} rounded={18} />
      </div>
    </div>
  </div>

  {/* Section heading */}
  <Skeleton width="40%" height={28} className="ps-home__section-title" />

  {/* Card grid */}
  <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
    {Array.from({ length: columns * rows }).map((_, i) => (
      <RecipeCardSkeleton key={i} />
    ))}
  </div>
</div>
```

#### 2.3.3 `type="list"` — 列表页（搜索/收藏/分类）

适用：`SearchPage`、`FavoriteList`、`CollectionsPage`、`PantryPage`、`TagsPage`、`UserWorksPage`、`DraftsPage`、`MyToolsPage`、`IngredientSearchPage`。

```
┌──────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐ │  ← 搜索栏占位 (100% × 48)
│ │  🔍  ┌────────────────────────────┐  [搜索]   │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐                │  ← Filter chips 标签行
│  └────────┘ └────────┘ └────────┐                │     (5 个小 chip, 高度 28)
│                                  └────────────── │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐                │
│  │  卡片  │ │  卡片  │ │  卡片  │                │  ← 3 列 RecipeCardSkeleton
│  │        │ │        │ │        │                │     (rows × 3 grid)
│  └────────┘ └────────┘ └────────┘                │
│  ... (rows 行) ...                              │
│                                                  │
│         ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                │  ← 分页占位
│         └──┘ └──┘ └──┘ └──┘ └──┘                │     (5 个圆角方块)
└──────────────────────────────────────────────────┘
```

实际 DOM 概要：
```tsx
<div className="page-skeleton page-skeleton--list">
  {/* Search bar */}
  <div className="ps-list__searchbar">
    <Skeleton width="100%" height={48} rounded={24} />
  </div>

  {/* Filter chips */}
  <div className="ps-list__filters">
    {[80, 100, 90, 110, 70].map((w, i) => (
      <Skeleton key={i} width={w} height={28} rounded={14} />
    ))}
  </div>

  {/* Card grid */}
  <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
    {Array.from({ length: columns * rows }).map((_, i) => (
      <RecipeCardSkeleton key={i} />
    ))}
  </div>

  {/* Pagination */}
  <div className="ps-list__pagination">
    {[32, 32, 32, 32, 32].map((s, i) => (
      <Skeleton key={i} width={s} height={s} rounded={6} />
    ))}
  </div>
</div>
```

#### 2.3.4 `type="detail"` — 详情页

适用：`RecipeDetail`、`CollectionDetail`、`ChallengeDetail`、`ContentQualityPage`、`RecipeDiffPage`、`ComparePage`。

```
┌──────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐ │  ← 大封面占位 (100% × 360, 16/9)
│ │                                              │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────┐               │  ← 标题 70%
│  └──────────────────────────────┘               │
│  ┌────────────────────┐                         │  ← 副标题 50%
│  └────────────────────┘                         │
│                                                  │
│  👤 ┌────────┐   ⏱ ┌────────┐  👥 ┌────────┐   │  ← 信息行: 头像 + 3 个 meta
│     └────────┘     └────────┘    └────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │  ← 描述段落 1 (100%×14)
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐     │  ← 描述段落 2 (80%×14)
│  └──────────────────────────────────────┘     │
│                                                  │
│  ┌──────────────────────┐                       │  ← 配料表标题 30%×24
│  └──────────────────────┘                       │
│  ┌──────────────────────────────────────────┐  │
│  └──────────────────────────────────────────┘  │  ← 配料行 ×6
│  ┌──────────────────────────────────────────┐  │
│  └──────────────────────────────────────────┘  │
│  ... (6 行) ...                                │
│                                                  │
│  ┌──────────────────────┐                       │  ← 步骤标题 30%×24
│  └──────────────────────┘                       │
│  ┌──┐ ┌──────────────────────────────────┐    │  ← 步骤列表: 编号 + 文本
│  │ 1│  └──────────────────────────────────┘    │     (8 步)
│  └──┘                                          │
│  ┌──┐ ┌──────────────────────────────────┐    │
│  │ 2│  └──────────────────────────────────┘    │
│  └──┘                                          │
│  ...                                            │
└──────────────────────────────────────────────────┘
```

实际 DOM 概要：
```tsx
<div className="page-skeleton page-skeleton--detail">
  {/* Cover */}
  <Skeleton className="ps-detail__cover" width="100%" height={360} rounded={14} />

  {/* Title block */}
  <div className="ps-detail__titleblock">
    <Skeleton width="70%" height={28} />
    <Skeleton width="50%" height={16} />
  </div>

  {/* Meta row (avatar + 3 chips) */}
  <div className="ps-detail__meta">
    <Skeleton circle width={36} height={36} />
    <Skeleton width={80} height={14} />
    <Skeleton width={60} height={14} />
    <Skeleton width={60} height={14} />
  </div>

  {/* Description */}
  <div className="ps-detail__desc">
    <Skeleton width="100%" height={14} />
    <Skeleton width="80%" height={14} />
  </div>

  {/* Ingredients section */}
  <Skeleton width={120} height={24} />
  <div className="ps-detail__ingredients">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} width="100%" height={32} rounded={6} />
    ))}
  </div>

  {/* Steps section */}
  <Skeleton width={120} height={24} />
  <div className="ps-detail__steps">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="ps-detail__step">
        <Skeleton width={28} height={28} circle />
        <Skeleton width="90%" height={14} />
      </div>
    ))}
  </div>
</div>
```

#### 2.3.5 `type="profile"` — 用户主页

适用：`UserProfile`、`MyToolsPage`、`KitchenToolsPage`、`ChallengesPage`、`AdminReviewPage`、`DashboardPage`、`SettingsPage`、`PreferencesPage`、`NotificationsPage`、`CookingJournalPage`、`MealPlannerPage`、`NutritionDashboardPage`、`CookingModePage`、`AchievementsPage`、`RankingsPage`。

```
┌──────────────────────────────────────────────────┐
│        ┌────────┐                                │
│        │  头像  │   ┌──────────────┐             │  ← 头像 (96 圆) + 名字 (40%×22)
│        │  96×96 │   └──────────────┘             │
│        └────────┘   ┌────────────┐               │  ← 简介 (30%×14)
│                     └────────────┘               │
│        ┌──┐ ┌──┐ ┌──┐ ┌──┐                      │  ← 4 个数据卡片
│        └──┘ └──┘ └──┘ └──┘                      │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  热力图占位                                │   │  ← 7×N 网格 (高度 120)
│  │  ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪  │   │     (实际渲染时用 grid)
│  │  ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪ ▪▪▪▪▪▪▪  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐  ← Tab bar 4 个标签          │
│  └──┘ └──┘ └──┘ └──┘                            │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐                │  ← 作品 / 收藏网格
│  │  卡片  │ │  卡片  │ │  卡片  │                │     (RecipeCardSkeleton × columns × rows)
│  └────────┘ └────────┘ └────────┘                │
│  ...                                             │
└──────────────────────────────────────────────────┘
```

实际 DOM 概要：
```tsx
<div className="page-skeleton page-skeleton--profile">
  {/* Header */}
  <div className="ps-profile__header">
    <Skeleton circle width={96} height={96} />
    <div className="ps-profile__id">
      <Skeleton width="40%" height={22} />
      <Skeleton width="30%" height={14} />
    </div>
  </div>

  {/* Stats row */}
  <div className="ps-profile__stats">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="ps-profile__stat">
        <Skeleton width={48} height={24} />
        <Skeleton width={60} height={12} />
      </div>
    ))}
  </div>

  {/* Heatmap placeholder */}
  <div className="ps-profile__heatmap">
    <Skeleton width="100%" height={120} rounded={8} />
  </div>

  {/* Tabs */}
  <div className="ps-profile__tabs">
    {[80, 80, 80, 80].map((w, i) => (
      <Skeleton key={i} width={w} height={32} rounded={6} />
    ))}
  </div>

  {/* Works grid */}
  <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
    {Array.from({ length: columns * rows }).map((_, i) => (
      <RecipeCardSkeleton key={i} />
    ))}
  </div>
</div>
```

---

## 3. PageSkeleton.css 样式规范

### 3.1 基础结构

```css
/* frontend/src/components/PageSkeleton.css */

/* ── 容器 ── */
.page-skeleton {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px;
  pointer-events: none;
  user-select: none;
}

.page-skeleton--default {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

/* ── 通用栅格 ── */
.ps-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  gap: 20px;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .ps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .ps-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Home: Hero ── */
.ps-home__hero {
  position: relative;
  margin-bottom: 32px;
}

.ps-home__hero-bg {
  border-radius: var(--radius-lg, 14px);
}

.ps-home__hero-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
}

.ps-home__hero-ctas {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.ps-home__section-title {
  margin: 24px 0 8px;
}

/* ── List ── */
.ps-list__searchbar {
  margin-bottom: 16px;
}

.ps-list__filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.ps-list__pagination {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 32px;
}

/* ── Detail ── */
.ps-detail__cover {
  border-radius: var(--radius-lg, 14px);
  margin-bottom: 24px;
}

.ps-detail__titleblock {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.ps-detail__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.ps-detail__desc {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.ps-detail__ingredients {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.ps-detail__steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ps-detail__step {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Profile ── */
.ps-profile__header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.ps-profile__id {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.ps-profile__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.ps-profile__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: var(--color-card, #fff);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-sm, 0 1px 4px rgba(0, 0, 0, 0.06));
}

@media (max-width: 600px) {
  .ps-profile__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

.ps-profile__heatmap {
  margin-bottom: 24px;
}

.ps-profile__tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--color-border, #e8e0d8);
  padding-bottom: 12px;
  margin-bottom: 20px;
}

/* ── 暗色模式 ── */
body.dark .ps-profile__stat {
  background: var(--color-card, #1e1e32);
}

body.dark .ps-profile__tabs {
  border-color: var(--color-border, #2e2e48);
}

/* ── 减少动效 ── */
@media (prefers-reduced-motion: reduce) {
  .page-skeleton * {
    animation: none !important;
  }
}
```

### 3.2 关键设计决策

| 决策 | 理由 |
|---|---|
| 复用 `Skeleton` / `RecipeCardSkeleton` | 单一动画源、单一变量、零新增 CSS 变量 |
| Grid 容器用 CSS 变量 `--cols` | 比写 4 套媒体查询更轻，columns 参数直接驱动 |
| `pointer-events: none` + `user-select: none` | 防止误点、误选 |
| `prefers-reduced-motion` 停止动画 | 无障碍合规 |
| `body.dark` 统一暗色选择器 | 与项目其余代码一致（注意：当前 `global.css` 中 Toast 用了 `[data-theme='dark']`，本次同步替换） |

---

## 4. Toast 颜色变量映射表

### 4.1 浅色模式（`:root` 已存在的变量）

| 用途 | 旧值（硬编码） | 新值（CSS 变量） | 变量定义 |
|---|---|---|---|
| success 背景 | `#52c41a` | `var(--color-success)` | `:root` 已定义 |
| error 背景 | `#ff4d4f` | `var(--color-error)` | `:root` 已定义 |
| warning 背景 | `#faad14` | `var(--color-warning)` | `:root` 已定义 |
| info 背景 | `#1890ff` | `var(--color-info)` ❌ **未定义** | 需新增 |
| warning 文字 | `#1a1a1a` | `var(--color-text)` | `:root` 已定义 |

### 4.2 暗色模式（选择器 + 颜色统一）

| 用途 | 旧（硬编码值 + 错选择器） | 新（变量 + 正确选择器） |
|---|---|---|
| success 背景 | `[data-theme='dark']` `#2e7d32` | `body.dark` `var(--color-success-dark, #2e7d32)` |
| error 背景 | `[data-theme='dark']` `#c62828` | `body.dark` `var(--color-error-dark, #c62828)` |
| warning 背景 | `[data-theme='dark']` `#f9a825` | `body.dark` `var(--color-warning-dark, #f9a825)` |
| info 背景 | `[data-theme='dark']` `#1565c0` | `body.dark` `var(--color-info-dark, #1565c0)` |
| warning 文字 | `#1a1a1a` | 复用 `var(--color-text)` 即可（暗色下为浅色） |
| close 按钮 | `rgba(255,255,255,0.2/0.35)` | 不变（保持原样） |

> **注**：在 `body.dark` 块下，warning 文字色不需单独指定 `#1a1a1a`——因为暗色下文字色 `--color-text: #e0e0ee`，但 warning 在暗色下用 `#f9a825`（暖黄）作为背景时，文字若用浅色则对比度不足。建议为 warning 暗色文字单独保留 `var(--color-warning-text, #1a1a1a)`，与浅色模式一致。

### 4.3 `:root` / `body.dark` 新增变量（建议追加）

```css
/* 在 :root 块内追加 */
--color-info: #1890ff;
--color-info-dark: #1565c0;
--color-success-dark: #2e7d32;
--color-error-dark: #c62828;
--color-warning-dark: #f9a825;
--color-warning-text: #1a1a1a; /* warning 在两种主题下都用深色文字 */
```

```css
/* 在 body.dark 块内追加（注意：暗色变量不在 body.dark 中重写，而是在 :root 中以 *-dark 命名后供选择器引用） */
```

> **更轻量的方案**：不新增任何变量，直接在 toast 暗色块用现有 `var(--color-success)` 等变量 + `filter: brightness(0.85)` 降低明度。但这样会影响 warning 的对比度，最干净的做法是引入上面的 6 个变量。

### 4.4 替换后 `global.css` 完整 toast 块（`L181-L225` 区域）

```css
/* Type-specific toast backgrounds */
.qclaw-toast--success {
  background: var(--color-success);
}

.qclaw-toast--error {
  background: var(--color-error);
}

.qclaw-toast--warning {
  background: var(--color-warning);
  color: var(--color-warning-text);
}

.qclaw-toast--warning .qclaw-toast__close {
  color: var(--color-warning-text);
  background: rgba(0, 0, 0, 0.15);
}

.qclaw-toast--info {
  background: var(--color-info);
}

/* ── 暗色模式 Toast（统一使用 body.dark） ── */
body.dark .qclaw-toast--success {
  background: var(--color-success-dark);
}

body.dark .qclaw-toast--error {
  background: var(--color-error-dark);
}

body.dark .qclaw-toast--warning {
  background: var(--color-warning-dark);
  color: var(--color-warning-text);
}

body.dark .qclaw-toast--info {
  background: var(--color-info-dark);
}

body.dark .qclaw-toast__close {
  background: rgba(255, 255, 255, 0.2);
}

body.dark .qclaw-toast__close:hover {
  background: rgba(255, 255, 255, 0.35);
}
```

---

## 5. PageTransition.css 去重

### 5.1 问题诊断

`frontend/src/components/PageTransition.css` 当前内容：

```css
.page-transition-enter {
  opacity: 0;
  transform: translateY(12px);          /* ← 第 1 处 */
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.page-transition-exit {
  opacity: 1;
}

.page-transition-exit-active {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Main content fade-in */
main#main-content {
  animation: mainFadeIn 0.35s ease both;
}

@keyframes mainFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── 重复块 ── */
.page-transition-enter {
  opacity: 0;                             /* ← 第 2 处（覆盖第 1 处的 translateY） */
}

.page-transition-enter-active {
  opacity: 1;
  transition: opacity 0.25s ease;         /* ← 覆盖第 1 处的 0.3s/0.35s */
}
```

**冲突分析**：
- 第 2 处 `.page-transition-enter` 用 `opacity: 0` 覆盖了第 1 处的 `opacity: 0; transform: translateY(12px);`——丢失了 slide-up 效果。
- 第 2 处 `.page-transition-enter-active` 用 `opacity 0.25s ease` 覆盖了第 1 处的 `opacity 0.3s ease, transform 0.35s cubic-bezier(...)`——丢失了弹性 transform 过渡。

**结论**：保留第 1 处（更完整），删除第 2 处。

### 5.2 去重后完整内容

```css
/* frontend/src/components/PageTransition.css */

/* React Transition Group page transitions */
.page-transition-enter {
  opacity: 0;
  transform: translateY(12px);
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.page-transition-exit {
  opacity: 1;
}

.page-transition-exit-active {
  opacity: 0;
  transition: opacity 0.2s ease;
}

/* Main content fade-in */
main#main-content {
  animation: mainFadeIn 0.35s ease both;
}

@keyframes mainFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

行数：28 行（原 38 行减少 10 行）。

---

## 6. pageEnter 补充完整列表

### 6.1 当前 `global.css` 已有（8+5 = 13 个）

```css
/* L325-L343 区域 */
.home-page,
.search-page,
.detail-page,
.login-page,
.favorite-list,
.create-page,
.recommend-page,
.user-profile-page { animation: pageEnter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1); }

.collections-page,
.coll-detail-page,
.shop-page,
.profile-page,
.not-found-page { animation: pageEnter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1); }
```

### 6.2 需追加的 24 个类名

| 类名 | 对应页面 |
|---|---|
| `.achievements-page` | `AchievementsPage` |
| `.pantry-page` | `PantryPage` |
| `.rankings-page` | `RankingsPage` |
| `.notif-page` | `NotificationsPage`（早期命名） |
| `.notifications-page` | `NotificationsPage`（当前命名） |
| `.content-quality-page` | `ContentQualityPage` |
| `.settings-page` | `SettingsPage` |
| `.cooking-mode-page` | `CookingModePage` |
| `.cooking-journal-page` | `CookingJournalPage` |
| `.meal-planner-page` | `MealPlannerPage` |
| `.nutrition-dashboard-page` | `NutritionDashboard` |
| `.compare-page` | `ComparePage` |
| `.recipe-diff-page` | `RecipeDiffPage` |
| `.kitchen-tools-page` | `KitchenToolsPage` |
| `.my-tools-page` | `MyToolsPage` |
| `.tags-page` | `TagsPage` |
| `.challenges-page` | `ChallengesPage` |
| `.challenge-detail-page` | `ChallengeDetailPage` |
| `.admin-review-page` | `AdminReviewPage` |
| `.dashboard-page` | `DashboardPage` |
| `.drafts-page` | `DraftsPage` |
| `.ingredient-search-page` | `IngredientSearchPage` |
| `.preferences-page` | `PreferencesPage` |
| `.user-works-page` | `UserWorksPage` |

### 6.3 替换后 `global.css` 完整 pageEnter 块

将原有的两个 5+5 块合并为一个包含全部 37 个类名的统一块：

```css
/* ── 页面进入过渡（增强：slide-up + fadeIn） ── */
@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.home-page,
.search-page,
.detail-page,
.login-page,
.favorite-list,
.create-page,
.recommend-page,
.user-profile-page,
.collections-page,
.coll-detail-page,
.shop-page,
.profile-page,
.not-found-page,
.achievements-page,
.pantry-page,
.rankings-page,
.notif-page,
.notifications-page,
.content-quality-page,
.settings-page,
.cooking-mode-page,
.cooking-journal-page,
.meal-planner-page,
.nutrition-dashboard-page,
.compare-page,
.recipe-diff-page,
.kitchen-tools-page,
.my-tools-page,
.tags-page,
.challenges-page,
.challenge-detail-page,
.admin-review-page,
.dashboard-page,
.drafts-page,
.ingredient-search-page,
.preferences-page,
.user-works-page {
  animation: pageEnter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}
```

> **建议**：用 `prefers-reduced-motion` 包裹以提升无障碍：

```css
@media (prefers-reduced-motion: no-preference) {
  .home-page,
  /* ... 全部 37 个 ... */
  .user-works-page {
    animation: pageEnter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
  }
}
```

### 6.4 View Transitions API 块同步补充

`@supports (view-transition-name: none)` 内的页面类名也应同步追加（否则新页面不会有 view transition 效果）。具体追加内容见 §7 注意事项。

---

## 7. 注意事项

### 7.1 严格复用原则

- ✅ 复用 `Skeleton.tsx` 和 `RecipeCardSkeleton.tsx` 的 shimmer 动画
- ✅ 复用 `--color-skeleton-from/to`（在 `Skeleton.css` 暗色模式中已有 fallback 值 `#262640` / `#303050`）
- ✅ 复用 `--color-success/error/warning` + 新增 `--color-info` + `--color-*-dark` 系列
- ❌ 不要新建 `--skeleton-page-bg`、`--shimmer-color-2` 之类新变量
- ❌ 不要在 `PageSkeleton.css` 里复制一份 shimmer keyframes（用 `Skeleton` 组件即可）

### 7.2 CSS 变量使用细节

- 所有 `<Skeleton>` 实例**只**使用组件传入的 `width/height/rounded/circle` props 控制样式，不要再写新的 `style={{ background: '...' }}`。
- PageSkeleton.css 中所有颜色必须使用 `var(--color-card)`、`var(--color-border)`、`var(--shadow-sm)` 等已有变量，禁止硬编码。
- `border-radius` 统一使用 `var(--radius-sm/md/lg)`，并带 fallback（如 `var(--radius-md, 10px)`）以兼容旧浏览器。
- 暗色模式选择器**统一用 `body.dark`**（不是 `[data-theme='dark']`）。本次 Toast 修改会顺手替换遗留的 `[data-theme='dark']` 用法。
- View Transitions API 块中应追加同样的 24 个新类名（与 pageEnter 列表保持一致）。

### 7.3 可访问性 & 性能

- 骨架屏 `aria-busy="true"`，外层容器加 `aria-live="polite"`（可选），并设置 `role="status"`。
- 骨架屏的 shimmer 动画对 CPU 占用极低，但当 `rows=10` × `columns=4` = 40 个 `<Skeleton>` 同时渲染时仍需注意。可在 PageSkeleton 内部用 React.memo 避免 columns/rows 不变时的重渲染。
- `prefers-reduced-motion: reduce` 时整体停止 shimmer 动画（仅显示静态灰色块）。
- 所有 `RecipeCardSkeleton` 不要嵌套 `<Skeleton>` 的子动画，避免叠加抖动。

### 7.4 Router Suspense fallback 替换

`router/index.tsx:56` 当前：

```tsx
const Fallback = () => <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>
```

替换为：

```tsx
import PageSkeleton from '../components/PageSkeleton'

const Fallback = () => <PageSkeleton type="default" />
```

并在外层 `<Suspense fallback={<Fallback />}>` 保持不变。`type="default"` 是 60vh 居中布局，比简单"加载中..."文本更友好。

### 7.5 各页面 loading 替换对照表（建议同步修改）

| 页面 | 旧 loading | 新 loading |
|---|---|---|
| `HomePage` | `<div>加载中...</div>` | `<PageSkeleton type="home" />` |
| `SearchPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `RecipeDetail` | `<div>加载食谱中...</div>` | `<PageSkeleton type="detail" />` |
| `UserProfile` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `CollectionsPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `NotificationsPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" rows={4} />` |
| `AchievementsPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `RankingsPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `PantryPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `ContentQualityPage` | `<div>加载中...</div>` | `<PageSkeleton type="detail" />` |
| `SettingsPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `CookingModePage` | `<div>加载中...</div>` | `<PageSkeleton type="default" />` |
| `CookingJournalPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `MealPlannerPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `NutritionDashboard` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `ComparePage` | `<div>加载中...</div>` | `<PageSkeleton type="detail" />` |
| `RecipeDiffPage` | `<div>加载中...</div>` | `<PageSkeleton type="detail" />` |
| `KitchenToolsPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `MyToolsPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `TagsPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `ChallengesPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `ChallengeDetailPage` | `<div>加载中...</div>` | `<PageSkeleton type="detail" />` |
| `AdminReviewPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `DashboardPage` | `<div>加载中...</div>` | `<PageSkeleton type="profile" />` |
| `DraftsPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `IngredientSearchPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |
| `PreferencesPage` | `<div>加载中...</div>` | `<PageSkeleton type="default" />` |
| `UserWorksPage` | `<div>加载中...</div>` | `<PageSkeleton type="list" />` |

> **实施优先级**：先实现 PageSkeleton 组件 + 替换 Router fallback + 修复 Toast 颜色 + 去重 PageTransition.css + 补充 pageEnter 类名（一次性配置）；再分批替换各页面 loading 状态（按访问频率分批）。

### 7.6 验证 checklist

- [ ] `PageSkeleton type="default"` 在 React StrictMode 下不报 key warning
- [ ] `prefers-reduced-motion: reduce` 时骨架屏静止显示
- [ ] 暗色模式下骨架颜色与 `--color-skeleton-from/to` 一致（不出现浅紫/白）
- [ ] 切换 3 列 → 2 列 → 1 列断点，grid 过渡平滑
- [ ] 加载完成后骨架屏被替换时不产生 CLS（layout shift < 0.05）
- [ ] Toast 在浅色 / 暗色两种主题下文字均清晰可读
- [ ] 新增的 24 个 pageEnter 类名均能看到 slide-up + fadeIn 效果
- [ ] View Transitions API 在 Chrome 111+ 浏览器中生效（若支持）

### 7.7 不在本迭代范围

- ❌ 不动 `Skeleton.tsx` 组件本身（保持 24 行最小实现）
- ❌ 不动 `RecipeCardSkeleton.tsx` 本身
- ❌ 不新增任何 shimmer keyframes（直接复用 `Skeleton.css` 中已有的 `skeleton-shimmer`）
- ❌ 不修改 Toast 组件逻辑（只替换颜色 CSS）
- ❌ 不重构 router/index.tsx 其它部分（仅替换 Fallback 内容）

---

## 8. 验收标准

1. **PageSkeleton 组件**：`type` 5 种 + `columns/rows` 可配置，所有类型复用现有 Skeleton 组件，无新增 keyframes。
2. **Toast 颜色变量化**：`global.css` L181-L225 区域内所有硬编码颜色（含暗色 6 处）已替换为 CSS 变量，`[data-theme='dark']` 全部改为 `body.dark`。
3. **PageTransition.css 去重**：删除第 2 处 `.page-transition-enter/active` 重复定义，保留含 `translateY` 的完整版本，文件从 38 行减至 28 行。
4. **pageEnter 补充**：现有 13 个类名 + 新增 24 个类名 = 37 个类名，统一在一个 block 中。
5. **不破坏现有功能**：所有现有页面、按钮、卡片、shimmer 动画在浅色 / 暗色模式下行为不变。
6. **可访问性**：骨架屏 `aria-busy="true"`，尊重 `prefers-reduced-motion`。

---

_文档结束_
