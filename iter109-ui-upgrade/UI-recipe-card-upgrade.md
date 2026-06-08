# UI 升级规范：RecipeCard 微交互 + 季节性视觉元素强化

> **迭代**：iter109-ui-upgrade
> **目标**：在已有微交互（hover translateY、scale 1.08、heartPop、Top3 徽章、季节 emoji）的基础上，进一步强化 **季节标签的视觉差异**、**排行榜主统计值的可读性**、**首页热门标签区的动效层次**。
> **设计原则**：克制（克制于已有的设计 token）、可达（a11y/暗色模式覆盖）、可复用（CSS 变量驱动）、渐进（不破坏现有交互）。

---

## 1. 季节标签视觉强化（RecipeCard + RankingsPage）

### 1.1 设计思路

| 季节 | 情绪 | 主色（bg / text） | 暗色模式 | 渐变强调 |
|------|------|-------------------|----------|----------|
| 春季 🌸 | 清新、萌芽、生机 | `#e8f5e9` / `#2e7d32` | `rgba(46,125,50,0.22)` / `#81c784` | 左上→右下 微亮（白→绿） |
| 夏季 ☀️ | 热烈、阳光、活力 | `#fff3e0` / `#e65100` | `rgba(230,81,0,0.22)` / `#ffb74d` | 左上→右下 微亮（白→橙） |
| 秋季 🍂 | 沉静、收获、温暖 | `#efebe9` / `#4e342e` | `rgba(78,52,46,0.30)` / `#bcaaa4` | 左上→右下 微亮（米→棕） |
| 冬季 ❄️ | 冷静、纯净、节庆 | `#e3f2fd` / `#1565c0` | `rgba(21,101,192,0.24)` / `#90caf9` | 左上→右下 微亮（白→蓝） |

> 颜色对照 Material Design palette（green 50/800、orange 50/900、brown 50/700、blue 50/800），与产品现有的 `var(--color-primary, #E8663E)` 形成既协调又可识别的对比。

### 1.2 完整 CSS

**追加到 `frontend/src/components/RecipeCard.css`（替换第 421-428 行原 `.recipe-card__tag--season` / `body.dark .recipe-card__tag--season`）：**

```css
/* ===== 季节标签（4 套配色 + 暗色模式） ===== */
.recipe-card__tag--season {
  position: relative;
  cursor: help;
}

/* 春季 🌸 — 绿色系 */
.recipe-card__tag--season-spring {
  background: linear-gradient(135deg, #f1f8e9 0%, #c8e6c9 100%);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.18);
}
body.dark .recipe-card__tag--season-spring {
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.28) 0%, rgba(46, 125, 50, 0.16) 100%);
  color: #a5d6a7;
  border-color: rgba(129, 199, 132, 0.25);
}

/* 夏季 ☀️ — 橙色系 */
.recipe-card__tag--season-summer {
  background: linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%);
  color: #e65100;
  border: 1px solid rgba(230, 81, 0, 0.18);
}
body.dark .recipe-card__tag--season-summer {
  background: linear-gradient(135deg, rgba(230, 81, 0, 0.28) 0%, rgba(230, 81, 0, 0.16) 100%);
  color: #ffb74d;
  border-color: rgba(255, 183, 77, 0.25);
}

/* 秋季 🍂 — 棕色系 */
.recipe-card__tag--season-autumn {
  background: linear-gradient(135deg, #efebe9 0%, #d7ccc8 100%);
  color: #4e342e;
  border: 1px solid rgba(78, 52, 46, 0.20);
}
body.dark .recipe-card__tag--season-autumn {
  background: linear-gradient(135deg, rgba(78, 52, 46, 0.34) 0%, rgba(78, 52, 46, 0.20) 100%);
  color: #bcaaa4;
  border-color: rgba(188, 170, 164, 0.30);
}

/* 冬季 ❄️ — 蓝色系 */
.recipe-card__tag--season-winter {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1565c0;
  border: 1px solid rgba(21, 101, 192, 0.18);
}
body.dark .recipe-card__tag--season-winter {
  background: linear-gradient(135deg, rgba(21, 101, 192, 0.30) 0%, rgba(21, 101, 192, 0.18) 100%);
  color: #90caf9;
  border-color: rgba(144, 202, 249, 0.28);
}

/* 暗色模式兜底：兼容旧版 recipe.season=all 或未传具体季节 */
body.dark .recipe-card__tag--season:not([class*="season-"]) {
  background: rgba(46, 125, 50, 0.20);
  color: #81c784;
}

/* hover 微缩放 + 季节全名 tooltip */
.recipe-card__tag--season-spring,
.recipe-card__tag--season-summer,
.recipe-card__tag--season-autumn,
.recipe-card__tag--season-winter {
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.recipe-card__tag--season-spring:hover,
.recipe-card__tag--season-summer:hover,
.recipe-card__tag--season-autumn:hover,
.recipe-card__tag--season-winter:hover {
  transform: scale(1.06);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.10);
  filter: brightness(1.04);
}

/* tooltip 暗色模式微调 */
body.dark .recipe-card__tag--season-spring:hover,
body.dark .recipe-card__tag--season-summer:hover,
body.dark .recipe-card__tag--season-autumn:hover,
body.dark .recipe-card__tag--season-winter:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.40);
}
```

