# 暗色模式覆盖率提升 PRD

## 概述

- **目标**：为 31 个缺少 `body.dark` 暗色样式的 CSS 文件补充完整暗色规则
- **依据**：global.css 中 `body.dark` 定义的 CSS 变量
- **基准**：参考已有 62 个文件的 `body.dark` 模式（如 Navbar.css、RecipeCard.css）
- **注意**：部分文件已有 `[data-theme="dark"]` 或 `.dark` 选择器，需**追加**等效 `body.dark` 规则（不删除旧选择器）；重复的定义可酌情移除旧选择器，保留 `body.dark` 统一模式

### 设计系统变量

```css
--color-bg: #12121e            /* 页面背景 */
--color-card: #1e1e32          /* 卡片/区域背景 */
--color-text: #e0e0ee          /* 主要文字 */
--color-text-secondary: #9898b0 /* 次要文字 */
--color-text-muted: #686880    /* 辅助文字 */
--color-border: #2e2e48        /* 边框 */
--color-input-bg: #282840      /* 输入框背景 */
--color-input-border: #3e3e58  /* 输入框边框 */
--color-primary-bg: #2e1a14    /* 主色背景 */
--color-skeleton-from: #262640 /* 骨架屏起始 */
--color-skeleton-to: #303050   /* 骨架屏结束 */
--color-scrollbar: #3e3e58     /* 滚动条 */
--color-bg-secondary: #1a1a2e  /* 二级背景 */
```

### 实施方式

每个文件末尾追加一个注释块 `/* ── 暗色模式 ── */`，其后跟所有 `body.dark` 规则。保持原有浅色样式和响应式 `@media` 不变。

---

## 组件（23 个）

---

### 1. AddToShoppingListButton.css

```css
/* ── 暗色模式 ── */

body.dark .atsl-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .atsl-btn:hover:not(:disabled) {
  background: var(--color-primary-bg, #2e1a14);
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}
```

---

### 2. CommentSection.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .comment-section {
  border-top-color: var(--color-border, #2e2e48);
}

