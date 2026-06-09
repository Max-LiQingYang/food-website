# UI 设计规范 — 食谱快速预览与互动增强

> **项目**: food-website | **迭代**: #117 | **方向**: B/功能增强  
> **日期**: 2026-06-10 | **基于 PRD**: iter-preview/PRD-preview.md

---

## 1. 设计 Token

### 1.1 新增 `--preview-*` Token

```css
:root {
  /* 模态框 */
  --preview-overlay:        rgba(0, 0, 0, 0.6);
  --preview-overlay-dark:   rgba(0, 0, 0, 0.8);
  --preview-bg:             var(--color-card, #ffffff);
  --preview-bg-dark:        #1a1a2e;
  --preview-text:           var(--color-text, #2d2d2d);
  --preview-text-dark:      #e0e0ee;
  --preview-text-secondary: var(--color-text-secondary, #666666);
  --preview-text-secondary-dark: #9898b0;
  --preview-section-bg:     var(--color-bg-secondary, #f5f0eb);
  --preview-section-bg-dark: #2a2520;
  --preview-border:         var(--color-border, #e8e0d8);
  --preview-border-dark:    #333;
  --preview-close-btn:      #666;
  --preview-close-btn-dark: #aaa;
  --preview-radius:         12px;
  --preview-radius-mobile:  0px;
  --preview-max-width:      520px;
  --preview-z:              10000;
  --preview-transition:     0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

body.dark {
  --preview-overlay:        rgba(0, 0, 0, 0.8);
  --preview-bg:             #1a1a2e;
  --preview-text:           #e0e0ee;
  --preview-text-secondary: #9898b0;
  --preview-section-bg:     #2a2520;
  --preview-border:         #333;
  --preview-close-btn:      #aaa;
}
```

### 1.2 新增 `--action-menu-*` Token

```css
:root {
  --action-menu-bg:             var(--color-card, #ffffff);
  --action-menu-bg-dark:        #1e1e32;
  --action-menu-border:         var(--color-border, #e8e0d8);
  --action-menu-border-dark:    #2e2e48;
  --action-menu-shadow:         0 4px 16px rgba(0,0,0,0.12);
  --action-menu-shadow-dark:    0 8px 32px rgba(0,0,0,0.5);
  --action-menu-item-hover:     var(--color-primary-bg, #fff3ed);
  --action-menu-item-hover-dark: rgba(232, 102, 62, 0.15);
  --action-menu-item-text:      var(--color-text, #2d2d2d);
  --action-menu-item-text-dark: #e0e0ee;
  --action-menu-icon-color:     var(--color-text-secondary, #666);
  --action-menu-icon-color-dark: #9898b0;
  --action-menu-z:              10001;
  --action-menu-radius:         10px;
  --action-menu-item-min-height: 44px;
  --action-menu-kebab-bg:       rgba(255,255,255,0.85);
  --action-menu-kebab-bg-dark:  rgba(30,30,50,0.85);
  --action-menu-kebab-color:    #666;
  --action-menu-kebab-color-dark: #aaa;
}

body.dark {
  --action-menu-bg:             #1e1e32;
  --action-menu-border:         #2e2e48;
  --action-menu-shadow:         0 8px 32px rgba(0,0,0,0.5);
  --action-menu-item-hover:     rgba(232, 102, 62, 0.15);
  --action-menu-item-text:      #e0e0ee;
  --action-menu-icon-color:     #9898b0;
  --action-menu-kebab-bg:       rgba(30,30,50,0.85);
  --action-menu-kebab-color:    #aaa;
}
```

### 1.3 新增 `--daily-pick-*` Token

```css
:root {
  --daily-pick-reason-bg:       var(--color-primary, #e8663e);
  --daily-pick-reason-color:    #fff;
  --daily-pick-reason-radius:   6px;
  --daily-pick-reason-font:     11px;
  --daily-pick-scroll-gap:      12px;
  --daily-pick-card-min-width:  280px;
}

body.dark {
  --daily-pick-reason-bg:       #ff8c5a;
}
```

---

## 2. QuickPreviewModal 视觉规范

### 2.1 结构