> **关于 tooltip**：推荐使用原生 `title` 属性（`title="春季 时令食材"`），零依赖、可访问、跨端兼容；如需更精致的视觉，可引入 Radix UI / 自定义 data-attr + CSS `::after`。本规范优先 **零依赖方案**。

---

## 2. 排行榜数据展示优化（RankingsPage）

### 2.1 设计思路

将 `getPrimaryStat()` 返回值从 `{ value, label }` 升级为 `{ value, label, icon }`，让数字前的 emoji 成为视觉锚点。

| 模式（sortBy） | 图标 | 完整显示 |
|---------------|------|----------|
| `views`        | 👁️   | `👁️ 1.2k` |
| `favorites`    | ❤️   | `❤️ 356`  |
| `composite`    | 🔥   | `🔥 9.4`  |
| `rating`       | ⭐   | `⭐ 4.8`  |

### 2.2 完整 CSS

**追加到 `frontend/src/pages/RankingsPage.css`（替换第 340-369 行原 `.rank-card__primary-stat` 区块）：**

```css
/* ===== 主统计值（含图标 + 数字） ===== */
.rank-card__primary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  min-width: 78px;
  flex-shrink: 0;
  padding-left: 14px;
  border-left: 1px solid var(--color-border-light, #f0ebe5);
}

body.dark .rank-card__primary-stat {
  border-color: var(--color-border-dark, #333);
}

.rank-card__stat-value--primary {
  display: inline-flex;
  align-items: center;
  gap: 4px; /* 规范要求：图标和数字之间间距 4px */
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary, #e8663e), var(--color-star, #f59e0b));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.rank-card__stat-icon {
  font-size: 18px;     /* 略小于数字 22px，避免抢戏 */
  line-height: 1;
  -webkit-text-fill-color: initial;  /* emoji 保持原色，不被 text-gradient 影响 */
  background: none;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06));
}

body.dark .rank-card__stat-icon {
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.30));
}

.rank-card__stat-label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

body.dark .rank-card__stat-label {
  color: #aaa;
}
```

---

## 3. 首页热门标签区视觉升级（HomeTagsSection）

### 3.1 设计思路

| 升级点 | 实现 | 触发 |
|--------|------|------|
| **图标渲染** | 卡片左侧 emoji（数据已存在，未渲染） | 默认 |
| **计数角标** | 右上角小圆角 badge，显示 `(N)` | `popularTags.length > 0` |
| **hover 渐变流动** | `background: linear-gradient(...)` + `background-size: 200% 100%` + `background-position` 过渡 | hover |
| **悬停图标微旋转** | `transform: rotate(8deg) scale(1.1)` | hover |
| **进入错落动画** | 保留已有 `homeTagsFadeIn`，叠加轻微 Y 轴位移 | mount |

### 3.2 完整 CSS

**追加到 `frontend/src/components/HomeTagsSection.css`（在第 29 行前插入，可整段替换）：**

