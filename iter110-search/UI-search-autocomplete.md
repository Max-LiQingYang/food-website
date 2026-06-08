# UI 设计规范：搜索建议下拉增强

> **组件**: `SearchAutocomplete.tsx`
> **迭代**: iter110-search
> **作者**: ui-designer (subagent)
> **日期**: 2026-06-09
> **状态**: 设计稿 — 待实现

---

## 1. 概述

在已有的 `SearchAutocomplete` 组件上叠加视觉信息层次：从纯文字列表升级为「分组标题 + 缩略图卡片 + 标签/分类 chip」的复合下拉结构，**不破坏**现有 debounce、键盘导航、外部点击关闭、搜索历史等核心行为。

### 1.1 设计目标

| # | 目标 | 衡量 |
|---|------|------|
| 1 | 信息密度提升 | 下拉条目从纯文字升级为「缩略图 + 标题 + 描述 + 跳转标识」 |
| 2 | 视觉分组清晰 | 通过分组标题（🏷️ / 📂 / 🕐 / 🔥）和分隔线区分四个区域 |
| 3 | 引导高效检索 | 标签/分类 chip 一键触发二次搜索 |
| 4 | 数据驱动 | 移除硬编码 `HOT_SEARCHES`，改用 `/hot-searches` API |
| 5 | 优雅降级 | 暗色模式 + 移动端响应式 + 图片加载失败回退 |

### 1.2 设计原则

- **渐进增强**：保留所有现有功能；新增视觉为「叠加」而非「替换」。
- **行高友好**：所有可点击项 `min-height: 44px`，符合移动端触摸规范。
- **键盘可达**：chip 与列表项都参与 `↑↓` 导航，并具有可见 focus 态。
- **视觉克制**：缩略图仅在 API 建议项出现；本地建议保持轻量 🕐 图标。

---

## 2. 下拉结构（DOM 树）

```
.search-autocomplete
├── input.search-autocomplete__input
└── .search-autocomplete__dropdown                (max-height: 360px, overflow-y: auto)
    ├── .search-autocomplete__group               (匹配标签)
    │   ├── .search-autocomplete__group-title     "🏷️ 匹配标签"
    │   └── .search-autocomplete__chips
    │       ├── .search-autocomplete__chip        [番茄]
    │       ├── .search-autocomplete__chip        [鸡蛋]
    │       └── ...                               [家常] [快手]
    ├── .search-autocomplete__group               (匹配分类)
    │   ├── .search-autocomplete__group-title     "📂 匹配分类"
    │   └── .search-autocomplete__chips
    │       └── .search-autocomplete__chip--category
    │           ├── [中式]
    │           └── [快手菜]
    ├── .search-autocomplete__divider             (分隔线)
    ├── ul.search-autocomplete__list              (API 建议 + 本地建议)
    │   ├── li.search-autocomplete__item         (API 带缩略图)
    │   │   ├── .search-autocomplete__thumb       <img /> 40×30
    │   │   ├── .search-autocomplete__body
    │   │   │   ├── .search-autocomplete__title
    │   │   │   └── .search-autocomplete__desc    (可选描述)
    │   │   └── .search-autocomplete__goto        "详情 ›"
    │   ├── li.search-autocomplete__item         (本地 🕐)
    │   │   ├── .search-autocomplete__icon
    │   │   └── .search-autocomplete__title
    │   └── ... (骨架屏 / 提示 / 加载态)
    ├── .search-autocomplete__divider
    ├── .search-autocomplete__section              (搜索历史)
    │   ├── .search-autocomplete__section-title   "🕐 搜索历史"
    │   └── ul.search-autocomplete__mini-list
    │       ├── li 番茄炒蛋
    │       └── li 红烧肉
    ├── .search-autocomplete__divider
    ├── .search-autocomplete__section              (热门搜索)
    │   ├── .search-autocomplete__section-title   "🔥 热门搜索"
    │   └── ul.search-autocomplete__mini-list
    │       ├── li 鸡蛋、番茄   (骨架屏 / 加载态)
    │       └── li 鸡肉、土豆
    └── .search-autocomplete__footer               (清除历史)
        └── button.search-autocomplete__clear     "清除搜索历史"
```

> **重要**：原 `<ul>` 直接渲染所有 items 的结构会被拆分为「`<ul>` 仅承载核心建议项 + 顶部两个 `.search-autocomplete__group` + 底部两个 `.search-autocomplete__section`」的复合结构。所有 `<li>` 仍保持在 `<ul>` 中以保证可访问性。

---

## 3. 完整 CSS

> 以下 CSS **完整替换** `frontend/src/components/SearchAutocomplete.css`。
> CSS 变量假定项目已定义；未定义时使用回退值（与原文件一致）。

