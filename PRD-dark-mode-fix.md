# 暗色模式遗漏补全 · 设计方案

> **目标**: 为项目 10 个 CSS 文件补充 `body.dark` 覆写规则，消除所有硬编码颜色
> **范围**: 6 页面 + 4 组件
> **约定**: 暗色选择器统一使用 `body.dark`（由 `ThemeContext.tsx` 以 `document.body.classList.toggle('dark', ...)` 控制）

---

## 全局先修操作

### 1. 在 `global.css` 的 `body.dark` 中补充缺失变量

```css
body.dark {
  /* 已有: --color-bg, --color-card, --color-text, --color-text-secondary,
     --color-text-muted, --color-border, --color-input-bg, --color-input-border,
     --color-primary-bg, --color-skeleton-from, --color-skeleton-to,
     --color-scrollbar, --shadow-sm, --shadow-md, --shadow-lg */

  /* 新增 - 全项目多处引用但缺失 */
  --color-bg-secondary: #1a1a2e;
}
```

`--color-bg-secondary` 在项目中约 50+ 处引用（QualityScoreModal、TagCloud、SettingsPage、RecipeDetailPage 等），但 `body.dark` 未定义它。这是当前暗色模式下最普遍的缺失变量。

---

## 文件 1: `frontend/src/pages/RecommendPage.css`

**硬编码颜色统计: 约 22 处**

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.recommend-card__desc` | color | `#888` | `var(--color-text-secondary)` |
| `.recommend-card__reason` | color | `#777` | `var(--color-text-secondary)` |
| `.recommend-card__reason` | background | `#f9f9f9` | `var(--color-bg-secondary)` |
| `.recommend-empty__hint` | color | `#aaa` | `var(--color-text-muted)` |
| `.recommend-empty__step` | color | `#888` | `var(--color-text-secondary)` |
| `.recommend-history__tag` | border | `1px solid #eee` | `1px solid var(--color-border)` |
| `.recommend-card__fav` | background | `rgba(255, 255, 255, 0.85)` | `rgba(30, 30, 50, 0.85)` |
| `.recommend-card__fav:hover` | background | `var(--color-card, #fff)` | 已用变量，无需改 |
| `.recommend-empty__banner` | background | `linear-gradient(135deg, #fff8f4, #fdf8f4)` | `linear-gradient(135deg, #1e1e32, #1a1a2e)` |
| `.recommend-card__cover--ai` | background | `linear-gradient(135deg, #fff3ed, #fdf8f4)` | `linear-gradient(135deg, #2e1a14, #1a1a2e)` |

### 语义 Badge / Tag（整体替换暗色值）

| 选择器 | 属性 | 当前值 | 暗色替代 |
|--------|------|--------|----------|
| `.recommend-badge--high` | background | `#e8f5e9` | `#1b3d1b` |
| `.recommend-badge--high` | color | `#2e7d32` | `#a5d6a7` |
| `.recommend-badge--mid` | background | `#fff8e1` | `#3d3d1b` |
| `.recommend-badge--mid` | color | `#f57f17` | `#ffca28` |
| `.recommend-badge--low` | background | `#fff3e0` | `#3d2e1b` |
| `.recommend-badge--low` | color | `#e65100` | `#ff8a65` |
| `.recommend-badge--ai` | background | `#f3e5f5` | `#2d1b3d` |
| `.recommend-badge--ai` | color | `#7b1fa2` | `#ce93d8` |
| `.recommend-tag` | background | `#f0f7f0` | `#1b3d1b` |
| `.recommend-tag` | color | `#4a7c59` | `#a5d6a7` |
| `.recommend-tag--ai` | background | `#f3e5f5` | `#2d1b3d` |
| `.recommend-tag--ai` | color | `#7b1fa2` | `#ce93d8` |

### Box-shadow 暗色调整

| 选择器 | 属性 | 当前值 |
|--------|------|--------|
| `.recommend-card` | box-shadow | `0 2px 12px rgba(0, 0, 0, 0.06)` → `var(--shadow-sm)` |
| `.recommend-card:hover` | box-shadow | `0 8px 24px rgba(232, 102, 62, 0.12)` → `0 8px 24px rgba(232, 102, 62, 0.25)` |
| `.recommend-card__fav` | box-shadow | `0 2px 6px rgba(0, 0, 0, 0.12)` → `0 2px 6px rgba(0, 0, 0, 0.3)` |

### 完整 `body.dark` 覆写块

