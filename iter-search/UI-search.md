# UI 设计规范：搜索页与分类浏览体验优化

> **迭代**：#116 / iter-search
> **覆盖页面**：`SearchPage` / `CategoryDetailPage` / `CategoryCards` / `SearchAutocomplete`（间接）
> **作者**：ui-designer (subagent)
> **日期**：2026-06-09
> **状态**：设计稿 — 待开发
> **技术栈**：React 18 + CSS（无 UI 框架，纯 CSS 变量）
> **暗色模式**：`body.dark` 选择器，CSS 变量 `--color-xxx`

---

## 目录

1. [设计总览](#1-设计总览)
2. [设计 Token（新增 `--search-*` 变量）](#2-设计-token新增---search--变量)
3. [A. 搜索结果页 (SearchPage) 体验增强](#a-搜索结果页-searchpage-体验增强)
4. [B. 分类浏览页面优化](#b-分类浏览页面优化)
5. [C. 移动端搜索体验](#c-移动端搜索体验)
6. [响应式断点规范](#6-响应式断点规范)
7. [暗色模式对照表](#7-暗色模式对照表)
8. [微交互与过渡动画规范](#8-微交互与过渡动画规范)
9. [可访问性 (a11y) 规范](#9-可访问性-a11y-规范)
10. [实施 Checklist（CSS-only / TSX 变更矩阵）](#10-实施-checklistcss-only--tsx-变更矩阵)

---

## 1. 设计总览

### 1.1 三大改动目标

| 模块 | 现状痛点 | 设计目标 |
|------|----------|----------|
| **搜索结果页** | 单一网格视图、筛选摘要缺失、空结果冷清、热门词视觉平淡 | 网格/列表切换 + 筛选摘要 chip + 随机推荐 + 热门词带热度条 + 历史时间戳 |
| **分类浏览** | 分类卡信息密度低、详情页无排序/难度/内联搜索、缺少多维标签 | 卡片加数量/描述、详情页加排序/难度/搜索、菜系/口味标签聚合 |
| **移动端** | 搜索栏在内容流中、筛选横向滚动溢出、列表视图缺失 | sticky 顶栏 + 焦点展开全宽 + 抽屉式筛选 + 列表/网格移动端布局 |

### 1.2 设计原则

- **渐进增强**：不破坏现有组件契约；新增功能以「可选状态」/「抽屉」/「吸顶」叠加
- **变量驱动**：所有新增 token 走 `--search-*` 命名空间，浅/暗双套值
- **触摸友好**：所有可点击元素最小 `44×44px`，移动端间距 16px
- **可降级**：抽屉/吸顶在 JS 加载失败时回到普通布局（CSS-only 友好）
- **数据前置**：空结果态要求 3 道随机食谱，需要后端补 `GET /recipes/random?count=3` 端点（或前端用 `qualityScore DESC` + 随机种子从 `/recipes?sortBy=hot` 取 N 条）

### 1.3 改动范围速览

| 范围 | CSS-only | TSX 改动 | 后端依赖 |
|------|----------|----------|----------|
| 视图切换（网格/列表） | ✅ 仅 CSS | ⚠ 需新增按钮 + localStorage | ❌ |
| 筛选摘要 chip | ✅ 仅 CSS | ⚠ 在结果信息处动态拼接 | ❌ |
| 空结果随机推荐 | ✅ 卡片样式 | ⚠ 新增 `randomRecipes` state | ⚠ 需新端点 |
| 热门词带热度条 | ✅ CSS | ⚠ 数据中已有 `count`，加 `max` 归一 | ❌（已存在） |
| 搜索历史时间戳 | ✅ CSS | ⚠ 写入时记录时间戳 | ❌ |
| CategoryCards 升级 | ✅ CSS | ⚠ 需后端提供 `count`（或前端 mock 初始值） | ⚠ 需新端点 |
| 分类详情排序/难度/搜索 | ✅ CSS | ⚠ 排序/难度/搜索全为前端状态 | ❌（API 已支持） |
| 分类多维标签 | ✅ CSS | ⚠ 聚合 + 展示 | ⚠ 需 `categoryTags` 字段（数据库已有，前端 Recipe 类型缺） |
| 移动端 sticky 顶栏 | ✅ CSS | ⚠ 单独组件或 sticky 容器 | ❌ |
| 抽屉式筛选 | ✅ CSS（`<details>` 或 checkbox hack） | ⚠ 新增按钮切换状态 | ❌ |
| 列表视图移动端布局 | ✅ CSS | ❌ | ❌ |

---

## 2. 设计 Token（新增 `--search-*` 变量）

> 全部追加到 `frontend/src/global.css` 的 `:root` 与 `body.dark` 块中。
> 命名规范：浅/暗双套，覆盖所有新增交互状态。

### 2.1 完整 Token 清单

```css
/* ── 在 :root 中追加（紧跟现有 --color-* 之后） ── */
:root {
  /* 搜索页背景与容器 */
  --search-bg:            var(--color-bg, #fdf8f4);
  --search-surface:       var(--color-card, #ffffff);
  --search-surface-alt:   var(--color-bg-secondary, #faf6f1);

  /* 搜索结果区顶部 sticky 背景（含模糊） */
  --search-sticky-bg:     rgba(253, 248, 244, 0.86);
  --search-sticky-blur:   saturate(180%) blur(14px);
  --search-sticky-border: var(--color-border, #e8e0d8);

  /* 视图切换按钮 */
  --search-view-btn-bg:   var(--color-card, #ffffff);
  --search-view-btn-border: var(--color-border, #e8e0d8);
  --search-view-btn-active-bg: var(--color-primary-bg, #fff3ed);
  --search-view-btn-active-color: var(--color-primary, #e8663e);
  --search-view-btn-icon:  var(--color-text-secondary, #666666);

  /* 筛选摘要 chip（粘性条） */
  --search-chip-bg:       var(--color-primary-bg, #fff3ed);
  --search-chip-color:    var(--color-primary, #e8663e);
  --search-chip-border:   color-mix(in srgb, var(--color-primary, #e8663e) 30%, transparent);
  --search-chip-divider:  var(--color-text-muted, #cccccc);

  /* 热门词热度条（卡片样式） */
  --search-hot-card-bg:   var(--color-card, #ffffff);
  --search-hot-card-border: var(--color-border, #e8e0d8);
  --search-hot-card-rank-bg: var(--color-bg-secondary, #faf6f1);
  --search-hot-card-rank-top: #ff6b35;     /* 排名前三用强调色 */
  --search-hot-bar-track: var(--color-border, #e8e0d8);
  --search-hot-bar-fill:  var(--color-primary, #e8663e);
  --search-hot-bar-fill-top: linear-gradient(90deg, #ff6b35 0%, #ffa07a 100%);

  /* 搜索历史时间戳 */
  --search-history-time:  var(--color-text-muted, #999999);
  --search-history-bg:    var(--color-bg-secondary, #faf6f1);

  /* 随机推荐空状态（带推荐卡片） */
  --search-recommend-bg:  var(--color-card, #ffffff);
  --search-recommend-border: var(--color-border, #e8e0d8);
  --search-recommend-shadow: 0 2px 10px rgba(232, 102, 62, 0.08);
  --search-recommend-shadow-hover: 0 6px 18px rgba(232, 102, 62, 0.16);

  /* 分类卡（升级） */
  --search-cat-card-bg:   var(--color-card, #ffffff);
  --search-cat-card-border: var(--color-border, #e8e0d8);
  --search-cat-card-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  --search-cat-card-shadow-hover: 0 8px 22px color-mix(in srgb, var(--cat-color, #e8663e) 18%, transparent);
  --search-cat-card-count-bg: color-mix(in srgb, var(--cat-color, #e8663e) 12%, transparent);
  --search-cat-card-count-color: var(--cat-color, #e8663e);

  /* 分类详情头部（增强） */
  --search-cat-header-bg: color-mix(in srgb, var(--cat-color, #e8663e) 10%, var(--color-card, #faf8f5));
  --search-cat-header-border: color-mix(in srgb, var(--cat-color, #e8663e) 20%, transparent);
  --search-cat-search-bg: var(--color-card, #ffffff);
  --search-cat-search-border: var(--color-border, #e8e0d8);
  --search-cat-search-focus: var(--color-primary, #e8663e);

  /* 多维分类标签 */
  --search-dim-tag-bg:    var(--color-bg-secondary, #faf6f1);
  --search-dim-tag-border: var(--color-border, #e8e0d8);
  --search-dim-tag-color: var(--color-text-secondary, #666666);
  --search-dim-tag-icon:  var(--color-primary, #e8663e);

  /* 抽屉（移动端筛选） */
  --search-drawer-bg:     var(--color-card, #ffffff);
  --search-drawer-overlay: rgba(0, 0, 0, 0.45);
  --search-drawer-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
  --search-drawer-handle: var(--color-text-muted, #cccccc);
  --search-drawer-radius: 20px 20px 0 0;
  --search-drawer-handle-size: 36px;

  /* 列表视图卡片（搜索结果） */
  --search-list-bg:       var(--color-card, #ffffff);
  --search-list-border:   var(--color-border, #e8e0d8);
  --search-list-shadow:   0 1px 4px rgba(0, 0, 0, 0.05);
  --search-list-shadow-hover: 0 4px 14px rgba(232, 102, 62, 0.12);
  --search-list-thumb-size-desktop: 140px;
  --search-list-thumb-size-mobile:  100px;

  /* 间距与尺寸（搜索页专属） */
  --search-radius-sm:     8px;
  --search-radius-md:     12px;
  --search-radius-lg:     16px;
  --search-radius-pill:   999px;
  --search-gap-xs:        6px;
  --search-gap-sm:        10px;
  --search-gap-md:        16px;
  --search-gap-lg:        24px;
  --search-touch-target:  44px;        /* 最小触摸区域 */
  --search-sticky-z:      50;
  --search-drawer-z:      80;
  --search-overlay-z:     70;
}

/* ── body.dark 中追加 ── */
body.dark {
  --search-bg:            #12121e;
  --search-surface:       #1e1e32;
  --search-surface-alt:   #1a1a2e;

  --search-sticky-bg:     rgba(18, 18, 30, 0.86);
  --search-sticky-blur:   saturate(180%) blur(14px);
  --search-sticky-border: #2e2e48;

  --search-view-btn-bg:   #282840;
  --search-view-btn-border: #3e3e58;
  --search-view-btn-active-bg: #2e1a14;
  --search-view-btn-active-color: #ff8c5a;
  --search-view-btn-icon: #9898b0;

  --search-chip-bg:       #2e1a14;
  --search-chip-color:    #ff8c5a;
  --search-chip-border:   rgba(255, 140, 90, 0.30);
  --search-chip-divider:  #3e3e58;

  --search-hot-card-bg:   #1e1e32;
  --search-hot-card-border: #2e2e48;
  --search-hot-card-rank-bg: #282840;
  --search-hot-card-rank-top: #ff8c5a;
  --search-hot-bar-track: #2e2e48;
  --search-hot-bar-fill:  #ff8c5a;
  --search-hot-bar-fill-top: linear-gradient(90deg, #ff8c5a 0%, #ffb380 100%);

  --search-history-time:  #686880;
  --search-history-bg:    #1a1a2e;

  --search-recommend-bg:  #1e1e32;
  --search-recommend-border: #2e2e48;
  --search-recommend-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  --search-recommend-shadow-hover: 0 6px 18px rgba(255, 140, 90, 0.18);

  --search-cat-card-bg:   #1e1e32;
  --search-cat-card-border: #2e2e48;
  --search-cat-card-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  --search-cat-card-shadow-hover: 0 8px 22px rgba(0, 0, 0, 0.4);
  --search-cat-card-count-bg: rgba(232, 102, 62, 0.18);
  --search-cat-card-count-color: #ff8c5a;

  --search-cat-header-bg: rgba(232, 102, 62, 0.10);
  --search-cat-header-border: rgba(232, 102, 62, 0.25);
  --search-cat-search-bg: #282840;
  --search-cat-search-border: #3e3e58;
  --search-cat-search-focus: #ff8c5a;

  --search-dim-tag-bg:    #282840;
  --search-dim-tag-border: #3e3e58;
  --search-dim-tag-color: #9898b0;
  --search-dim-tag-icon:  #ff8c5a;

  --search-drawer-bg:     #1e1e32;
  --search-drawer-overlay: rgba(0, 0, 0, 0.6);
  --search-drawer-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
  --search-drawer-handle: #3e3e58;

  --search-list-bg:       #1e1e32;
  --search-list-border:   #2e2e48;
  --search-list-shadow:   0 1px 4px rgba(0, 0, 0, 0.3);
  --search-list-shadow-hover: 0 4px 14px rgba(255, 140, 90, 0.15);
}
```

### 2.2 字体 Token（复用现有，无新增）

| 用途 | 字体规格 |
|------|----------|
| 大标题（`search-result-info` 关键词） | 16px / 600 / `var(--color-text)` |
| 筛选摘要 chip | 12px / 500 / `var(--search-chip-color)` |
| 热门词卡片标题 | 14px / 600 / `var(--color-text)` |
| 热度数字（小） | 11px / 700 / `var(--color-text-muted)` |
| 排名数字（前 3） | 14px / 800 / `var(--search-hot-card-rank-top)` |
| 搜索历史时间戳 | 11px / 400 / `var(--search-history-time)` |
| 列表卡片标题 | 15px / 600 / `var(--color-text)` |
| 列表卡片元信息 | 12px / 400 / `var(--color-text-secondary)` |
| 分类卡描述 | 11px / 400 / `var(--color-text-muted)` 两行省略 |
| 分类卡数量 | 11px / 700 / `var(--search-cat-card-count-color)` |
| 抽屉标题 | 16px / 600 / `var(--color-text)` |

### 2.3 阴影与圆角体系

| Token | 桌面 | 移动 |
|-------|------|------|
| 卡片默认 | `--shadow-sm` = `0 1px 4px rgba(0,0,0,0.05)` | 同 |
| 卡片 hover | `0 6px 18px rgba(232,102,62,0.12)` | 仅 `:active` 抬升 1px |
| 抽屉阴影 | `0 -8px 24px rgba(0,0,0,0.12)` | 同 |
| 圆角-小（chip） | `var(--search-radius-sm)` = 8px | 8px |
| 圆角-中（卡） | `var(--search-radius-md)` = 12px | 10px |
| 圆角-大（头） | `var(--search-radius-lg)` = 16px | 16px |
| 圆角-pill | `var(--search-radius-pill)` = 999px | 999px |

---

## 3. A. 搜索结果页 (SearchPage) 体验增强

### 3.1 视图切换：网格 / 列表

**交互**
- 位置：结果区右上角，紧贴 `.search-result-info` 行右端
- 视觉：双段 pill 按钮（网格图标 ⬛ / 列表图标 ☰），激活段主色填充
- 状态：默认走用户上次选择（localStorage `search_view_mode`），无值则 `grid`
- 切换：仅切换结果区布局 className，**不重新请求 API**

**视觉规范（桌面）**

```
[网格 ⬛  |  列表 ☰]   86 × 36 px，单段 43 × 36 px
  active 段: 背景 --search-view-btn-active-bg，文字 --search-view-btn-active-color
  inactive 段: 背景透明，文字 --search-view-btn-icon
  容器背景: --search-view-btn-bg
  容器边框: 1.5px solid --search-view-btn-border
  圆角: var(--search-radius-pill)
  阴影: 无（仅 hover/focus 显示 0 0 0 3px color-mix(--search-view-btn-active-color 15%, transparent)）
```

**TSX 改动**
```tsx
const VIEW_KEY = 'search_view_mode'
type ViewMode = 'grid' | 'list'
const [view, setView] = useState<ViewMode>(
  (localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid'
)
const handleViewChange = (v: ViewMode) => {
  setView(v)
  localStorage.setItem(VIEW_KEY, v)
}

// 在 .search-result-info 同一行右端渲染：
<div className="search-view-toggle" role="group" aria-label="切换视图">
  <button
    className={`search-view-btn ${view === 'grid' ? 'is-active' : ''}`}
    onClick={() => handleViewChange('grid')}
    aria-label="网格视图"
    aria-pressed={view === 'grid'}
  >
    <GridIcon />  {/* SVG 16×16，2×2 四个方块 */}
  </button>
  <button
    className={`search-view-btn ${view === 'list' ? 'is-active' : ''}`}
    onClick={() => handleViewChange('list')}
    aria-label="列表视图"
    aria-pressed={view === 'list'}
  >
    <ListIcon />  {/* SVG 16×16，三条横线 */}
  </button>
</div>
```

**CSS 关键片段**

```css
.search-result-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 20px;
}

.search-view-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--search-view-btn-bg);
  border: 1.5px solid var(--search-view-btn-border);
  border-radius: var(--search-radius-pill);
  padding: 3px;
  gap: 0;
}

.search-view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 32px;
  border: 0;
  background: transparent;
  border-radius: var(--search-radius-pill);
  color: var(--search-view-btn-icon);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.search-view-btn:hover:not(.is-active) {
  background: color-mix(in srgb, var(--search-view-btn-icon) 8%, transparent);
}

.search-view-btn.is-active {
  background: var(--search-view-btn-active-bg);
  color: var(--search-view-btn-active-color);
}

.search-view-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--search-view-btn-active-color) 25%, transparent);
}

/* 列表视图容器：在网格容器基础上加 --view=list */
.search-grid--list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-grid--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
```

### 3.2 列表视图卡片规范

**结构（TSX）**
```tsx
<Link to={`/recipe/${r.id}`} className="search-list-item">
  <div className="search-list-item__thumb">
    <img src={r.coverImage} alt="" loading="lazy" />
  </div>
  <div className="search-list-item__body">
    <h3 className="search-list-item__title" dangerouslySetInnerHTML={{ __html: highlightText(r.title, q) }} />
    <p className="search-list-item__desc">{r.description || r.story || '点击查看详细做法'}</p>
    <div className="search-list-item__meta">
      <span>⏱ {r.cookTime || '-'} 分钟</span>
      <span className="dot">·</span>
      <span>👤 {r.author || '匿名'}</span>
      {r.avgRating ? <><span className="dot">·</span><span>⭐ {r.avgRating.toFixed(1)}</span></> : null}
    </div>
  </div>
  <div className="search-list-item__action" aria-hidden="true">›</div>
</Link>
```

**视觉规范**

```
桌面（≥1024px）
  容器: 横长方形，140px 高
  内边距: 12px
  圆角: var(--search-radius-md)
  背景: var(--search-list-bg)
  边框: 1px solid var(--search-list-border)
  阴影: var(--search-list-shadow)
  布局: flex row，gap 14px
  缩略图: 116×116px，圆角 10px，4:3 比例（用 aspect-ratio 兜底）
  标题: 15px / 600，单行省略
  描述: 12px / 400，2 行省略
  meta: 11px / 400，dot 分隔
  右侧箭头: 18px，颜色 muted，hover 移位 4px

平板（768-1023px）
  缩略图: 100×100px
  meta: 隐藏 author 字段
  圆角: 10px

手机（<768px）
  缩略图: 88×88px
  标题: 14px
  描述: 隐藏
  meta: 只显示 ⏱ + ⭐

:hover（桌面）
  边框: 1px solid var(--color-primary)
  阴影: var(--search-list-shadow-hover)
  transform: translateY(-1px)
  箭头: translateX(4px)

:active
  transform: scale(0.99)
```

**CSS 关键片段**

```css
.search-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: var(--search-list-bg);
  border: 1px solid var(--search-list-border);
  border-radius: var(--search-radius-md);
  box-shadow: var(--search-list-shadow);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.search-list-item:hover {
  border-color: var(--color-primary);
  box-shadow: var(--search-list-shadow-hover);
  transform: translateY(-1px);
}

.search-list-item__thumb {
  flex-shrink: 0;
  width: 116px;
  height: 116px;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-skeleton-from, #f0e8e0);
}

.search-list-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.search-list-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-list-item__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-list-item__title mark {
  background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  color: var(--color-primary-dark);
  padding: 0 2px;
  border-radius: 3px;
}

.search-list-item__desc {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.search-list-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.search-list-item__meta .dot {
  color: var(--color-border);
}

.search-list-item__action {
  flex-shrink: 0;
  width: 24px;
  font-size: 20px;
  color: var(--color-text-muted);
  text-align: center;
  transition: transform 0.2s, color 0.2s;
}

.search-list-item:hover .search-list-item__action {
  color: var(--color-primary);
  transform: translateX(4px);
}

@media (max-width: 1023px) {
  .search-list-item__thumb { width: 100px; height: 100px; }
  .search-list-item__title { font-size: 14px; }
}

@media (max-width: 767px) {
  .search-list-item {
    padding: 10px;
    gap: 10px;
  }
  .search-list-item__thumb { width: 88px; height: 88px; border-radius: 8px; }
  .search-list-item__desc { display: none; }
  .search-list-item__meta {
    gap: 4px;
    font-size: 10px;
  }
  /* 手机端只显示前两个 meta */
  .search-list-item__meta .dot:nth-of-type(n+3),
  .search-list-item__meta span:nth-of-type(n+4) {
    display: none;
  }
}
```

### 3.3 结果信息增强：筛选摘要 chip

**位置**：`search-result-info` 行内，紧跟「共找到 N 个食谱」之后
**格式**：`[中餐 ×] · [简单 ×] · [最新发布 ×]` 三段，每段可单独删除

**TSX 改动**
```tsx
const filterSummary = useMemo(() => {
  const parts: Array<{ key: string; label: string; removeKey: string; removeValue: string }> = []
  filterCategories.forEach(c => {
    parts.push({ key: `cat-${c}`, label: CATEGORIES[c] || c, removeKey: 'categories', removeValue: c })
  })
  if (filterDifficulty) {
    parts.push({ key: 'diff', label: DIFFICULTIES[filterDifficulty], removeKey: 'difficulty', removeValue: '' })
  }
  if (filterSortBy) {
    parts.push({ key: 'sort', label: SORT_OPTIONS[filterSortBy], removeKey: 'sortBy', removeValue: '' })
  }
  return parts
}, [filterCategories, filterDifficulty, filterSortBy])

const removeFilter = (item: typeof filterSummary[number]) => {
  if (item.removeKey === 'categories') {
    const next = filterCategories.filter(c => c !== item.removeValue)
    setFilterCategories(next)
    setSearchParams(buildUrlParams({ categories: next.join(',') }))
  } else {
    setFilterChange(item.removeKey as any, item.removeValue)
  }
}
```

**视觉规范**

```
[共找到 N 个食谱]  ·  [中餐 ×]  ·  [简单 ×]  ·  [最新发布 ×]

chip 视觉
  内边距: 4px 4px 4px 10px
  字体: 12px / 500
  颜色: --search-chip-color
  背景: --search-chip-bg
  边框: 1px solid --search-chip-border
  圆角: var(--search-radius-pill)
  gap: 6px

  × 按钮: 16×16, 内嵌 10px 圆点, hover 背景 rgba(0,0,0,0.06)
  × 按钮触摸目标外扩到 24×24 (padding)

分隔点 ·: var(--search-chip-divider), 12px, 用户禁用首尾点

整行: 12px 间距, 8px 垂直 padding, 横向滚动兜底（移动端）
```

**CSS 关键片段**

```css
.search-result-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0 0 20px;
  padding: 12px 14px;
  background: var(--search-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--search-radius-md);
}

.search-result-info__count {
  color: var(--color-text);
  font-weight: 500;
}

.search-result-info__count strong {
  color: var(--color-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.search-result-info__chips {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.search-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--search-chip-color);
  background: var(--search-chip-bg);
  border: 1px solid var(--search-chip-border);
  border-radius: var(--search-radius-pill);
  line-height: 1.2;
  min-height: 26px;
  transition: border-color 0.2s, background 0.2s;
}

.search-chip:hover {
  background: color-mix(in srgb, var(--search-chip-color) 12%, var(--search-chip-bg));
}

.search-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin: 0;
  margin-right: 2px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--search-chip-color);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  /* 触摸区域外扩 */
  position: relative;
}
.search-chip__remove::before {
  content: '';
  position: absolute;
  inset: -4px;
}
.search-chip__remove:hover {
  background: color-mix(in srgb, var(--search-chip-color) 18%, transparent);
}

.search-result-info__divider {
  width: 1px;
  height: 12px;
  background: var(--search-chip-divider);
}

@media (max-width: 767px) {
  .search-result-info {
    padding: 10px 12px;
    gap: 8px;
    font-size: 13px;
  }
  .search-chip {
    font-size: 11px;
  }
}
```

### 3.4 空结果趣味引导：随机推荐食谱

**触发条件**：`!loading && q && !hasResults` 时
**数据**：
- 方案 A（推荐，需后端）：`GET /recipes/random?count=3&sortBy=hot&qualityScoreMin=70`
- 方案 B（降级，前端实现）：在 `hotSearches` 已有 API 上，请求 `searchRecipes({ q: '热门', sortBy: 'newest', pageSize: 12 })` 后从中 `Math.random` 抽 3 条
- **优先选方案 A**，本规范以 A 为准

**TSX 改动**
```tsx
const [randomRecipes, setRandomRecipes] = useState<Recipe[]>([])

useEffect(() => {
  if (!loading && q && total === 0 && page === 1 && randomRecipes.length === 0) {
    getRandomRecipes({ count: 3 })
      .then(res => setRandomRecipes(res.data?.list || []))
      .catch(() => setRandomRecipes([]))
  }
}, [loading, q, total, page])

// 在 .search-empty--no-results 下方加：
{randomRecipes.length > 0 && (
  <div className="search-recommend">
    <h3 className="search-recommend__title">
      没找到「{q}」的食谱，试试这些热门：
    </h3>
    <div className="search-recommend__grid">
      {randomRecipes.map(r => <RecommendCard key={r.id} recipe={r} />)}
    </div>
  </div>
)}
```

**`<RecommendCard />` 视觉规范**

```
桌面
  卡片: 240×~320, 圆角 var(--search-radius-md)
  背景: var(--search-recommend-bg)
  边框: 1px solid var(--search-recommend-border)
  阴影: var(--search-recommend-shadow)
  缩略图: 240×180, 4:3, 圆角顶部
  内边距: 12px 14px 14px
  标题: 14px / 600, 单行省略
  meta: 11px / 400, 横向 flex, gap 8px
  hover:
    阴影: var(--search-recommend-shadow-hover)