```
┌─────────────────────────────────┐
│  [×] 关闭按钮 (fixed top-right) │  ← z-index: 10001
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │   封面大图 (max-h: 40vh)  │  │  ← object-fit: cover
│  │   aspect-ratio: 16/9     │  │
│  └───────────────────────────┘  │
│  ──── 分隔线 ────               │
│  标题 (h2, 18px, 600 weight)   │
│  🟢 简单 · ⏱ 25分钟 · ★ 4.5   │  ← 12px, 灰色
│                                 │
│  简介 (14px, line-height 1.6)   │  ← 最多2行截断
│                                 │
│  ── 📋 食材清单 ──              │
│  ┌───────────────────────────┐  │
│  │ 鸡肉 300g                 │  │  ← 13px, 灰色背景
│  │ 土豆 2个                  │  │
│  │ ... +4 种更多食材          │  │
│  └───────────────────────────┘  │
│                                 │
│  ── 📝 步骤概要 ──              │
│  ┌───────────────────────────┐  │
│  │ 1. 鸡肉切块腌制            │  │  ← 13px, 灰色背景
│  │ 2. 热油爆香姜蒜            │  │
│  │ 3. 加入鸡块翻炒至变色      │  │
│  └───────────────────────────┘  │
│                                 │
│  [ 查看详情 → ]                 │  ← 主色按钮, full-width
└─────────────────────────────────┘
```

### 2.2 桌面端 (≥768px)

| 属性 | 值 |
|------|-----|
| 定位 | fixed, center screen |
| max-width | 520px |
| max-height | 90vh |
| border-radius | 12px |
| box-shadow | 0 16px 48px rgba(0,0,0,0.2) |
| 遮罩 | fixed inset, z-index: 9999, backdrop-filter: blur(2px) |
| 内容区 padding | 20px |
| 关闭按钮 | 32×32, top-right, -8px offset |

### 2.3 移动端 (≤768px)

| 属性 | 值 |
|------|-----|
| 定位 | fixed, bottom: 0 |
| width | 100vw |
| height | 100dvh |
| border-radius | 0 |
| 入场动画 | translateY(100%) → translateY(0), 300ms ease |
| 关闭按钮 | 44×44 (touch target), top-right |
| 内容区 padding | 16px |
| 食材/步骤区域 | 无圆角 |

### 2.4 食材清单样式

```css
.preview__ingredients {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 12px;
  background: var(--preview-section-bg);
  border-radius: 8px;
  font-size: 13px;
  color: var(--preview-text);
}
.preview__ingredient-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.preview__ingredient-more {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--preview-text-secondary);
  font-size: 12px;
  padding: 6px;
  border-top: 1px dashed var(--preview-border);
}
```

### 2.5 步骤概要样式

```css
.preview__steps {
  padding: 12px;
  background: var(--preview-section-bg);
  border-radius: 8px;
}
.preview__step-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--preview-text);
  line-height: 1.5;
}
.preview__step-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
```

### 2.6 查看详情按钮

```css
.preview__cta {
  display: block;
  width: 100%;
  padding: 14px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
}
.preview__cta:hover {
  background: var(--color-primary-dark);
}
```

### 2.7 入场/离场动画

```css
/* 遮罩 */
.preview-overlay {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.preview-overlay--open {
  opacity: 1;
}

/* 模态框 - 桌面端 */
.preview-modal {
  transform: scale(0.95);
  opacity: 0;
  transition: transform 0.3s var(--ease-out-back), opacity 0.25s ease;
}
.preview-modal--open {
  transform: scale(1);
  opacity: 1;
}

/* 模态框 - 移动端 */
@media (max-width: 768px) {
  .preview-modal {
    transform: translateY(100%);
    transition: transform 0.3s var(--ease-out-soft);
  }
  .preview-modal--open {
    transform: translateY(0);
  }
}
```

---

## 3. RecipeActionMenu 视觉规范

### 3.1 Kebab 按钮 (⋮)

```css
.recipe-card__kebab {
  position: absolute;
  top: 44px;  /* 收藏按钮下方 */
  right: 8px;
  z-index: 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--action-menu-kebab-bg);
  backdrop-filter: blur(4px);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--action-menu-kebab-color);
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.recipe-card:hover .recipe-card__kebab,
.recipe-card:focus-within .recipe-card__kebab {
  opacity: 1;
}
@media (max-width: 480px) {
  .recipe-card__kebab {
    opacity: 1;
  }
}
```