```css
/* ============================================================
   SearchAutocomplete — iter110-search 增强版
   ============================================================ */

.search-autocomplete {
  position: relative;
  flex: 1;
}

/* ---------- Input ---------- */

.search-autocomplete__input {
  width: 100%;
  padding: 10px 18px;
  border: 1px solid var(--color-border, #e8e0d8);
  border-radius: 24px;
  font-size: 15px;
  color: var(--color-text, #333);
  outline: none;
  background: var(--color-card, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-autocomplete__input:focus {
  border-color: var(--color-primary, #e8663e);
  box-shadow: 0 0 0 3px rgba(232, 102, 62, 0.1);
}

.search-autocomplete__input::placeholder {
  color: var(--color-text-muted, #bbb);
}

/* ---------- Dropdown container ---------- */

.search-autocomplete__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-card, #fff);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 8px 0;
  margin: 0;
  z-index: 50;

  /* ↓ 改：原 260px → 360px */
  max-height: 360px;
  overflow-y: auto;

  /* ↓ 新增：滚动条美化（Webkit） */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.search-autocomplete__dropdown::-webkit-scrollbar {
  width: 6px;
}

.search-autocomplete__dropdown::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

/* 列表本身无 padding（让分组标题和 chip 顶到边缘） */
.search-autocomplete__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* ---------- 分组标题 + Chip 区域 ---------- */

.search-autocomplete__group {
  padding: 8px 16px 6px;
}

.search-autocomplete__group + .search-autocomplete__group {
  border-top: 1px solid var(--color-border, #f0ebe6);
  padding-top: 10px;
}

.search-autocomplete__group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted, #999);
  margin-bottom: 8px;
  letter-spacing: 0.02em;
  user-select: none;
}

.search-autocomplete__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 标签 chip（默认） */
.search-autocomplete__chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-primary, #e8663e);
  background: var(--color-primary-bg, #fef0e6);
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  user-select: none;
}

.search-autocomplete__chip:hover {
  background: var(--color-primary, #e8663e);
  color: #fff;
}

.search-autocomplete__chip:active {
  transform: scale(0.96);
}

.search-autocomplete__chip:focus-visible {
  outline: 2px solid var(--color-primary, #e8663e);
  outline-offset: 2px;
}

/* 分类 chip — 不同色系（蓝/青） */
.search-autocomplete__chip--category {
  color: #2563eb;
  background: #eff6ff;
}

.search-autocomplete__chip--category:hover {
  background: #2563eb;
  color: #fff;
}

/* ---------- 列表项（核心建议）---------- */

.search-autocomplete__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--color-text, #333);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
}

.search-autocomplete__item:hover,
.search-autocomplete__item.is-active {
  background: var(--color-primary-bg, #fff3ed);
  color: var(--color-primary, #e8663e);
}

/* 缩略图（仅 API 建议） */
.search-autocomplete__thumb {
  flex-shrink: 0;
  width: 40px;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--color-primary-bg, #fef0e6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.search-autocomplete__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 缩略图加载失败 → 显示 🍽️ 占位（由组件 onError 切换 className 实现） */
.search-autocomplete__thumb--fallback {
  font-size: 16px;
}

/* 中部内容（标题 + 描述） */
.search-autocomplete__body {
  flex: 1;
  min-width: 0;          /* 允许 ellipsis 生效 */
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-autocomplete__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.search-autocomplete__desc {
  font-size: 12px;
  color: var(--color-text-muted, #999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-autocomplete__item:hover .search-autocomplete__desc,
.search-autocomplete__item.is-active .search-autocomplete__desc {
  color: var(--color-primary, #e8663e);
  opacity: 0.8;
}

/* 本地建议图标 */
.search-autocomplete__icon {
  font-size: 14px;
  flex-shrink: 0;
  width: 40px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 跳转标识 */
.search-autocomplete__goto {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-muted, #bbb);
  margin-left: auto;
  padding-left: 8px;
  transition: color 0.15s, transform 0.15s;
}

.search-autocomplete__item:hover .search-autocomplete__goto,
.search-autocomplete__item.is-active .search-autocomplete__goto {
  color: var(--color-primary, #e8663e);
  transform: translateX(2px);
}

/* ---------- 分隔线 ---------- */

.search-autocomplete__divider {
  height: 1px;
  margin: 4px 16px;
  background: var(--color-border, #f0ebe6);
  list-style: none;
  padding: 0;
}

/* ---------- 底部分组（搜索历史 / 热门搜索）---------- */

.search-autocomplete__section {
  padding: 4px 0 6px;
}

.search-autocomplete__section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted, #999);
  padding: 6px 16px 4px;
  letter-spacing: 0.02em;
  user-select: none;
}

.search-autocomplete__mini-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-autocomplete__mini-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--color-text, #333);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.search-autocomplete__mini-item:hover,
.search-autocomplete__mini-item.is-active {
  background: var(--color-primary-bg, #fff3ed);
  color: var(--color-primary, #e8663e);
}

.search-autocomplete__mini-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* ---------- 底部 Footer（清除历史）---------- */

.search-autocomplete__footer {
  border-top: 1px solid var(--color-border, #f0ebe6);
  padding: 6px 0 2px;
  margin-top: 4px;
}

.search-autocomplete__clear {
  width: 100%;
  text-align: center;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--color-text-muted, #999);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.search-autocomplete__clear:hover {
  background: var(--color-primary-bg, #fff3ed);
  color: var(--color-primary, #e8663e);
}

/* ---------- 加载态 / 提示 / 骨架屏 ---------- */

.search-autocomplete__loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted, #999);
  font-size: 13px;
  pointer-events: none;
}

.search-autocomplete__loading-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border, #e8e0d8);
  border-top-color: var(--color-primary, #e8663e);
  border-radius: 50%;
  animation: sa-spin 0.7s linear infinite;
}

.search-autocomplete__hint {
  color: var(--color-text-muted, #999);
  font-size: 13px;
  font-style: italic;
}

.search-autocomplete__hint:hover {
  background: var(--color-primary-bg, #fff3ed);
  color: var(--color-primary, #e8663e);
  font-style: normal;
}

/* 骨架屏 — 用于热门搜索加载中 */
.search-autocomplete__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 16px;
}

.search-autocomplete__skeleton-row {
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-border, #f0ebe6) 0%,
    #ece6df 50%,
    var(--color-border, #f0ebe6) 100%
  );
  background-size: 200% 100%;
  animation: sa-shimmer 1.2s ease-in-out infinite;
}

.search-autocomplete__skeleton-row:nth-child(1) { width: 60%; }
.search-autocomplete__skeleton-row:nth-child(2) { width: 75%; }
.search-autocomplete__skeleton-row:nth-child(3) { width: 50%; }

/* ---------- 动画 ---------- */

@keyframes sa-spin {
  to { transform: rotate(360deg); }
}

@keyframes sa-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes sa-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.search-autocomplete__dropdown {
  animation: sa-fade-in 0.15s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .search-autocomplete__dropdown,
  .search-autocomplete__loading-icon,
  .search-autocomplete__skeleton-row,
  .search-autocomplete__chip,
  .search-autocomplete__item,
  .search-autocomplete__goto {
    animation: none;
    transition: none;
  }
}

/* ============================================================
   暗色模式
   ============================================================ */

body.dark .search-autocomplete__input {
  background: var(--color-card, #2d2d3a);
  border-color: var(--color-border, #3d3d4a);
  color: var(--color-text, #e0ded9);
}

body.dark .search-autocomplete__dropdown {
  background: var(--color-card, #2d2d3a);
  border: 1px solid var(--color-border, #3d3d4a);
}

body.dark .search-autocomplete__item:hover,
body.dark .search-autocomplete__item.is-active,
body.dark .search-autocomplete__mini-item:hover,
body.dark .search-autocomplete__mini-item.is-active,
body.dark .search-autocomplete__clear:hover {
  background: rgba(232, 102, 62, 0.18);
}

body.dark .search-autocomplete__group + .search-autocomplete__group,
body.dark .search-autocomplete__divider,
body.dark .search-autocomplete__footer {
  border-color: var(--color-border, #3d3d4a);
}

body.dark .search-autocomplete__group-title,
body.dark .search-autocomplete__section-title {
  color: var(--color-text-muted, #888);
}

/* 暗色 chip — 标签 */
body.dark .search-autocomplete__chip {
  color: #f4a585;
  background: rgba(232, 102, 62, 0.18);
}

body.dark .search-autocomplete__chip:hover {
  background: var(--color-primary, #e8663e);
  color: #fff;
}

/* 暗色 chip — 分类 */
body.dark .search-autocomplete__chip--category {
  color: #93c5fd;
  background: rgba(37, 99, 235, 0.18);
}

body.dark .search-autocomplete__chip--category:hover {
  background: #2563eb;
  color: #fff;
}

/* 暗色骨架屏 */
body.dark .search-autocomplete__skeleton-row {
  background: linear-gradient(
    90deg,
    #3d3d4a 0%,
    #4a4a58 50%,
    #3d3d4a 100%
  );
  background-size: 200% 100%;
}

/* ============================================================
   响应式 — 移动端（≤480px）
   ============================================================ */

@media (max-width: 480px) {
  .search-autocomplete__dropdown {
    max-height: 70vh;            /* 移动端允许更高（屏幕较大） */
  }

  .search-autocomplete__item,
  .search-autocomplete__mini-item {
    padding: 12px 14px;
    font-size: 15px;
    min-height: 44px;            /* 触摸目标 ≥44px */
  }

  .search-autocomplete__item {
    gap: 10px;
  }

  /* 缩略图缩小：40×30 → 32×24，移动端减少视觉占用 */
  .search-autocomplete__thumb {
    width: 32px;
    height: 24px;
  }

  .search-autocomplete__icon {
    width: 32px;
    height: 24px;
    font-size: 13px;
  }

  /* 隐藏描述（移动端一屏空间有限） */
  .search-autocomplete__desc {
    display: none;
  }

  /* 跳转标识保留 */
  .search-autocomplete__goto {
    font-size: 12px;
  }

  /* chip 略大，便于触摸 */
  .search-autocomplete__chip {
    padding: 6px 14px;
    font-size: 13px;
    min-height: 32px;
  }

  .search-autocomplete__group,
  .search-autocomplete__section-title {
    padding-left: 14px;
    padding-right: 14px;
  }
}

/* 超小屏（≤360px）— 进一步压缩 */
@media (max-width: 360px) {
  /* 选项 B：完全隐藏缩略图，仅显示文字和跳转 */
  .search-autocomplete__thumb {
    display: none;
  }

  .search-autocomplete__icon {
    width: auto;
    height: auto;
  }
}
```