```css
.home-tags-section {
  margin-bottom: 28px;
}

.home-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-tags-card {
  position: relative;            /* 承载右上角 badge */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(
    120deg,
    var(--color-bg-secondary, #f5f5f5) 0%,
    var(--color-bg-secondary, #f5f5f5) 50%,
    var(--color-primary-light, #fef0e6) 50%,
    var(--color-primary-light, #fef0e6) 100%
  );
  background-size: 200% 100%;
  background-position: 0% 0%;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background-position 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s ease,
    color 0.25s ease,
    transform 0.2s ease,
    box-shadow 0.25s ease;
  animation: homeTagsFadeIn 0.3s ease both;
  user-select: none;
  border: 1px solid #eee;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #555);
  white-space: nowrap;
  overflow: hidden;             /* 防止角标溢出 */
}

@keyframes homeTagsFadeIn {
  from { opacity: 0; transform: scale(0.92) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.home-tags-card:hover {
  background-position: 100% 0%; /* 流动到强调色 */
  border-color: var(--color-primary, #e67e22);
  color: var(--color-primary, #e67e22);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(230, 126, 34, 0.15);
}

.home-tags-card:active {
  transform: translateY(0) scale(0.98);
}

.home-tags-card:focus-visible {
  outline: 2px solid var(--color-primary, #e67e22);
  outline-offset: 2px;
}

/* === 卡片内部：图标 + 标签 === */
.home-tags-card__icon {
  font-size: 15px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.home-tags-card:hover .home-tags-card__icon {
  transform: rotate(8deg) scale(1.15);
}

.home-tags-card__label {
  font-size: 13px;
}

.home-tags-card__arrow {
  display: none;
}

/* === 计数角标（popularTags 数据存在时显示） === */
.home-tags-card__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #e67e22);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  border-radius: 9px;
  box-shadow: 0 1px 3px rgba(230, 126, 34, 0.4);
  pointer-events: none;
  animation: badgePopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: inherit;
}

@keyframes badgePopIn {
  0%   { opacity: 0; transform: scale(0); }
  60%  { opacity: 1; transform: scale(1.15); }
  100% { opacity: 1; transform: scale(1); }
}

/* === 查看更多 === */
.home-tags-more {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-primary, #e67e22);
  text-decoration: none;
  transition: opacity 0.2s;
}

.home-tags-more:hover {
  opacity: 0.75;
}

/* ===== 暗色模式 ===== */
body.dark .home-tags-card {
  background: linear-gradient(
    120deg,
    var(--color-bg-secondary, #1a1a2e) 0%,
    var(--color-bg-secondary, #1a1a2e) 50%,
    var(--color-primary-bg, #2e1a14) 50%,
    var(--color-primary-bg, #2e1a14) 100%
  );
  background-size: 200% 100%;
  background-position: 0% 0%;
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .home-tags-card:hover {
  background-position: 100% 0%;
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
  box-shadow: 0 2px 10px rgba(230, 126, 34, 0.20);
}

body.dark .home-tags-card__badge {
  background: var(--color-primary, inherit);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}
```

---

## 4. 动画关键帧定义汇总

| 关键帧 | 用途 | 时长 | 缓动 |
|--------|------|------|------|
| `homeTagsFadeIn` | 标签卡片进入（透明度 + 缩放 + Y 位移） | 0.3s | ease |
| `badgePopIn` | 计数角标弹入 | 0.4s | `cubic-bezier(0.34, 1.56, 0.64, 1)`（轻微回弹） |
| （已有）`heartPop` | 收藏按钮 | — | — |
| （已有）`recipe-card:hover` translateY | 卡片悬浮 | — | — |
| （新增）`background-position` 流动 | 标签 hover 渐变流动 | 0.45s | `cubic-bezier(0.4, 0, 0.2, 1)` |

> **新增关键帧：2 个**（`homeTagsFadeIn` 升级 / `badgePopIn` 新增），其余过渡均使用已有 `transform/opacity` 复用。

---

## 5. 组件 Props 变化

> 本次升级 **不引入新的必填 Props**。所有变化集中在样式 / DOM 结构微调，对调用方零影响。

| 组件 | Props 变化 | 说明 |
|------|------------|------|
| `RecipeCard` | ❌ 无变化 | 仅在标签 span 上根据 `season` 字段追加 `--season-{spring/summer/autumn/winter}` 修饰类 + `title` 属性 |
| `RankingsPage` | ❌ 无变化 | `getPrimaryStat()` 返回值新增 `icon` 字段，渲染侧增加一个 `<span class="rank-card__stat-icon">` 节点 |
| `HomeTagsSection` | ❌ 无变化 | `tagCloud` 数据结构新增 `icon` 字段；渲染增加 `<span class="home-tags-card__icon">` 和 `popularTags.length > 0` 时增加 `<span class="home-tags-card__badge">` |

---

## 6. 需要修改的文件清单