### 3.2 下拉菜单 (桌面端)

```css
.action-menu {
  position: fixed;
  background: var(--action-menu-bg);
  border: 1px solid var(--action-menu-border);
  border-radius: var(--action-menu-radius);
  box-shadow: var(--action-menu-shadow);
  padding: 6px;
  min-width: 190px;
  z-index: var(--action-menu-z);
  animation: actionMenuIn 0.2s var(--ease-out-back);
}
@keyframes actionMenuIn {
  from { opacity: 0; transform: scale(0.92) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.action-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--action-menu-item-text);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  min-height: var(--action-menu-item-min-height);
}
.action-menu__item:hover {
  background: var(--action-menu-item-hover);
}
.action-menu__item:active {
  transform: scale(0.97);
}
.action-menu__icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
```

### 3.3 底部弹出菜单 (移动端)

```css
@media (max-width: 768px) {
  .action-menu {
    position: fixed;
    left: 50% !important;
    top: auto !important;
    bottom: 0 !important;
    transform: translateX(-50%);
    width: calc(100% - 32px);
    max-width: 400px;
    border-radius: 16px 16px 10px 10px;
    animation: actionMenuSlideUp 0.3s var(--ease-out-soft);
  }
  @keyframes actionMenuSlideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .action-menu__item {
    justify-content: flex-start;
    padding: 14px;
    font-size: 15px;
  }
}
```

### 3.4 菜单项图标映射

| 菜单项 | 图标 | 颜色 |
|--------|------|------|
| 收藏/取消收藏 | ❤️ | --color-error (取消时灰色) |
| 加入购物清单 | 🛒 | --color-primary |
| 加入餐单计划 | 📅 | --color-info |
| 分享 | 📤 | --color-accent |
| 添加到收藏夹 | 📁 | --color-warning |

---

## 4. DailyPickCard 多道推荐展示

### 4.1 登录用户：3 道推荐

```css
.daily-pick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
@media (max-width: 768px) {
  .daily-pick-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

### 4.2 推荐理由标签

```css
.daily-pick-reason {
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--daily-pick-reason-radius);
  background: var(--daily-pick-reason-bg);
  color: var(--daily-pick-reason-color);
  font-size: var(--daily-pick-reason-font);
  font-weight: 500;
  margin-top: 6px;
  white-space: nowrap;
}
```

### 4.3 推荐卡片 (小型)

```css
.daily-pick-mini {
  background: var(--color-card);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.daily-pick-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
}
.daily-pick-mini__image {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}
.daily-pick-mini__body {
  padding: 10px 12px 12px;
}
.daily-pick-mini__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.daily-pick-mini__meta {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  gap: 8px;
  align-items: center;
}
```

---

## 5. 暗色模式覆盖规则

所有新组件必须包含 `body.dark` 样式块：

| 组件 | 暗色关键变化 |
|------|-------------|
| QuickPreviewModal | 遮罩 `rgba(0,0,0,0.8)`, 背景 `--preview-bg-dark`, 食材区 `--preview-section-bg-dark` |
| RecipeActionMenu | 背景 `--action-menu-bg-dark`, 边框 `--action-menu-border-dark`, hover `--action-menu-item-hover-dark` |
| DailyPickMini | 背景 `--color-card` (已由 global.css 暗色变量覆盖), 阴影加深 |

---

## 6. 响应式断点

| 断点 | 行为 |
|------|------|
| ≥1024px | 桌面端：预览模态框居中 520px，菜单向右下方弹出，推荐 3 列 |
| 768-1023px | 平板：预览模态框居中 480px，菜单向右下方弹出，推荐 2 列 |
| ≤768px | 移动端：预览全屏底部滑入，菜单底部弹出，推荐 1 列 |
| ≤480px | 小屏：预览全屏，触摸热区 44px |

---

## 7. 现有上下文菜单扩展

现有 RecipeCard 的 `recipe-card__context-menu` 样式已基本满足需求（z-index: 9999, 动画, 暗色模式）。扩展时只需：

1. 将 3 项菜单扩展为 5 项（增加「餐单计划」「收藏夹」）
2. 移动端保持底部弹出（已有 `@media (max-width: 480px)` 样式）
3. 菜单项 `handleContextAction` 增加 `mealplan` 和 `collection` 分支