---

## 4. 组件结构变更说明

### 4.1 State 变更

| State | 类型 | 变更 | 说明 |
|------|------|------|------|
| `apiSuggestions` | `ApiSuggestionItem[]` | **类型扩展** | 加上 `coverImage`, `category`, `tags` 字段 |
| `matchedTags` | `string[]` | **新增** | API 返回的匹配标签 |
| `matchedCategories` | `string[]` | **新增** | API 返回的匹配分类 |
| `hotSearches` | `HotSearchItem[]` | **新增** | 来自 `/hot-searches` API |
| `isHotLoading` | `boolean` | **新增** | 热门搜索加载态 |
| `isOpen` | `boolean` | 不变 | — |
| `activeIndex` | `number` | **重写** | 索引目标改为扁平化后的所有可导航项 |
| `thumbErrors` | `Set<string>` | **新增** | 缩略图加载失败的 ID 集合（用于切换为 🍽️ fallback） |

### 4.2 新增常量

```typescript
// 移除：const HOT_SEARCHES = [...]
// 新增：API 数据源
const HOT_SEARCHES_CACHE_TTL = 5 * 60 * 1000  // 5 分钟内存缓存
const MIN_QUERY_LENGTH = 1                     // 从 2 改为 1

// 分组/分类中文映射（与 PRD 附录 B/C 对齐）
const CATEGORY_LABELS: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  dessert: '甜点',
  japanese: '日式',
  korean: '韩式',
  other: '其他',
  thai: '泰式',
  'quick-meal': '快手菜',
}

const TAG_LABELS: Record<string, string> = {
  'stir-fry': '炒',
  'deep-fry': '炸',
  boil: '煮',
  steam: '蒸',
  braise: '烧',
  'pan-fry': '煎',
  spicy: '辣',
  mala: '麻辣',
  sweet: '甜',
  sour: '酸',
  savory: '咸',
  numbing: '麻',
  chicken: '鸡肉',
  pork: '猪肉',
  beef: '牛肉',
  fish: '鱼',
  shrimp: '虾',
  egg: '鸡蛋',
  tofu: '豆腐',
  vegetable: '蔬菜',
  chinese: '中式',
  japanese: '日式',
  korean: '韩式',
  thai: '泰式',
  western: '西式',
  low: '实惠',
  medium: '中等',
  high: '高端',
}

// 扁平化可导航项的类型（用于键盘导航）
type NavItem =
  | { kind: 'chip-tag';        index: number; label: string }
  | { kind: 'chip-category';   index: number; label: string }
  | { kind: 'item';            index: number; source: 'api' | 'local'; id: string | null; title: string }
  | { kind: 'mini';            index: number; title: string }
  | { kind: 'footer';          index: number }
```