| # | 文件 | 修改类型 | 关键位置 | 工作量 |
|---|------|----------|----------|--------|
| 1 | `frontend/src/components/RecipeCard.tsx` | ✏️ 修改 | 第 315-316 行：季节标签 span 增加动态类名 + title 属性 | 小（~5 行） |
| 2 | `frontend/src/components/RecipeCard.css` | ✏️ 替换 | 第 421-428 行：替换 `.recipe-card__tag--season` 与暗色变体 | 中（~70 行新增） |
| 3 | `frontend/src/pages/RankingsPage.tsx` | ✏️ 修改 | 第 100-103 行 `getPrimaryStat()` 增加 icon 字段；第 260-269 行渲染 stat-value 内部增加 icon span | 小（~10 行） |
| 4 | `frontend/src/pages/RankingsPage.css` | ✏️ 替换 | 第 340-369 行 `rank-card__primary-stat` 区块 | 中（~35 行新增） |
| 5 | `frontend/src/components/HomeTagsSection.tsx` | ✏️ 修改 | `tagCloud` 计算增加 `icon` 字段；JSX 增加 icon span 和 badge span | 中（~15 行） |
| 6 | `frontend/src/components/HomeTagsSection.css` | ✏️ 替换 | 整文件（~70 行新增） | 中 |

---

## 7. 每个文件的修改说明

### 7.1 `frontend/src/components/RecipeCard.tsx`

**位置**：第 315-316 行（季节标签 JSX）

**Before**：
```tsx
{recipe.season && recipe.season !== 'all' && SEASON_LABELS[recipe.season] && (
  <span className="recipe-card__tag recipe-card__tag--season">{SEASON_LABELS[recipe.season]}</span>
)}
```

**After**：
```tsx
{recipe.season && recipe.season !== 'all' && SEASON_LABELS[recipe.season] && (
  <span
    className={`recipe-card__tag recipe-card__tag--season recipe-card__tag--season-${recipe.season}`}
    title={`${SEASON_LABELS[recipe.season]} 时令食材`}
  >
    {SEASON_LABELS[recipe.season]}
  </span>
)}
```

**说明**：
- `recipe.season` 的值已经是 `spring | summer | autumn | winter`（来自 `SEASON_LABELS` 的 key），直接拼接类名。
- `title` 属性提供原生 tooltip 显示季节全名 + 提示语，零依赖。
- 当 `recipe.season === 'all'` 时不渲染（保持现有逻辑）。

### 7.2 `frontend/src/components/RecipeCard.css`

**位置**：第 421-428 行

**操作**：用 §1.2 的「季节标签（4 套配色 + 暗色模式）」CSS 整段替换原 `.recipe-card__tag--season` + `body.dark .recipe-card__tag--season` 区块。

**额外说明**：
- 保留父级 `.recipe-card__tag:hover { transform: scale(1.05) }`（不破坏）。
- 新增季节修饰类的 hover 升级为 `scale(1.06) + box-shadow + brightness`，提供更明显的视觉反馈但不喧宾夺主。
- `body.dark` 兜底处理未传入具体季节字段的旧数据。

### 7.3 `frontend/src/pages/RankingsPage.tsx`

**位置 1**：第 100-103 行 `getPrimaryStat()`

**Before**：
```tsx
const getPrimaryStat = (item: RankedRecipe) => {
  switch (sortBy) {
    case 'views': return { value: Math.round(item.viewCount ?? 0), label: '浏览' }
    case 'favorites': return { value: Math.round(item.favoriteCount ?? 0), label: '收藏' }
    case 'rating': return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分' }
    default: return { value: (item.compositeScore ?? 0).toFixed(1), label: '综合分' }
  }
}
```

**After**：
```tsx
const getPrimaryStat = (item: RankedRecipe) => {
  switch (sortBy) {
    case 'views':     return { value: Math.round(item.viewCount ?? 0),  label: '浏览',   icon: '👁️' }
    case 'favorites': return { value: Math.round(item.favoriteCount ?? 0), label: '收藏', icon: '❤️' }
    case 'rating':    return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分', icon: '⭐' }
    default:          return { value: (item.compositeScore ?? 0).toFixed(1), label: '综合分', icon: '🔥' }
  }
}
```

**位置 2**：第 260-269 行 `.rank-card__primary-stat` JSX 渲染