```css
/* ── RecommendPage 暗色覆写 ── */
body.dark .recommend-card__desc {
  color: var(--color-text-secondary);
}

body.dark .recommend-card__reason {
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
}

body.dark .recommend-empty__hint {
  color: var(--color-text-muted);
}

body.dark .recommend-empty__step {
  color: var(--color-text-secondary);
}

body.dark .recommend-history__tag {
  border-color: var(--color-border);
}

body.dark .recommend-card__fav {
  background: rgba(30, 30, 50, 0.85);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

body.dark .recommend-empty__banner {
  background: linear-gradient(135deg, #1e1e32, #1a1a2e);
}

body.dark .recommend-card__cover--ai {
  background: linear-gradient(135deg, #2e1a14, #1a1a2e);
}

body.dark .recommend-card {
  box-shadow: var(--shadow-sm);
}

body.dark .recommend-card:hover {
  box-shadow: 0 8px 24px rgba(232, 102, 62, 0.25);
}

/* Badge 暗色 */
body.dark .recommend-badge--high {
  background: #1b3d1b;
  color: #a5d6a7;
}

body.dark .recommend-badge--mid {
  background: #3d3d1b;
  color: #ffca28;
}

body.dark .recommend-badge--low {
  background: #3d2e1b;
  color: #ff8a65;
}

body.dark .recommend-badge--ai {
  background: #2d1b3d;
  color: #ce93d8;
}

/* Tag 暗色 */
body.dark .recommend-tag {
  background: #1b3d1b;
  color: #a5d6a7;
}

body.dark .recommend-tag--ai {
  background: #2d1b3d;
  color: #ce93d8;
}

body.dark .recommend-card__reason strong {
  color: var(--color-primary);
}
```

---

## 文件 2: `frontend/src/pages/FavoriteList.css`

**硬编码颜色统计: 约 11 处**

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.pagination-btn:hover:not(:disabled)` | border-color | `#ff4d4f` | `var(--color-error)` |
| `.pagination-btn:hover:not(:disabled)` | color | `#ff4d4f` | `var(--color-error)` |
| `.overlay-spinner` | border-top-color | `#ff4d4f` | `var(--color-error)` |
| `.btn--primary` | background | `#ff4d4f` | `var(--color-error)` |
| `.btn--primary:hover` | background | `#ff7875` | 暗色保持 `var(--color-error)` |
| `.recipe-card__cooktime` | background | `rgba(0, 0, 0, 0.6)` | `rgba(0, 0, 0, 0.75)` |

> 注: `#ff4d4f` 恰好等于 `var(--color-error)`，直接替换即可使暗色模式自动适配。

### 完整 `body.dark` 覆写块

```css
/* ── FavoriteList 暗色覆写 ── */
body.dark .pagination-btn:hover:not(:disabled) {
  border-color: var(--color-error);
  color: var(--color-error);
}

body.dark .overlay-spinner {
  border-top-color: var(--color-error);
}

body.dark .btn--primary {
  background: var(--color-error);
}

body.dark .btn--primary:hover {
  background: #e04040;
}

body.dark .favorite-list__overlay {
  background: rgba(18, 18, 30, 0.7);
}

body.dark .recipe-card__cooktime {
  background: rgba(0, 0, 0, 0.75);
}
```

---

## 文件 3: `frontend/src/pages/LoginPage.css`

**硬编码颜色统计: 约 6 处（其余已用变量）**

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.login-tab.active` | box-shadow | `0 1px 4px rgba(0, 0, 0, 0.08)` | `var(--shadow-sm)` |
| `@keyframes fadeIn` | - | 透明动画 | 无需覆写 |
| `.login-submit` | color | `#fff` | 白色通用，保留 |

LoginPage 已经做得很好，大部分颜色使用了 CSS 变量。关键问题是 `.login-tab.active` 的 box-shadow 在暗色下偏浅，但 `var(--shadow-sm)` 已经由 `body.dark` 定义了更深的 shadow。

LoginPage 的硬编码颜色较少 — 唯一需要关注的是 `.login-tab.active` 的 `box-shadow` 应该直接使用 `var(--shadow-sm)`。

### 完整 `body.dark` 覆写块

```css
/* ── LoginPage 暗色覆写 ── */
/* 主要问题已通过 global.css 的 body.dark 变量自动解决 */
body.dark .login-tab.active {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

body.dark .login-card {
  box-shadow: var(--shadow-md);
}

body.dark .form-group input:focus {
  box-shadow: 0 0 0 3px rgba(232, 102, 62, 0.25);
}
```

---

## 文件 4: `frontend/src/pages/UserWorksPage.css`

**核心问题: 使用非标准变量名**

该文件使用了自己的一套变量名，完全不匹配全局的 CSS 变量方案:

| 文件中使用的变量 | 应映射的全局变量 |
|-----------------|------------------|
| `--accent-color` | `--color-primary` |
| `--text-primary` | `--color-text` |
| `--text-secondary` | `--color-text-secondary` |
| `--card-bg` | `--color-card` |
| `--border-color` | `--color-border` |
| `--skeleton-bg` | `--color-skeleton-from` |
| `--hover-bg` | — (建议映射为 `var(--color-bg-secondary)`) |

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.works-card__rating` | color | `#f5a623` | 语义色，暗色保持 |
| `.works-empty__cta` | font-size | — | 无需改 |

### 完整 `body.dark` 覆写块

```css
/* ── UserWorksPage 暗色覆写 ── */
body.dark .works-page__back {
  color: var(--color-primary);
}

body.dark .works-page__title {
  color: var(--color-text);
}

body.dark .works-page__count {
  color: var(--color-text-secondary);
}

body.dark .works-card {
  background: var(--color-card);
  border-color: var(--color-border);
}

body.dark .works-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

body.dark .works-card__image-wrap {
  background: var(--color-skeleton-from);
}

body.dark .works-card__recipe {
  color: var(--color-primary);
}

body.dark .works-card__content {
  color: var(--color-text-secondary);
}

body.dark .works-card__meta {
  color: var(--color-text-muted);
}

body.dark .works-card__rating {
  color: #f5a623; /* 保留语义黄 */
}

body.dark .works-empty__heading {
  color: var(--color-text);
}

body.dark .works-empty__text {
  color: var(--color-text-secondary);
}

body.dark .works-pagination .pagination-btn {
  border-color: var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
}

body.dark .works-pagination .pagination-btn:not(:disabled):hover {
  background: var(--color-bg-secondary);
}

body.dark .works-pagination .pagination-info {
  color: var(--color-text-secondary);
}
```

---

## 文件 5: `frontend/src/pages/CollectionsPage.css`

**硬编码颜色统计: 少量**

该文件已大量使用全局 CSS 变量，暗色模式基本适配。以下是遗漏项:

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.collection-modal__backdrop` | background | `rgba(0, 0, 0, 0.5)` | `rgba(0, 0, 0, 0.7)` |

### 完整 `body.dark` 覆写块

```css
/* ── CollectionsPage 暗色覆写 ── */
body.dark .collection-modal__backdrop {
  background: rgba(0, 0, 0, 0.7);
}
```

---

## 文件 6: `frontend/src/pages/CollectionsDetailPage.css`

**硬编码颜色统计: 1 处**

该文件已大量使用全局 CSS 变量。

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.recipe-card__cover-placeholder` | background | `var(--color-bg)` | 已用变量，无问题 |

只有一个 non-issue. 但 `.recipe-card__category` 的 `background: var(--color-primary-bg)` 和 `color: var(--color-primary)` 已经可以。

额外注意: `coll-detail-page .recipe-card__remove-btn:hover:not(:disabled)` 中使用了 `background: var(--color-error); color: #fff;` — 这已经用了变量，OK。

### 完整 `body.dark` 覆写块

```css
/* ── CollectionsDetailPage 暗色覆写 ── */
/* 本文件已基本适配，仅补充 backdrop 和 hover 阴影 */
body.dark .recipe-card__remove-btn {
  border-color: var(--color-border);
  background: var(--color-card);
}

body.dark .recipe-card:hover {
  box-shadow: var(--shadow-md);
}

body.dark .detail-notfound h2 {
  color: var(--color-text);
}

body.dark .detail-notfound p {
  color: var(--color-text-secondary);
}
```

---

## 文件 7: `frontend/src/components/ActivityFeed.css`

**硬编码颜色统计: 约 12 处**

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.activity-feed__title` | color | `#1a1a1a` | `var(--color-text)` |
| `.activity-card` | border-bottom | `1px solid #f0f0f0` | `1px solid var(--color-border)` |
| `.activity-card:hover` | background-color | `#fafafa` | `var(--color-bg-secondary)` |
| `.activity-card:active` | background-color | `#f5f5f5` | `var(--color-bg-secondary)` |
| `.activity-card__avatar` | background | `#e8e8e8` | `var(--color-skeleton-from)` |
| `.activity-card__avatar-placeholder` | background | `linear-gradient(135deg, #f093fb, #f5576c)` | 保留（语义渐变） |
| `.activity-card__avatar-placeholder` | color | `#fff` | 白色保留 |
| `.activity-card__type-badge` | background | `#fff` | `var(--color-card)` |
| `.activity-card__type-badge` | box-shadow | `0 1px 3px rgba(0,0,0,0.12)` | `var(--shadow-sm)` |
| `.activity-card__username` | color | `#333` | `var(--color-text)` |
| `.activity-card__action` | color | `#888` | `var(--color-text-secondary)` |
| `.activity-card__recipe-title` | color | `#ff6b35` | `var(--color-primary)` |
| `.activity-card__time` | color | `#bbb` | `var(--color-text-muted)` |
| `.activity-card__cover` | background | `#f0f0f0` | `var(--color-skeleton-from)` |