### 4.3 渲染结构变更（伪代码）

```tsx
return (
  <div className="search-autocomplete" ref={containerRef}>
    <input ... />

    {isOpen && hasAnyContent && (
      <div className="search-autocomplete__dropdown">

        {/* ① 匹配标签 */}
        {value.trim() && matchedTags.length > 0 && (
          <div className="search-autocomplete__group">
            <div className="search-autocomplete__group-title">🏷️ 匹配标签</div>
            <div className="search-autocomplete__chips">
              {matchedTags.map(tag => (
                <button
                  key={`tag-${tag}`}
                  className={`search-autocomplete__chip ${
                    activeNav?.kind === 'chip-tag' && activeNav.label === tag ? 'is-active' : ''
                  }`}
                  onMouseDown={e => { e.preventDefault(); handleChipClick(tag) }}
                >
                  {TAG_LABELS[tag] || tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ② 匹配分类 */}
        {value.trim() && matchedCategories.length > 0 && (
          <div className="search-autocomplete__group">
            <div className="search-autocomplete__group-title">📂 匹配分类</div>
            <div className="search-autocomplete__chips">
              {matchedCategories.map(cat => (
                <button
                  key={`cat-${cat}`}
                  className={`search-autocomplete__chip search-autocomplete__chip--category ${
                    activeNav?.kind === 'chip-category' && activeNav.label === cat ? 'is-active' : ''
                  }`}
                  onMouseDown={e => { e.preventDefault(); handleChipClick(cat) }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="search-autocomplete__divider" />

        {/* ③ 核心建议列表（API + 本地合并） */}
        <ul className="search-autocomplete__list">
          {allItems.map(item => {
            const isApi = item.source === 'api'
            const thumbFailed = isApi && item.id && thumbErrors.has(item.id)
            const showThumb = isApi && enableNavigate && !thumbFailed && item.coverImage
            return (
              <li
                key={isApi ? `api-${item.id}` : `local-${item.title}`}
                className={`search-autocomplete__item ${
                  activeNav?.kind === 'item' && activeNav.index === itemIndex ? 'is-active' : ''
                }`}
                onMouseDown={...}
                onMouseEnter={...}
              >
                {showThumb ? (
                  <span className="search-autocomplete__thumb">
                    <img
                      src={item.coverImage!}
                      alt=""
                      loading="lazy"
                      onError={() => handleThumbError(item.id!)}
                    />
                  </span>
                ) : isApi ? (
                  /* API 项但无图/加载失败 → 显示 🍽️ */
                  <span className="search-autocomplete__thumb search-autocomplete__thumb--fallback">🍽️</span>
                ) : (
                  /* 本地项 */
                  <span className="search-autocomplete__icon">🕐</span>
                )}

                <div className="search-autocomplete__body">
                  <div className="search-autocomplete__title">
                    {highlightText(item.title, value)}
                  </div>
                  {isApi && item.category && (
                    <div className="search-autocomplete__desc">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </div>
                  )}
                </div>

                {isApi && enableNavigate && (
                  <span className="search-autocomplete__goto">详情 ›</span>
                )}
              </li>
            )
          })}

          {isApiLoading && (
            <li className="search-autocomplete__item search-autocomplete__loading">
              <span className="search-autocomplete__loading-icon" />
              搜索中...
            </li>
          )}

          {value.trim() && !isApiLoading && apiSuggestions.length === 0 && (
            <li className="search-autocomplete__item search-autocomplete__hint" onMouseDown={...}>
              按回车搜索「{value}」
            </li>
          )}
        </ul>

        {/* ④ 搜索历史（输入框为空时显示） */}
        {!value.trim() && history.length > 0 && (
          <>
            <div className="search-autocomplete__divider" />
            <div className="search-autocomplete__section">
              <div className="search-autocomplete__section-title">🕐 搜索历史</div>
              <ul className="search-autocomplete__mini-list">
                {history.map(word => (
                  <li
                    key={`hist-${word}`}
                    className={`search-autocomplete__mini-item ${
                      activeNav?.kind === 'mini' && activeNav.title === word ? 'is-active' : ''
                    }`}
                    onMouseDown={...}
                  >
                    <span className="search-autocomplete__mini-icon">🕐</span>
                    <span>{word}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* ⑤ 热门搜索（API 加载，骨架屏占位） */}
        {!value.trim() && (
          <>
            <div className="search-autocomplete__divider" />
            <div className="search-autocomplete__section">
              <div className="search-autocomplete__section-title">🔥 热门搜索</div>
              {isHotLoading ? (
                <div className="search-autocomplete__skeleton">
                  <div className="search-autocomplete__skeleton-row" />
                  <div className="search-autocomplete__skeleton-row" />
                  <div className="search-autocomplete__skeleton-row" />
                </div>
              ) : (
                <ul className="search-autocomplete__mini-list">
                  {hotSearches.map(item => (
                    <li
                      key={`hot-${item.text}`}
                      className={`search-autocomplete__mini-item ${
                        activeNav?.kind === 'mini' && activeNav.title === item.text ? 'is-active' : ''
                      }`}
                      onMouseDown={...}
                    >
                      <span className="search-autocomplete__mini-icon">🔥</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* ⑥ Footer — 清除历史 */}
        {!value.trim() && history.length > 0 && (
          <div className="search-autocomplete__footer">
            <button
              type="button"
              className="search-autocomplete__clear"
              onMouseDown={e => { e.preventDefault(); clearHistory(); setIsOpen(false); onChange('') }}
            >
              清除搜索历史
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)
```