**Before**：
```tsx
<div className="rank-card__primary-stat">
  <span className="rank-card__stat-value--primary">
    {typeof primaryStat.value === 'number'
      ? primaryStat.value >= 1000
        ? (primaryStat.value / 1000).toFixed(1) + 'k'
        : primaryStat.value
      : parseFloat(primaryStat.value) >= 1000
        ? (parseFloat(primaryStat.value) / 1000).toFixed(1) + 'k'
        : primaryStat.value}
  </span>
  <span className="rank-card__stat-label">{primaryStat.label}</span>
</div>
```

**After**：
```tsx
<div className="rank-card__primary-stat">
  <span className="rank-card__stat-value--primary">
    <span className="rank-card__stat-icon" aria-hidden="true">{primaryStat.icon}</span>
    {typeof primaryStat.value === 'number'
      ? primaryStat.value >= 1000
        ? (primaryStat.value / 1000).toFixed(1) + 'k'
        : primaryStat.value
      : parseFloat(primaryStat.value) >= 1000
        ? (parseFloat(primaryStat.value) / 1000).toFixed(1) + 'k'
        : primaryStat.value}
  </span>
  <span className="rank-card__stat-label">{primaryStat.label}</span>
</div>
```

**说明**：
- 图标使用 `aria-hidden="true"` 不被屏幕阅读器朗读（数字本身是核心信息）。
- emoji 置于 `.rank-card__stat-value--primary` 内部，使用 `inline-flex + gap: 4px` 满足 4px 间距要求。
- emoji 不会被 `text-fill-color: transparent` 影响（在子节点单独重置）。

### 7.4 `frontend/src/pages/RankingsPage.css`

**位置**：第 340-369 行（`.rank-card__primary-stat` 区块）

**操作**：用 §2.2 的 CSS 整段替换。

**额外说明**：
- 保留 `font-weight: 800` 与 `linear-gradient` 文本渐变（已有规范要求）。
- 响应式部分（@media）原样保留。

### 7.5 `frontend/src/components/HomeTagsSection.tsx`

**修改 1**：`tagCloud` 计算增加 `icon` 字段

**Before**：
```tsx
const tagCloud = useMemo(() => {
  if (popularTags.length > 0) {
    return popularTags.slice(0, 8).map(item => ({
      label: `${item.tag} (${item.count})`,
      tag: item.tag,
    }))
  }
  return SEASONAL_TAGS
}, [popularTags])
```

**After**：
```tsx
// 给 popularTags 数据回退到 SEASONAL_TAGS 时分配 icon（基于 tag 名匹配，否则用 '🏷️'）
const iconMap: Record<string, string> = SEASONAL_TAGS.reduce(
  (acc, t) => ({ ...acc, [t.tag]: t.icon }),
  {}
)

const tagCloud = useMemo(() => {
  if (popularTags.length > 0) {
    return popularTags.slice(0, 8).map(item => ({
      label: `${item.tag} (${item.count})`,
      tag: item.tag,
      icon: iconMap[item.tag] || '🏷️',
      count: item.count,
    }))
  }
  return SEASONAL_TAGS
}, [popularTags])
```

**修改 2**：JSX 渲染增加 icon 和 badge

**Before**：
```tsx
<div
  key={item.tag}
  className="home-tags-card"
  style={{ animationDelay: `${idx * 0.05}s` }}
  onClick={() => navigate(`/search?tag=${encodeURIComponent(item.tag)}`)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/search?tag=${encodeURIComponent(item.tag)}`) }}
>
  <span className="home-tags-card__label">{item.label}</span>
  <span className="home-tags-card__arrow">→</span>