### 完整 `body.dark` 覆写块

```css
/* ── ActivityFeed 暗色覆写 ── */
body.dark .activity-feed__title {
  color: var(--color-text);
}

body.dark .activity-card {
  border-bottom-color: var(--color-border);
}

body.dark .activity-card:hover {
  background-color: var(--color-bg-secondary);
}

body.dark .activity-card:active {
  background-color: var(--color-bg-secondary);
}

body.dark .activity-card__avatar {
  background: var(--color-skeleton-from);
}

body.dark .activity-card__avatar-placeholder {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

body.dark .activity-card__type-badge {
  background: var(--color-card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

body.dark .activity-card__username {
  color: var(--color-text);
}

body.dark .activity-card__action {
  color: var(--color-text-secondary);
}

body.dark .activity-card__recipe-title {
  color: var(--color-primary);
}

body.dark .activity-card__time {
  color: var(--color-text-muted);
}

body.dark .activity-card__cover {
  background: var(--color-skeleton-from);
}
```

---

## 文件 8: `frontend/src/components/CommentImagePicker.css`

**核心问题: 混合使用非标准变量名**

文件中使用了非标准变量:
| 文件中使用的变量 | 应映射的全局变量 |
|-----------------|------------------|
| `--border-color` | `--color-border` |
| `--accent-color` | `--color-primary` |
| `--text-secondary` | `--color-text-secondary` |
| `--error-color` | `--color-error` |

### 完整 `body.dark` 覆写块

```css
/* ── CommentImagePicker 暗色覆写 ── */
body.dark .comment-image-picker__item {
  border-color: var(--color-border);
}

body.dark .comment-image-picker__remove {
  background: rgba(0, 0, 0, 0.65);
}

body.dark .comment-image-picker__remove:hover {
  background: rgba(0, 0, 0, 0.85);
}

body.dark .comment-image-picker__add {
  border-color: var(--color-border);
}

body.dark .comment-image-picker__add:hover {
  border-color: var(--color-primary);
  background: rgba(232, 102, 62, 0.08);
}

body.dark .comment-image-picker__plus {
  color: var(--color-text-muted);
}

body.dark .comment-image-picker__hint {
  color: var(--color-text-muted);
}

body.dark .comment-image-picker__error {
  color: var(--color-error);
}
```

---

## 文件 9: `frontend/src/components/TagCloud.css`

**硬编码颜色统计: 约 8 组 × 2 = 16 处 + 2 特殊 = 18 处**

该文件有英文注释 `.dark .tag-xxx` 的暗色规则（这是旧的 `data-theme` 遗留规则），应迁移为 `body.dark .tag-xxx`。

### 已存在的 `.dark` 规则（需要迁移）

```css
/* 现有代码中已有这些暗色规则，但选择器是 .dark（不符合项目当前 body.dark 约定） */
.dark .tag-cuisine { background: #1b3d1b; color: #a5d6a7; }
.dark .tag-flavor { background: #3d2e1b; color: #ffab91; }
.dark .tag-meal { background: #1b2d3d; color: #90caf9; }
.dark .tag-difficulty { background: #3d1b1b; color: #ef9a9a; }
.dark .tag-ingredient { background: #2d1b3d; color: #ce93d8; }
.dark .tag-season { background: #1b2d2d; color: #80deea; }
.dark .tag-default { background: #333; color: #bbb; }
.dark .tag-cooking { background: #3d3d1b; color: #ffd54f; }
```

### 完整 `body.dark` 覆写块

```css
/* ── TagCloud 暗色覆写 ── */
body.dark .tag-cloud-wrapper {
  background: var(--color-bg-secondary);
}

body.dark .tag-search-input {
  background: var(--color-input-bg);
  border-color: var(--color-border);
}

body.dark .tag-search-input:focus {
  border-color: var(--color-primary);
}

body.dark .tag-cloud-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 标签分类颜色 — 迁移 .dark → body.dark */
body.dark .tag-cuisine { background: #1b3d1b; color: #a5d6a7; }
body.dark .tag-flavor { background: #3d2e1b; color: #ffab91; }
body.dark .tag-meal { background: #1b2d3d; color: #90caf9; }
body.dark .tag-difficulty { background: #3d1b1b; color: #ef9a9a; }
body.dark .tag-ingredient { background: #2d1b3d; color: #ce93d8; }
body.dark .tag-season { background: #1b2d2d; color: #80deea; }
body.dark .tag-default { background: #333; color: #bbb; }
body.dark .tag-cooking { background: #3d3d1b; color: #ffd54f; }
```