### 4.4 关键逻辑变更

#### 4.4.1 `getSuggestions` 重构

```typescript
// 旧实现：纯本地 + 硬编码
// 新实现：保持本地历史 + API 热门

useEffect(() => {
  if (value.trim() || !showHotSearches) return   // 仅输入框为空时加载
  // 调用 getHotSearches() → setHotSearches(list)
}, [value, showHotSearches])
```

#### 4.4.2 扁平化可导航项（用于键盘导航）

```typescript
const navItems = useMemo<NavItem[]>(() => {
  const items: NavItem[] = []

  // ① chips
  if (value.trim() && matchedTags.length > 0) {
    matchedTags.forEach((t, i) => items.push({ kind: 'chip-tag', index: i, label: t }))
  }
  if (value.trim() && matchedCategories.length > 0) {
    matchedCategories.forEach((c, i) => items.push({ kind: 'chip-category', index: i, label: c }))
  }
  // ② 核心建议项
  allItems.forEach((it, i) => items.push({
    kind: 'item', index: i, source: it.source, id: it.id, title: it.title,
  }))
  // ③ 搜索历史
  if (!value.trim() && history.length > 0) {
    history.forEach((h, i) => items.push({ kind: 'mini', index: i, title: h }))
  }
  // ④ 热门搜索
  if (!value.trim() && hotSearches.length > 0) {
    hotSearches.forEach((h, i) => items.push({ kind: 'mini', index: history.length + i, title: h.text }))
  }
  // ⑤ 清除历史 footer
  if (!value.trim() && history.length > 0) {
    items.push({ kind: 'footer', index: 0 })
  }
  return items
}, [value, matchedTags, matchedCategories, allItems, history, hotSearches])
```