body.dark .comment-section__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-section__count {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-sort-tabs {
  border-color: var(--color-border, #2e2e48);
}

body.dark .comment-sort-tab {
  background: var(--color-card, #1e1e32);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-sort-tab:first-child {
  border-right-color: var(--color-border, #2e2e48);
}

body.dark .comment-sort-tab.is-active {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .comment-sort-tab:hover:not(.is-active) {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .comment-stats {
  background: var(--color-card, #1e1e32);
}

body.dark .comment-stats__avg {
  color: var(--color-primary, inherit);
}

body.dark .comment-stats__count,
body.dark .comment-stats__label,
body.dark .comment-stats__num {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .rating-bar {
  background: var(--color-border, #2e2e48);
}

body.dark .star-rating__star {
  color: var(--color-border, #2e2e48);
}

body.dark .star-rating__star.is-active {
  color: #f59e0b;
}

body.dark .comment-form {
  background: var(--color-card, #1e1e32);
}

body.dark .comment-form__user {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-form__textarea {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-form__toggle {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-form__toggle:hover {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .comment-form__count {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-login-hint {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-login-link {
  color: var(--color-primary, inherit);
}

body.dark .comment-empty {
  border-color: var(--color-border, #2e2e48);
  background: var(--color-card, #1e1e32);
}

body.dark .comment-empty__text {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-empty__hint {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-item {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .comment-item__avatar {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .comment-item__name {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-item__time {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-item__content {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-item__delete {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-item__delete:hover {
  color: #dc2626;
}

body.dark .comment-like-btn {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-like-btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .comment-pagination__info {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-images__item {
  border-color: var(--color-border, #2e2e48);
}

body.dark .comment-form__upload-hint {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-item__photo-hint {
  color: var(--color-text-muted, #686880);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .comment-item__photo-hint:hover {
  color: var(--color-primary, inherit);
  background: var(--color-primary-bg, #2e1a14);
}
```

---

### 3. WelcomeTour.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .tour-tooltip {
  background: var(--color-card, #1e1e32);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
}

body.dark .tour-tooltip__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .tour-tooltip__content {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .tour-tooltip__progress {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .tour-tooltip__skip {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .tour-tooltip__skip:hover {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text, #e0e0ee);
}

body.dark .tour-tooltip__counter {
  color: var(--color-text-muted, #686880);
}
```

---

### 4. MobileBottomNav.css

```css
/* ── 暗色模式 ── */

body.dark .mobile-bottom-nav {
  background: var(--color-card, #1e1e32);
  border-top-color: var(--color-border, #2e2e48);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
}

body.dark .mobile-bottom-nav__item {
  color: var(--color-text-muted, #686880);
}

body.dark .mobile-bottom-nav__item:hover,
body.dark .mobile-bottom-nav__item.is-active {
  color: var(--color-primary, inherit);
}

body.dark .mobile-bottom-nav__indicator {
  background: var(--color-primary, inherit);
}

body.dark .mobile-bottom-nav__item:active {
  background: var(--color-primary-bg, #2e1a14);
}

body.dark .mobile-bottom-nav__item[href="/recipe/new"] .mobile-bottom-nav__icon {
  background: var(--color-primary, inherit);
  box-shadow: 0 3px 12px rgba(232, 102, 62, 0.3);
}
```

---

### 5. PersonalizedRecommendations.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .personalized-rec__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .personalized-rec__tabs {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .personalized-rec__tab {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .personalized-rec__tab:hover {
  color: var(--color-text, #e0e0ee);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .personalized-rec__tab.active {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .personalized-rec__empty {
  color: var(--color-text-secondary, #9898b0);
}
```

---

### 6. CollectionComments.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .collection-comments {
  border-top-color: var(--color-border, #2e2e48);
}

body.dark .comments-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-input {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-input:focus {
  border-color: var(--color-primary, inherit);
  background: var(--color-card, #1e1e32);
}

body.dark .comment-char-count {
  color: var(--color-text-muted, #686880);
}

body.dark .comment-login-hint {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comments-loading,
body.dark .comments-empty {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comments-error {
  color: var(--color-primary, inherit);
}

body.dark .comments-error button {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .comment-item {
  background: var(--color-card, #1e1e32);
}

body.dark .comment-author {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-time {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .comment-text {
  color: var(--color-text, #e0e0ee);
}

body.dark .comment-delete-btn {
  color: var(--color-text-secondary, #9898b0);
}
```

---

### 7. FilterPanel.css

```css
/* ── 暗色模式 ── */

body.dark .filter-panel__toggle {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .filter-panel__toggle:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
  background: var(--color-primary-bg, #2e1a14);
}

body.dark .filter-panel__toggle.is-active {
  background: var(--color-primary, inherit);
  border-color: var(--color-primary, inherit);
  color: #fff;
}

body.dark .filter-panel__body {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .filter-panel__label {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .filter-panel__option {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .filter-panel__option:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .filter-panel__option.is-selected {
  background: var(--color-primary, inherit);
  border-color: var(--color-primary, inherit);
  color: #fff;
}

body.dark .filter-panel__chip {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-primary, inherit);
}

body.dark .filter-panel__chip-close {
  background: rgba(232, 102, 62, 0.2);
  color: var(--color-primary, inherit);
}

body.dark .filter-panel__reset {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-muted, #686880);
}

body.dark .filter-panel__reset:hover {
  border-color: var(--color-error, #ff4d4f);
  color: var(--color-error, #ff4d4f);
}

body.dark .filter-panel__done-btn {
  background: var(--color-primary, inherit);
}

body.dark .filter-panel__done-btn:hover {
  background: var(--color-primary-dark, #c94f2a);
}
```

---

### 8. HomeTagsSection.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .home-tags-card {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .home-tags-card:hover {
  background: var(--color-primary-bg, #2e1a14);
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}
```

---

### 9. ActivityHeatmap.css

**文件已有 `.dark` 选择器**。

```css
/* ── 暗色模式 ── */

body.dark .activity-heatmap__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .activity-heatmap__cell--0 {
  background: var(--color-bg-secondary, #1a1a2e);
  opacity: 0.4;
}

body.dark .activity-heatmap__cell--1 { background: #1b5e20; }
body.dark .activity-heatmap__cell--2 { background: #2e7d32; }
body.dark .activity-heatmap__cell--3 { background: #388e3c; }
body.dark .activity-heatmap__cell--4 { background: #43a047; }
body.dark .activity-heatmap__cell--5 { background: #66bb6a; }

body.dark .activity-heatmap__legend {
  color: var(--color-text-muted, #686880);
}

body.dark .heatmap-loading {
  color: var(--color-text-muted, #686880);
}
```

---

### 10. PageTransition.css

纯动画文件，不涉及颜色/背景/文字样式，无需暗色模式。

```
无需修改 — 该文件仅含 CSS 过渡动画，无颜色、背景、边框等属性
```

---

### 11. RecipeCardSkeleton.css

```css
/* ── 暗色模式 ── */

body.dark .recipe-card-skeleton {
  background: var(--color-card, #1e1e32);
}
```

---

### 12. ErrorBoundary.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .error-boundary {
  background: var(--color-bg, #12121e);
}

body.dark .error-boundary__card {
  background: var(--color-card, #1e1e32);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark .error-boundary__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .error-boundary__desc {
  color: var(--color-text-muted, #686880);
}

body.dark .error-boundary__details {
  border-color: var(--color-border, #2e2e48);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .error-boundary__details pre {
  color: #ff6b6b;
}

body.dark .error-boundary__btn--retry {
  background: var(--color-primary, inherit);
}

body.dark .error-boundary__btn--home {
  background: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .error-boundary__btn--home:hover {
  background: var(--color-text-muted, #686880);
  color: #fff;
}
```

---

### 13. PrintView.css

`@media print` 内已强制 `color: #000` 和 `background: transparent`，不受暗色模式影响。

```css
/* ── 暗色模式 ── */

body.dark .detail__print-btn {
  background: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .detail__print-btn:hover {
  background: var(--color-text-muted, #686880);
  color: var(--color-text, #e0e0ee);
}
```

---

### 14. FavoriteButton.css

```css
/* ── 暗色模式 ── */

body.dark .favorite-btn {
  color: var(--color-text-muted, #686880);
}

body.dark .favorite-btn:hover,
body.dark .favorite-btn--active {
  color: var(--color-primary, inherit);
}
```

---

### 15. Skeleton.css

```css
/* ── 暗色模式 ── */

body.dark .skeleton {
  background: linear-gradient(
    90deg,
    var(--color-skeleton-from, #262640) 25%,
    var(--color-skeleton-to, #303050) 37%,
    var(--color-skeleton-from, #262640) 63%
  );
  background-size: 400% 100%;
}
```

---

### 16. ShareModal.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .share-modal {
  background: var(--color-card, #1e1e32);
}

body.dark .share-modal__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .share-modal__close {
  color: var(--color-text-muted, #686880);
}

body.dark .share-modal__close:hover {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .share-modal__card {
  border-color: var(--color-border, #2e2e48);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .share-modal__card-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .share-modal__card-desc,
body.dark .share-modal__loading {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .share-modal__card-footer {
  color: var(--color-text-muted, #686880);
}

body.dark .share-modal__platform-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .share-modal__platform-btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .share-modal__platform-name {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .share-modal__link-input {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .share-modal__copy-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .share-modal__copy-btn:hover {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .share-modal__share-text {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .share-modal__details-summary {
  color: var(--color-text-muted, #686880);
}
```

---

### 17. KeyboardShortcuts.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .shortcuts-panel {
  background: var(--color-card, #1e1e32);
}

body.dark .shortcuts-panel__header h2 {
  color: var(--color-text, #e0e0ee);
}

body.dark .shortcuts-panel__close {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .shortcuts-panel__close:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .shortcuts-panel__item {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .shortcuts-panel__key {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .shortcuts-panel__desc {
  color: var(--color-text, #e0e0ee);
}

body.dark .shortcuts-panel__hint {
  color: var(--color-text-muted, #686880);
}
```

---

### 18. ToggleList.css

```css
/* ── 暗色模式 ── */

body.dark .toggle-list__btn {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .toggle-list__btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-primary, inherit);
  border-color: var(--color-primary, inherit);
}
```

---

### 19. ProgressiveImage.css

```css
/* ── 暗色模式 ── */

body.dark .progressive-image__placeholder {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 100%
  );
}

body.dark .progressive-image__error {
  background: var(--color-bg-secondary, #1a1a2e);
}
```

---

### 20. ViewToggle.css

```css
/* ── 暗色模式 ── */

body.dark .view-toggle {
  border-color: var(--color-border, #2e2e48);
}

body.dark .view-toggle__btn {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .view-toggle__btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .view-toggle__btn--active {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .view-toggle__btn:not(:last-child) {
  border-right-color: var(--color-border, #2e2e48);
}
```

---

### 21. Breadcrumb.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .breadcrumb__link {
  color: var(--color-text-muted, #686880);
}

body.dark .breadcrumb__link:hover {
  color: var(--color-primary, inherit);
}

body.dark .breadcrumb__current {
  color: var(--color-text, #e0e0ee);
}

body.dark .breadcrumb__item + .breadcrumb__item::before {
  color: var(--color-text-muted, #686880);
}
```

---

### 22. Footer.css

Footer.css 已全面使用 CSS 变量（`--color-card`、`--color-border`、`--color-text` 等），`body.dark` 的全局变量覆写会自动生效。以下为显式后备：

```css
/* ── 暗色模式 ── */

body.dark .footer {
  background: var(--color-card, #1e1e32);
  border-top-color: var(--color-border, #2e2e48);
}

body.dark .footer__bottom {
  border-top-color: var(--color-border, #2e2e48);
}
```

---

### 23. ImageLightbox.css

灯箱已有固定半透明黑色背景 `rgba(0, 0, 0, 0.85)`，不受主题影响。

```
无需修改 — 灯箱背景固定为 rgba(0, 0, 0, 0.85)
```

---

## 页面（8 个）

---

### 24. CookingJournalPage.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .cooking-journal__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__view-btn {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__view-btn.active {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .cooking-journal__view-btn:not(.active):hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .cooking-journal__loading,
body.dark .cooking-journal__empty {
  color: var(--color-text-muted, #686880);
}

body.dark .cooking-journal__stat-card {
  background: var(--color-card, #1e1e32);
}

body.dark .cooking-journal__stat-number {
  color: var(--color-primary, inherit);
}

body.dark .cooking-journal__stat-label {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__chart {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .cooking-journal__chart-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__chart-bars {
  border-bottom-color: var(--color-border, #2e2e48);
}

body.dark .cooking-journal__chart-value,
body.dark .cooking-journal__chart-label {
  color: var(--color-text-muted, #686880);
}

body.dark .cooking-journal__category-name {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__category-bar-bg {
  background: var(--color-border, #2e2e48);
}

body.dark .cooking-journal__category-count {
  color: var(--color-text-muted, #686880);
}

body.dark .cooking-journal__card {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .cooking-journal__card-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__card-meta {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__card-cat {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__card-notes {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__action-btn {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cooking-journal__action-btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .cooking-journal__action-btn--delete:hover {
  background: #3d1f1f;
}

body.dark .cooking-journal__page-info {
  color: var(--color-text-muted, #686880);
}

body.dark .cooking-journal__page-btn {
  border-color: var(--color-border, #2e2e48);
  background: var(--color-card, #1e1e32);
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__page-btn:not(:disabled):hover {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .cooking-journal__modal {
  background: var(--color-card, #1e1e32);
}

body.dark .cooking-journal__modal-header h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__modal-close {
  color: var(--color-text-muted, #686880);
}

body.dark .cooking-journal__form-group label {
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__form-group input,
body.dark .cooking-journal__form-group textarea,
body.dark .cooking-journal__form-group select {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .cooking-journal__recipe-title-preview {
  color: #4a90d9;
}

body.dark .cooking-journal__recipe-title-preview.error {
  color: #e74c3c;
}

body.dark .cooking-journal__chart-bar {
  background: linear-gradient(180deg, var(--color-primary, inherit), #f0a080);
}
```

---

### 25. ComparePage.css

**文件已有 `[data-theme=dark]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .cmp-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-input-section {
  background: var(--color-card, #1e1e32);
}

body.dark .cmp-input-label {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cmp-textarea {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-summary {
  background: var(--color-card, #1e1e32);
}

body.dark .cmp-summary h2 {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-summary p {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cmp-tag {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-primary, inherit);
}

body.dark .cmp-tag--info {
  background: #1a2940;
  color: #64b5f6;
}

body.dark .cmp-tag--warn {
  background: #3d3515;
  color: #ffb74d;
}

body.dark .cmp-tag--common {
  background: #1a3a1a;
  color: #81c784;
}

body.dark .cmp-table {
  background: var(--color-card, #1e1e32);
}

body.dark .cmp-table th,
body.dark .cmp-table td {
  border-bottom-color: var(--color-border, #2e2e48);
}

body.dark .cmp-th-label {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cmp-th-value {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-th--0 { background: #3a1e14; }
body.dark .cmp-th--1 { background: #1a2e1a; }
body.dark .cmp-th--2 { background: #14263a; }

body.dark .cmp-link {
  color: var(--color-primary, inherit);
}

body.dark .cmp-td-label {
  color: var(--color-text-secondary, #9898b0);
  background: var(--color-card, #1e1e32);
}

body.dark .cmp-td-value {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-row-even td {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .cmp-meta {
  color: var(--color-text-muted, #686880);
}

body.dark .cmp-null {
  color: var(--color-text-muted, #686880);
}

body.dark .cmp-ingredient-item {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .cmp-nutrition-label {
  color: var(--color-text-muted, #686880);
}

body.dark .cmp-nutrition-value {
  color: var(--color-text, #e0e0ee);
}

body.dark .cmp-common {
  background: var(--color-card, #1e1e32);
}

body.dark .cmp-common h3 {
  color: var(--color-text, #e0e0ee);
}
```

---

### 26. PreferencesPage.css

**文件已有 `[data-theme=dark]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .pref-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .pref-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .pref-subtitle {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pref-section {
  background: var(--color-card, #1e1e32);
}

body.dark .pref-section-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .pref-hint {
  color: var(--color-text-muted, #686880);
}

body.dark .pref-option-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pref-option-btn:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .pref-option-btn.is-active {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .pref-toggle {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pref-toggle:hover {
  border-color: var(--color-primary, inherit);
}

body.dark .pref-toggle:has(input:checked) {
  background: #422006;
  border-color: #f59e0b;
  color: #fde68a;
}

body.dark .pref-input {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .pref-tag {
  background: #422006;
  color: #fde68a;
}

body.dark .pref-tag-remove {
  color: #fde68a;
}

body.dark .pref-recipe-card {
  background: var(--color-card, #1e1e32);
}

body.dark .pref-recipe-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .pref-recipe-tag {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-primary, inherit);
}

body.dark .pref-recipe-tag--normal {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pref-recipe-desc {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pref-empty {
  color: var(--color-text-muted, #686880);
}

body.dark .pref-recipe-cover {
  background: var(--color-bg-secondary, #1a1a2e);
}
```

---

### 27. NutritionDashboard.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .nutrition-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-login-hint {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-date-input {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-action-btn.small {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-action-btn.small:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .nutrition-loading,
body.dark .nutrition-error {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-summary-card {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .nutrition-cal-value {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-cal-label,
body.dark .nutrition-bar-label {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-bar-track {
  background: var(--color-border, #2e2e48);
}

body.dark .nutrition-bar-value {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-suggestion.warning { background: #3d3515; }
body.dark .nutrition-suggestion.info { background: #1a2940; }
body.dark .nutrition-suggestion.success { background: #1a3a1a; }

body.dark .nutrition-meal-tab {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-meal-tab.active {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .nutrition-meal-tab:hover:not(.active) {
  border-color: var(--color-primary, inherit);
}

body.dark .nutrition-empty {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-log-item {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .nutrition-log-meal {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-log-recipe {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-log-servings {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-log-cal {
  color: var(--color-primary, inherit);
}

body.dark .nutrition-log-delete {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-log-delete:hover {
  background: #3d1f1f;
  color: #e74c3c;
}

body.dark .nutrition-add-btn {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nutrition-add-btn:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .nutrition-weekly h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-bar-chart {
  border-bottom-color: var(--color-border, #2e2e48);
}

body.dark .nutrition-bar-col-label,
body.dark .nutrition-bar-col-val {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-monthly h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-monthly-item {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .nm-label {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .nm-value {
  color: var(--color-text, #e0e0ee);
}

body.dark .nm-value small {
  color: var(--color-text-muted, #686880);
}

body.dark .nutrition-modal {
  background: var(--color-card, #1e1e32);
}

body.dark .nutrition-modal h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-modal label {
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-modal label input,
body.dark .nutrition-modal label select {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .nutrition-modal-actions button:not(.primary) {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}
```

---

### 28. SearchPage.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .search-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .search-input {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .search-input::placeholder {
  color: var(--color-text-muted, #686880);
}

body.dark .search-hot-words__label {
  color: var(--color-text, #e0e0ee);
}

body.dark .search-hot-word {
  background: var(--color-bg-secondary, #1a1a2e);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .search-hot-word:hover {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .search-history__label {
  color: var(--color-text, #e0e0ee);
}

body.dark .search-history__clear {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-muted, #686880);
}

body.dark .search-history-tag {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-primary, inherit);
}

body.dark .search-history-tag:hover {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .search-history-tag--del {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-primary, inherit);
}

body.dark .search-history-tag--del:hover {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .search-history-tag__del {
  background: var(--color-primary-bg, #2e1a14);
  color: var(--color-text-muted, #686880);
}

body.dark .search-history-tag__del:hover {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .search-filter-tag {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .search-filter-tag:hover {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .search-filter-tag.is-active {
  background: var(--color-primary, inherit);
  border-color: var(--color-primary, inherit);
  color: #fff;
}

body.dark .search-filter-clear-all {
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text-muted, #686880);
}

body.dark .search-result-info {
  color: var(--color-text-muted, #686880);
}

body.dark .search-empty__text {
  color: var(--color-text, #e0e0ee);
}

body.dark .search-empty__hint,
body.dark .search-empty__suggestions-label {
  color: var(--color-text-muted, #686880);
}

body.dark .pagination-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .pagination-btn:hover:not(:disabled) {
  border-color: var(--color-primary, inherit);
  color: var(--color-primary, inherit);
}

body.dark .pagination-info {
  color: var(--color-text-secondary, #9898b0);
}

@media (max-width: 480px) {
  body.dark .search-tag-group__label {
    background: var(--color-bg, #12121e);
  }
}
```

---

### 29. PantryPage.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .pantry-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-alert.expired {
  background: #3d1f1f;
  color: #ef9a9a;
}

body.dark .pantry-alert.soon {
  background: #3d3515;
  color: #ffcc80;
}

body.dark .pantry-search,
body.dark .pantry-sort,
body.dark .pantry-sort-order {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-cat-btn {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pantry-cat-btn:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .pantry-cat-btn.active {
  background: var(--color-primary, inherit);
  color: #fff;
}

body.dark .pantry-loading,
body.dark .pantry-error,
body.dark .pantry-empty {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pantry-card {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .pantry-card-name {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-card-qty {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .pantry-card-cat {
  background: var(--color-bg-secondary, #1a1a2e);
  color: var(--color-text-muted, #686880);
}

body.dark .pantry-action-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-action-btn.primary {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .pantry-suggestions h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-suggestion-card span {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-modal {
  background: var(--color-card, #1e1e32);
}

body.dark .pantry-modal h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-modal label {
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-modal label input,
body.dark .pantry-modal label select {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-modal-actions button:not(.primary) {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .pantry-quick-row input,
body.dark .pantry-quick-row select {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}
```

---

### 30. NotFoundPage.css

**文件已有 `[data-theme='dark']` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .not-found-page {
  color: var(--color-text, #e0e0ee);
}

body.dark .not-found-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .not-found-desc {
  color: var(--color-text-secondary, #9898b0);
}

body.dark .not-found-recommend__title {
  color: var(--color-text, #e0e0ee);
}
```

---

### 31. MealPlannerPage.css

**文件已有 `[data-theme="dark"]` 模式**。

```css
/* ── 暗色模式 ── */

body.dark .meal-planner {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__title {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__btn--clear {
  background: var(--color-border, #2e2e48);
  color: var(--color-text-secondary, #9898b0);
}

body.dark .meal-planner__btn--clear:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__week-nav {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__week-btn {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__week-btn:hover {
  background: var(--color-primary, inherit);
  color: #fff;
  border-color: var(--color-primary, inherit);
}

body.dark .meal-planner__week-label {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__loading {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__grid {
  background: var(--color-card, #1e1e32);
  border-color: var(--color-border, #2e2e48);
}

body.dark .meal-planner__grid-header {
  border-bottom-color: var(--color-border, #2e2e48);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__day-header {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__day-date {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__grid-row {
  border-bottom-color: var(--color-border, #2e2e48);
}

body.dark .meal-planner__time-col {
  border-right-color: var(--color-border, #2e2e48);
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__time-label {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__slot {
  border-right-color: var(--color-border, #2e2e48);
}

body.dark .meal-planner__slot:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__slot-placeholder {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__meal-card {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__meal-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__search-modal {
  background: var(--color-card, #1e1e32);
}

body.dark .meal-planner__search-header h3 {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__search-close {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__search-input {
  background: var(--color-input-bg, #282840);
  border-color: var(--color-input-border, #3e3e58);
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__search-input:focus {
  border-color: var(--color-primary, inherit);
}

body.dark .meal-planner__search-item:hover {
  background: var(--color-bg-secondary, #1a1a2e);
}

body.dark .meal-planner__search-title {
  color: var(--color-text, #e0e0ee);
}

body.dark .meal-planner__search-meta {
  color: var(--color-text-muted, #686880);
}

body.dark .meal-planner__search-empty,
body.dark .meal-planner__search-hint {
  color: var(--color-text-muted, #686880);
}
```