---

## 文件 10: `frontend/src/components/QualityScoreModal.css`

**硬编码颜色统计: 约 6 处语义色 + 4 处背景**

### 硬编码颜色清单

| 选择器 | 属性 | 当前值 | 建议映射 |
|--------|------|--------|----------|
| `.quality-score-overlay` | background | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| `.quality-score-modal` | box-shadow | `0 8px 32px rgba(0,0,0,0.2)` | `0 8px 32px rgba(0,0,0,0.5)` |
| `.quality-close-btn:hover` | background | `var(--color-bg-secondary)` | 已用变量 ✅ |
| `.quality-overall` | background | `var(--color-bg-secondary)` | 已用变量 ✅ |
| `.quality-progress-bar` | background | `var(--color-bg-secondary)` | 已用变量 ✅ |

### 分数语义色（需要 body.dark 覆写，已有 .dark 规则）

```css
/* 已有规则（迁移 .dark → body.dark） */
body.dark .score-excellent { color: #66bb6a; }
body.dark .score-good { color: #ffca28; }
body.dark .score-average { color: #ff8a65; }
body.dark .score-poor { color: #ef5350; }
body.dark .score-bad { color: #e57373; }
```

### 完整 `body.dark` 覆写块

```css
/* ── QualityScoreModal 暗色覆写 ── */
body.dark .quality-score-overlay {
  background: rgba(0, 0, 0, 0.7);
}

body.dark .quality-score-modal {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

body.dark .quality-close-btn:hover {
  background: var(--color-bg-secondary);
}

body.dark .quality-overall {
  background: var(--color-bg-secondary);
}

body.dark .quality-progress-bar {
  background: var(--color-bg-secondary);
}

/* 分数颜色 — 迁移 .dark → body.dark */
body.dark .score-excellent { color: #66bb6a; }
body.dark .score-good { color: #ffca28; }
body.dark .score-average { color: #ff8a65; }
body.dark .score-poor { color: #ef5350; }
body.dark .score-bad { color: #e57373; }
```

---

## 实施建议

1. **优先级**: 先补全局 `--color-bg-secondary` → 然后按文件逐批添加 `body.dark` 块
2. **警告**: QualityScoreModal 和 TagCloud.css 中已经存在 `.dark` 类选择器的暗色规则。这些旧的 `[data-theme]` 时代规则如果用 `.dark` 选择器在当前 `body.dark` 模式下不会生效。**有两种方案**:
   - 方案 A（推荐）: 保留旧 `.dark .xxx` 不动，在当前文件末尾追加 `body.dark .xxx` 的完整副本
   - 方案 B: 将 `.dark .xxx` 改为 `body.dark .xxx`，删除旧的 `.dark` 规则（更干净，但需确认无其他地方使用 `.dark`）
3. **渐变语义色**: `ActivityFeed` 中头像占位渐变 ( `#f093fb → #f5576c` ) 和 UserWorksPage 的星星色 ( `#f5a623` ) 是语义色彩，暗色下保留更清晰。
4. **Shadow 调整**: 所有 `rgba(0,0,0,0.xx)` 的 box-shadow 在暗色下应增加 opacity（如 0.06→0.25, 0.08→0.3），因为暗色背景本身已经是深色。
5. **分步实施**: 建议从 RecommendPage（硬编码最多，22 处）开始，然后 FavoriteList + ActivityFeed（11-14 处），最后是较少覆写的文件。

---

## 汇总变更量

| 文件 | 硬编码处 | body.dark 规则数 |
|------|---------|-----------------|
| RecommendPage.css | ~22 | ~17 条 |
| FavoriteList.css | ~11 | ~7 条 |
| LoginPage.css | ~6 | ~3 条 |
| UserWorksPage.css | ~18 (含非标准变量) | ~16 条 |
| CollectionsPage.css | ~2 | ~1 条 |
| CollectionsDetailPage.css | ~1 | ~4 条 |
| ActivityFeed.css | ~14 | ~15 条 |
| CommentImagePicker.css | ~7 | ~8 条 |
| TagCloud.css | ~18 | ~11 条 |
| QualityScoreModal.css | ~10 | ~7 条 |
| **global.css（前置）** | — | +1 (`--color-bg-secondary`) |
| **合计** | **~109** | **~89 条** |