#### 4.4.3 缩略图错误处理

```typescript
const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())

const handleThumbError = useCallback((id: string) => {
  setThumbErrors(prev => new Set(prev).add(id))
}, [])
```

#### 4.4.4 debounce 触发条件

```typescript
// 旧：if (trimmed.length < 2) return
// 新：
if (trimmed.length < MIN_QUERY_LENGTH) {  // MIN_QUERY_LENGTH = 1
  setApiSuggestions([])
  setMatchedTags([])
  setMatchedCategories([])
  setIsApiLoading(false)
  return
}
```

---

## 5. 新增 Props

> **所有现有 props 保持向后兼容**（默认值不变）。

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `showThumbnails` | `boolean` | `true` | 是否在 API 建议项左侧显示封面缩略图。设为 `false` 时回退到原 🔗 图标行为。 |
| `showTagGroups` | `boolean` | `true` | 是否显示「🏷️ 匹配标签 / 📂 匹配分类」分组区域。设为 `false` 时跳过对应 API 字段处理。 |
| `useApiHotSearches` | `boolean` | `true` | 是否从 `/hot-searches` API 加载热门搜索。设为 `false` 时回退到硬编码（保留 `HOT_SEARCHES` 常量作为兜底）。 |
| `minQueryLength` | `number` | `1` | 触发 API 建议的最短字符数。回退方案：设为 `2` 即等同旧行为。 |
| `dropdownMaxHeight` | `number` | `360` | 下拉列表最大高度（px），用于长列表场景。 |

### 5.1 Props 接口签名

```typescript
interface SearchAutocompleteProps {
  // —— 既有 props（不变）——
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  inputClassName?: string
  showHotSearches?: boolean
  enableNavigate?: boolean

  // —— 新增 props（iter110-search）——
  showThumbnails?: boolean
  showTagGroups?: boolean
  useApiHotSearches?: boolean
  minQueryLength?: number
  dropdownMaxHeight?: number
}
```

### 5.2 内部类型扩展

```typescript
interface ApiSuggestionItem {
  id: string
  title: string
  category?: string
  coverImage: string | null
  tags?: Record<string, string> | null
}

interface HotSearchItem {
  text: string
  count: number
  source: 'search' | 'fallback'
}
```

---

## 6. 动画定义

### 6.1 动画清单

| 名称 | 触发场景 | 时长 | 缓动 | 备注 |
|------|----------|------|------|------|
| `sa-fade-in` | 下拉出现 | 150ms | `ease-out` | `opacity 0→1` + `translateY(-4px → 0)` |
| `sa-spin` | 加载图标 | 700ms | `linear` | `rotate(0→360deg)` 无限循环 |
| `sa-shimmer` | 骨架屏 | 1200ms | `ease-in-out` | `background-position` 渐变扫光 |
| chip hover | 鼠标悬停 chip | 150ms | `ease` | `background` + `color` 同步过渡 |
| chip active | 鼠标按下 | 100ms | `ease` | `transform: scale(0.96)` |
| goto arrow | 列表项 hover | 150ms | `ease` | `translateX(2px)` |
| 列表项 hover | 鼠标悬停 | 150ms | `ease` | `background` + `color` 过渡 |

### 6.2 关键帧