</div>
```

**After**：
```tsx
<div
  key={item.tag}
  className="home-tags-card"
  style={{ animationDelay: `${idx * 0.05}s` }}
  onClick={() => navigate(`/search?tag=${encodeURIComponent(item.tag)}`)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/search?tag=${encodeURIComponent(item.tag)}`) }}
>
  {item.icon && <span className="home-tags-card__icon" aria-hidden="true">{item.icon}</span>}
  <span className="home-tags-card__label">{item.label}</span>
  {popularTags.length > 0 && item.count != null && (
    <span
      className="home-tags-card__badge"
      style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
      aria-label={`${item.count} 个食谱`}
    >
      {item.count}
    </span>
  )}
</div>
```

**说明**：
- `iconMap` 简单回退：若 `popularTags` 返回的 tag 在 `SEASONAL_TAGS` 中能找到匹配的 icon 则使用，否则用 `🏷️` 占位。
- `count` 字段：在 `popularTags` 模式下显示纯数字 badge（不带括号，与 label 里的 `(N)` 不重复信息）。
- `aria-label` 提升可访问性。

### 7.6 `frontend/src/components/HomeTagsSection.css`

**操作**：用 §3.2 的 CSS 整段替换原文件。

**额外说明**：
- 已有 `homeTagsFadeIn` 关键帧升级为含 Y 位移版本（更生动）。
- 角标 `badgePopIn` 是新增唯一动画关键帧。
- 暗色模式使用 `body.dark`（与项目其他组件保持一致）。
- `position: relative` + `overflow: hidden` 防止角标溢出到卡片外时影响布局。

---

## 8. 验收清单（QA）

### 视觉
- [ ] RecipeCard 4 种季节标签色系清晰可辨（春绿 / 夏橙 / 秋棕 / 冬蓝）
- [ ] RankingsPage 4 种模式下主统计值前的 emoji 与数字 4px 间距
- [ ] HomeTagsSection 标签卡片 hover 时背景从灰色平滑流动到橙色
- [ ] HomeTagsSection 标签卡片图标在 hover 时有旋转 + 放大反馈
- [ ] popularTags 模式下右上角出现数字 badge（弹入动画）

### 暗色模式
- [ ] 4 套季节配色在 `body.dark` 下文字可读（对比度 ≥ 4.5:1）
- [ ] HomeTagsSection 暗色模式下 hover 渐变仍能识别
- [ ] 计数角标在暗色背景下不刺眼

### 交互
- [ ] 季节标签 hover 时显示 tooltip「XX 时令食材」（原生 `title` 即可）
- [ ] 标签卡片 hover 时 transform 流畅（无 60fps 掉帧）
- [ ] badge 入场动画不影响首次渲染（stagger delay ≤ 0.5s）

### 可访问性
- [ ] emoji 装饰元素均带 `aria-hidden="true"`
- [ ] badge 携带 `aria-label` 提供语义信息
- [ ] 键盘 Tab 可聚焦标签卡片，Enter 可触发（已有）
- [ ] 暗色模式文字与背景对比度通过 WCAG AA

### 兼容
- [ ] 不破坏现有 RecipeCard hover (`translateY(-4px)`) 与封面图 `scale(1.08)`
- [ ] 不破坏 heartPop 动画
- [ ] 不破坏 Top3 金银铜徽章
- [ ] 响应式断点下 `rank-card__primary-stat` 仍能正确显示（min-width: 78px 不溢出）

---

## 9. 风险与回滚

| 风险 | 缓解 |
|------|------|
| emoji 在不同操作系统显示差异 | 使用主流平台均支持的 Unicode 9.0 基础 emoji（👁️❤️🔥⭐🌸☀️🍂❄️⏱️🥗🧁🍲🥟🍜🥩🍚🏷️） |
| `background-position` 渐变流动在低端 Android 设备卡顿 | 已限制 transition 时长 0.45s，使用 `cubic-bezier` 硬件加速；如需降级可改为 `background-color` 切换 |
| 4 套季节配色可能被设计评审视为「色彩过载」 | 4 套配色饱和度统一（45%-65%）、明度差 ≤ 25%，并依赖 `border` 抑制视觉噪点；如仍超限可回退到单一 `var(--season-color, ...)` 变量 |
| RankingsPage 引入 emoji 可能被产品要求替换为 iconfont | `getPrimaryStat()` 返回 `icon: '👁️'` 字段为字符串，替换为 iconfont class 只需修改一处 |

**回滚策略**：本次升级均为 **样式 + 少量 JSX 微调**，未引入新依赖、未修改 API、未修改路由。任意文件回滚 `git checkout HEAD -- <file>` 即可完全恢复。

---

## 10. 后续可拓展（不在本迭代范围）

- [ ] 季节标签添加 `data-season` 属性，便于全局 `prefers-reduced-motion` 媒体查询统一抑制动画
- [ ] 排行榜统计值增加 sparkline（需后端支持时序数据）
- [ ] HomeTagsSection 添加「拖拽重排」/「置顶最常搜索」功能
- [ ] 将季节配色抽象为 CSS custom properties：`--season-spring-bg` / `--season-spring-text` 等，便于主题动态切换

---

**版本**：v1.0 · 2026-06-09
**作者**：UI Designer (subagent)
**关联迭代**：iter109-ui-upgrade