```css
@keyframes sa-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes sa-spin {
  to { transform: rotate(360deg); }
}

@keyframes sa-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 6.3 无障碍降级

```css
@media (prefers-reduced-motion: reduce) {
  /* 所有动画与过渡统一禁用 */
}
```

### 6.4 实现要点

1. **下拉出现动画** 仅应用于首次出现（`isOpen: false → true`），不应用于输入字符时的下拉内容变化（避免抖动）。
2. **骨架屏** 仅在「输入框为空 + 首次加载热门搜索」时显示，**不**用于 API 建议加载（API 建议保留原「搜索中...」loading 提示）。
3. **chip 缩放反馈** 仅在 `:active`（按下）时启用，hover 不缩放，避免视觉跳动。
4. **跳转箭头** 在列表项 hover 时右移 2px，**不**在 active 时叠加（避免双重位移）。

---

## 7. 验收清单

> 与 PRD §3.2 一一对应，附设计维度的额外项。

### 7.1 功能性验收（来自 PRD §3.2）

| # | 验收项 | 验证方式 | 设计实现位置 |
|---|--------|----------|-------------|
| 1 | API 建议项左侧显示 40×30px 封面缩略图 | 视觉检查 | `.search-autocomplete__thumb` |
| 2 | 封面图加载失败 / `coverImage` 为 `null` 时显示 🍽️ fallback | 模拟 404 / API 返回 null | `.search-autocomplete__thumb--fallback` + `thumbErrors` state |
| 3 | 输入框为空时，下拉显示热门搜索词（来自 API） | 搜索源码确认无硬编码数组 | `useApiHotSearches=true` 默认行为 |
| 4 | 输入 1 个字符即触发 API 建议 | 输入「番」观察 debounce 后请求 | `MIN_QUERY_LENGTH = 1` |
| 5 | `matchedTags` 非空时显示 🏷️ 区域 | 搜索「番茄」 | `.search-autocomplete__group` (第一个) |
| 6 | `matchedCategories` 非空时显示 📂 区域 | 搜索「鸡」 | `.search-autocomplete__group` (第二个) |
| 7 | 点击标签 chip → 填入搜索框并搜索 | 交互验证 | `handleChipClick` |
| 8 | 点击分类 chip → 填入搜索框并搜索 | 交互验证 | `handleChipClick`（共用 handler） |
| 9 | 键盘导航（↑↓ Enter Esc）正常工作 | 交互验证 | `navItems` 扁平化 + `handleKeyDown` 重写 |
| 10 | 搜索历史功能正常（保存/清除/删除） | 交互验证 | `HISTORY_KEY` / `MAX_HISTORY` 不变 |
| 11 | 暗色模式下样式正常 | 切换暗色模式 | `body.dark` 块 |
| 12 | 移动端（≤480px）样式正常 | 响应式检查 | `@media (max-width: 480px)` 块 |

### 7.2 视觉性验收（设计稿维度）

| # | 验收项 | 验收标准 |
|---|--------|----------|
| V1 | 缩略图统一圆角 | 所有缩略图 `border-radius: 4px` |
| V2 | 缩略图填充 | `object-fit: cover`，不拉伸不变形 |
| V3 | 缩略图占位 | 失败/无图时显示 🍽️ emoji，**不**显示空白方块 |
| V4 | 分组标题清晰 | 🏷️ / 📂 / 🕐 / 🔥 四个标题字号统一 12px，灰色 `#999` |
| V5 | 分组分隔 | 分组之间使用 1px 浅色分隔线（`#f0ebe6`），**不**使用粗线 |
| V6 | chip 形状 | 14px 圆角（`border-radius: 14px`），pill 形状 |
| V7 | chip 颜色对比 | 标签 chip 主橙底，分类 chip 主蓝底，色相区分明显 |
| V8 | chip hover 反馈 | 反色（背景变实色，文字变白），过渡 150ms |
| V9 | 列表项对齐 | 缩略图 / 图标垂直居中，标题左对齐，跳转标识右对齐 |
| V10 | 跳转标识 | 文字「详情 ›」，hover 时右移 2px |
| V11 | 描述文字 | 字号 12px，灰色 `#999`，单行截断 |
| V12 | Footer 清除 | 居中文案，hover 变橙，无按钮边框 |
| V13 | 骨架屏 | 三行渐变扫光，宽度 50%/60%/75% 不规则 |
| V14 | 加载 spinner | 14px 圆环，主橙色，700ms 旋转 |
| V15 | 下拉阴影 | `0 8px 24px rgba(0,0,0,0.12)`，明显但不刺眼 |
| V16 | 下拉圆角 | 10px 圆角，与卡片视觉一致 |
| V17 | 下拉出现动画 | 从上方 4px 滑入，150ms，无明显抖动 |

### 7.3 可访问性验收

| # | 验收项 | 验收标准 |
|---|--------|----------|
| A1 | 键盘可达 | 所有 chip / 列表项 / footer 都能通过 Tab 聚焦 |
| A2 | Focus 可见 | chip `:focus-visible` 显示 2px 主橙色描边 |
| A3 | 屏幕阅读器 | 分组标题使用 `user-select: none` 但保留文本，结构化语义 |
| A4 | ARIA 标签 | chip 按钮使用 `<button>` 元素（非 div），自动具备按钮语义 |
| A5 | 触摸目标 | 所有可点击项 `min-height: 44px`（移动端） |
| A6 | 减弱动效 | `prefers-reduced-motion: reduce` 时所有动画/过渡关闭 |
| A7 | 对比度 | 文字 vs 背景对比度 ≥ 4.5:1（WCAG AA） |

### 7.4 兼容性验收

| # | 验收项 | 验收标准 |
|---|--------|----------|
| C1 | Chrome ≥ 100 | 通过 |
| C2 | Safari ≥ 15 | 通过（注意 `-webkit-scrollbar` 私有前缀） |
| C3 | Firefox ≥ 100 | 通过（注意 `scrollbar-width` 标准属性） |
| C4 | 移动端 Safari iOS ≥ 14 | 触摸滚动正常，无橡皮筋穿透 |
| C5 | 移动端 Chrome Android ≥ 100 | 触摸滚动正常 |
| C6 | 旧版浏览器回退 | `object-fit` 不支持时图片保持原比例（不裁切） |

### 7.5 性能验收

| # | 验收项 | 验收标准 |
|---|--------|----------|
| P1 | 首屏渲染 | 下拉出现到首帧 < 16ms（60fps） |
| P2 | 缩略图懒加载 | 使用 `loading="lazy"`，离开视口不加载 |
| P3 | 热门搜索缓存 | 内存缓存 5 分钟，避免重复请求 |
| P4 | 重渲染优化 | `useMemo` 缓存 `navItems`、`allItems` |
| P5 | 列表项数 | 单次最多 8 条 API 建议 + 8 条历史 + 10 条热门 = 26 项，远低于 60fps 瓶颈 |
| P6 | 滚动性能 | 360px 高度 + 26 项，单次滚动帧率 ≥ 50fps |

---

## 8. 不变项 / 兼容性保证

> 以下行为 **完全保留**，不因本次设计变更而改动：

- ✅ `debounce 300ms` 不变
- ✅ `MAX_HISTORY = 8`、`HISTORY_KEY = 'search_history'` 不变
- ✅ `enableNavigate` prop 行为不变（false 时 API 建议项显示 🍽️ 而非缩略图，🕐 图标不变）
- ✅ `showHotSearches` prop 行为不变（false 时隐藏整个热门搜索区域）
- ✅ 外部点击关闭行为不变
- ✅ `onChange` / `onSubmit` 回调签名不变
- ✅ `removeHistoryItem` 导出函数不变
- ✅ CSS 变量约定不变（`--color-primary`, `--color-card`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary-bg`, `--radius-md`, `--shadow-lg`）
- ✅ 类名 BEM 命名规范延续

---

## 9. 设计 token 速查

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `--color-primary` | `#e8663e` | `#e8663e` | 主题色（chip 文字、active 态、border focus） |
| `--color-primary-bg` | `#fef0e6` | `rgba(232,102,62,0.18)` | chip 背景 / hover 背景 |
| `--color-card` | `#fff` | `#2d2d3a` | 下拉背景、输入框背景 |
| `--color-border` | `#e8e0d8` | `#3d3d4a` | 边框、分隔线 |
| `--color-text` | `#333` | `#e0ded9` | 主文字 |
| `--color-text-muted` | `#bbb`/`#999` | `#888` | 次要文字、描述、跳转标识 |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | 同 | 下拉阴影 |
| `--radius-md` | `10px` | 同 | 下拉圆角 |
| 标签 chip 蓝色（分类） | `#2563eb` bg `#eff6ff` | bg `rgba(37,99,235,0.18)` 文字 `#93c5fd` | 区分匹配分类区域 |

---

## 10. 交付物清单

| 路径 | 类型 | 状态 |
|------|------|------|
| `frontend/src/components/SearchAutocomplete.tsx` | 修改 | 待实现 |
| `frontend/src/components/SearchAutocomplete.css` | **完全替换** | 待实现（本规范提供完整 CSS） |
| `frontend/src/api.ts` | 修改（类型扩展） | 后端先行 |
| `iter110-search/UI-search-autocomplete.md` | 新建 | **本文件** ✅ |

---

## 附录 A：分组标题文案

| 区域 | 标题文案 | Emoji | 显示条件 |
|------|----------|-------|----------|
| 匹配标签 | 匹配标签 | 🏷️ | `value.trim() && matchedTags.length > 0` |
| 匹配分类 | 匹配分类 | 📂 | `value.trim() && matchedCategories.length > 0` |
| 搜索历史 | 搜索历史 | 🕐 | `!value.trim() && history.length > 0` |
| 热门搜索 | 热门搜索 | 🔥 | `!value.trim() && showHotSearches` |
| Footer | 清除搜索历史 | — | `!value.trim() && history.length > 0` |

## 附录 B：图标约定

| 场景 | 图标 |
|------|------|
| API 建议项（缩略图加载成功） | `<img>` 40×30 |
| API 建议项（缩略图加载失败/无图） | 🍽️（在 40×30 缩略图框内居中） |
| 本地建议（搜索历史） | 🕐 |
| 热门搜索 | 🔥 |
| 加载中 | ⟳ spinner（14px 圆环） |
| 骨架屏 | 三条渐变扫光矩形 |

## 附录 C：参考资料

- PRD: `iter110-search/PRD-search-enhance.md`
- 后端: `backend/routes/recipes.js`、`backend/models/recipe.js`
- 前端: `frontend/src/components/SearchAutocomplete.tsx`、`SearchAutocomplete.css`
- 类型工具: `frontend/src/utils/highlightText.ts`
- 测试: `backend/tests/search_enhance.test.js`
