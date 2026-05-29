# PRD: 食谱收藏备注功能 — 界面设计方案

> 基于现有设计语言（暖橙 #e8663e 主题 / CSS 变量 / body.dark 暗色模式），为「食谱收藏备注」功能输出完整 UI 样式方案。
> 项目：food-website · Commit: e4bdc05

---

## 目录

1. [整体设计原则](#1-整体设计原则)
2. [组件 1：FavoriteNoteModal（收藏备注编辑弹窗）](#2-组件-1favoritenotemodal收藏备注编辑弹窗)
3. [组件 2：NotePreview（备注预览条）](#3-组件-2notepreview备注预览条)
4. [组件 3：NoteButton（📝 编辑图标按钮）](#4-组件-3notebutton--编辑图标按钮)
5. [全局 CSS 变量新增](#5-全局-css-变量新增)
6. [动画与过渡](#6-动画与过渡)
7. [暗色模式对照表](#7-暗色模式对照表)
8. [验收清单](#8-验收清单)

---

## 1. 整体设计原则

| 原则 | 说明 |
|------|------|
| CSS 变量优先 | 所有颜色、间距、圆角、阴影必须使用 `var(--xxx)`，禁止硬编码 |
| 组件级隔离 | 每个组件使用独立 CSS 模块（`.favorite-note-modal` 命名空间） |
| 暗色并行 | 每个样式规则必须同时提供浅色/深色两套，通过 `body.dark` 选择器 |
| 移动优先 | Mobile-first 断点 ≤768px 为移动端全屏底栏，>768px 为居中弹窗 |
| 4px 网格 | 间距基准单元 4px，不使用非 4px 倍数间距 |
| 最小字号 | ≥11px |

---

## 2. 组件 1：FavoriteNoteModal（收藏备注编辑弹窗）

### 2.1 结构层级

```
Overlay（遮罩层）
└── Modal（弹窗容器）
    ├── ModalHeader
    │   ├── Title（"收藏备注"）
    │   └── CloseButton（× 关闭按钮）
    ├── ModalBody
    │   └── Textarea（多行输入区）
    └── ModalFooter
        ├── CancelButton（取消）
        ├── CharCounter（字数统计 "n/500"）
        └── SaveButton（保存）
```

### 2.2 桌面端（>768px）— 居中模态框

#### 遮罩层 `.favorite-note-overlay`

```css
.favorite-note-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: overlayFadeIn 0.2s ease;
}

body.dark .favorite-note-overlay {
  background: rgba(0, 0, 0, 0.65);
}
```

#### 弹窗容器 `.favorite-note-modal`

```css
.favorite-note-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: var(--color-card);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
  animation: modalZoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

body.dark .favorite-note-modal {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

#### 弹窗头部 `.favorite-note-modal__header`

```css
.favorite-note-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
}

.favorite-note-modal__title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
}

.favorite-note-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background var(--transition-fast, 0.2s ease),
              color var(--transition-fast, 0.2s ease);
}

.favorite-note-modal__close:hover {
  background: var(--color-tag-bg);
  color: var(--color-text);
}

.favorite-note-modal__close:active {
  transform: scale(0.92);
}

body.dark .favorite-note-modal__close:hover {
  background: var(--color-bg-secondary);
}
```

#### 弹窗主体 `.favorite-note-modal__body`

```css
.favorite-note-modal__body {
  padding: 16px;
}
```

#### 文本域 `.favorite-note-modal__textarea`

```css
.favorite-note-modal__textarea {
  width: 100%;
  min-height: 140px;
  max-height: 320px;
  padding: 12px;
  border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--color-border);
  background: var(--color-input-bg);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast, 0.2s ease),
              box-shadow var(--transition-fast, 0.2s ease);
  font-family: inherit;
  box-sizing: border-box;
}

/* 占位符 */
.favorite-note-modal__textarea::placeholder {
  color: var(--color-text-muted);
}

/* 聚焦态 */
.favorite-note-modal__textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

/* 暗色聚焦态 */
body.dark .favorite-note-modal__textarea:focus {
  border-color: var(--color-primary-dark, #c94f2a);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

/* 禁用态（保存后短暂锁定） */
.favorite-note-modal__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### 弹窗底部 `.favorite-note-modal__footer`

```css
.favorite-note-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px 16px;
}
```

#### 字数统计 `.favorite-note-modal__counter`

```css
.favorite-note-modal__counter {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.favorite-note-modal__counter--warn {
  color: var(--color-warning, #f39c12);
}

.favorite-note-modal__counter--over {
  color: var(--color-danger, #e74c3c);
}
```

#### 按钮区域 `.favorite-note-modal__actions`

```css
.favorite-note-modal__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

#### 取消按钮（文字按钮风格）

```css
.favorite-note-modal__cancel {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 8px);
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: border-color var(--transition-fast, 0.2s ease),
              color var(--transition-fast, 0.2s ease),
              background var(--transition-fast, 0.2s ease);
}

.favorite-note-modal__cancel:hover {
  border-color: var(--color-primary-light, #f5a885);
  color: var(--color-primary);
}

.favorite-note-modal__cancel:active {
  transform: scale(0.97);
}
```

#### 保存按钮（主按钮风格）

```css
.favorite-note-modal__save {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-sm, 8px);
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background var(--transition-fast, 0.2s ease),
              transform var(--transition-fast, 0.2s ease);
}

.favorite-note-modal__save:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.favorite-note-modal__save:active {
  transform: scale(0.97);
}

/* 禁用态（空内容 / 保存中） */
.favorite-note-modal__save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.favorite-note-modal__save:disabled:hover {
  background: var(--color-primary);
  transform: none;
}
```

### 2.3 移动端（≤768px）— 全屏底部滑入

#### 移动端弹窗容器

```css
@media (max-width: 768px) {
  /* 遮罩层改为透明（为触摸区域保留） */
  .favorite-note-overlay {
    align-items: flex-end;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  body.dark .favorite-note-overlay {
    background: rgba(0, 0, 0, 0.5);
  }

  /* 弹窗改成底部全宽 */
  .favorite-note-modal {
    max-width: none;
    width: 100%;
    border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
    animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-height: 85vh;
    overflow-y: auto;
  }

  /* 拖拽指示条 */
  .favorite-note-modal__drag-handle {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
  }

  .favorite-note-modal__drag-handle::after {
    content: '';
    display: block;
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border);
  }

  body.dark .favorite-note-modal__drag-handle::after {
    background: var(--color-border-dark, #444);
  }

  /* 移动端标题居中 */
  .favorite-note-modal__header {
    padding: 4px 16px 0;
  }

  .favorite-note-modal__title {
    flex: 1;
    text-align: center;
  }

  /* 弹窗主体 */
  .favorite-note-modal__body {
    padding: 12px 16px;
  }

  /* 文本域在移动端不缩放手感 */
  .favorite-note-modal__textarea {
    font-size: 16px; /* iOS 防止自动缩放 */
    -webkit-text-size-adjust: 100%;
  }

  /* 底部布局调整 */
  .favorite-note-modal__footer {
    padding: 0 16px 20px;
  }

  .favorite-note-modal__save,
  .favorite-note-modal__cancel {
    flex: 1;
    text-align: center;
    justify-content: center;
    padding: 12px 16px;
  }
}
```

#### 拖拽关闭手势（CSS 配合 JS）

```css
/* 拖拽中状态 — JS 会设置 transform + opacity */
.favorite-note-modal--dragging {
  transition: none;
  pointer-events: none;
}

/* 关闭动画 */
.favorite-note-modal--closing {
  animation: modalSlideDown 0.25s ease forwards;
}
```

### 2.4 非常小屏幕（≤480px）

```css
@media (max-width: 480px) {
  .favorite-note-modal {
    max-height: 90vh;
  }

  .favorite-note-modal__textarea {
    min-height: 120px;
  }
}
```

---

## 3. 组件 2：NotePreview（备注预览条）

### 3.1 结构层级

```
.note-preview（收藏卡片底部，可选容器）
└── .note-preview__text（备注文本，2行截断 + 省略号）
```

### 3.2 样式规则

#### 容器 `.note-preview`

```css
.note-preview {
  padding: 8px 12px 10px;
  border-top: 1px solid var(--color-border-light, #f0ebe5);
  cursor: pointer;
  transition: background var(--transition-fast, 0.2s ease);
}

/* 悬浮高亮 */
.note-preview:hover {
  background: var(--color-primary-bg);
}

/* 点击反馈 */
.note-preview:active {
  background: var(--color-primary-bg);
}

body.dark .note-preview {
  border-top-color: var(--color-border);
}

body.dark .note-preview:hover {
  background: var(--color-primary-bg);
}
```

#### 备注文本 `.note-preview__text`

```css
.note-preview__text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

body.dark .note-preview__text {
  color: var(--color-text-secondary);
}
```

#### 空态（无备注时隐藏）

```css
/* 无备注时整个预览条不渲染，无需显示隐藏样式 */
/* 标题备注图标左侧设置小装饰 */
.note-preview__icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  font-size: 11px;
  color: var(--color-text-muted);
}
```

#### 预览条入场动画

```css
.note-preview {
  animation: notePreviewIn 0.3s ease;
}

@keyframes notePreviewIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3.3 响应式

```css
@media (max-width: 768px) {
  .note-preview {
    padding: 8px 12px 10px;
  }

  .note-preview:active {
    background: var(--color-primary-bg);
    transform: scale(0.99);
  }
}
```

---

## 4. 组件 3：NoteButton（📝 编辑图标按钮）

### 4.1 结构层级

```
.note-button（紧邻收藏按钮的图标按钮）
└── .note-button__icon（铅笔/编辑图标）
```

### 4.2 样式规则

#### 容器 `.note-button`

```css
.note-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color var(--transition-fast, 0.2s ease),
              color var(--transition-fast, 0.2s ease),
              background var(--transition-fast, 0.2s ease),
              transform var(--transition-fast, 0.2s ease),
              box-shadow var(--transition-fast, 0.2s ease);
  font-size: 16px;
  line-height: 1;
  padding: 0;
  position: relative;
}

/* 悬浮态 */
.note-button:hover {
  border-color: var(--color-primary-light, #f5a885);
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 点击态 */
.note-button:active {
  transform: scale(0.92);
}

/* 无备注时 — 半透明表示辅助功能 */
.note-button--empty {
  opacity: 0.5;
}

.note-button--empty:hover {
  opacity: 1;
}

body.dark .note-button {
  border-color: var(--color-border);
  background: var(--color-card);
  color: var(--color-text-secondary);
}

body.dark .note-button:hover {
  border-color: var(--color-primary-dark, #c94f2a);
  color: var(--color-primary-dark, #c94f2a);
  background: var(--color-primary-bg);
}
```

#### 有备注时的点状指示器

```css
/* 当备注已存在时，在按钮右上角显示小圆点 */
.note-button--has-note::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid var(--color-card);
}

body.dark .note-button--has-note::after {
  border-color: var(--color-card);
}
```

#### 可视化 Tooltip（可选）

```css
.note-button__tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--color-text);
  color: var(--color-bg);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-fast, 0.2s ease);
}

.note-button:hover .note-button__tooltip {
  opacity: 1;
}
```

### 4.3 可见性控制

```css
/* 隐藏态：未收藏时不渲染 — JS 控制返回 null，无需 CSS 隐藏 */
```

### 4.4 响应式

```css
@media (max-width: 768px) {
  .note-button {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  /* 移动端更大点击区域 */
  .note-button:active {
    transform: scale(0.92);
  }
}
```

---

## 5. 全局 CSS 变量新增

建议在 `:root` 中添加以下变量（如不存在）：

```css
:root {
  /* 弹窗变量 */
  --modal-max-width: 420px;
  --modal-z-index: 1000;
  --modal-transition-duration: 0.25s;

  /* 备注预览变量 */
  --note-preview-max-lines: 2;

  /* 编辑按钮变量 */
  --note-button-size: 36px;
  --note-button-size-mobile: 40px;
}

body.dark {
  --modal-overlay-bg: rgba(0, 0, 0, 0.65);
}
```

---

## 6. 动画与过渡

### 6.1 遮罩渐入

```css
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

### 6.2 桌面弹窗缩放入场

```css
@keyframes modalZoomIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### 6.3 移动端底部滑入

```css
@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6.4 移动端底部滑出（关闭时）

```css
@keyframes modalSlideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

### 6.5 拖拽手势视觉反馈

```css
/* 拖拽跟随 — 通过 JS 设置 transform: translateY(${dy}px) */
/* 拖拽超过阈值后松开触发关闭 */
/* 阈值：拖拽距离 > 80px 或速度 > 0.5 */
```

---

## 7. 暗色模式对照表

| 元素 | 浅色值 | 深色覆写 |
|------|--------|----------|
| 遮罩背景 | `rgba(0,0,0,0.45)` | `rgba(0,0,0,0.65)` |
| 移动端遮罩 | `rgba(0,0,0,0.3)` | `rgba(0,0,0,0.5)` |
| 弹窗背景 | `var(--color-card)` | 自动通过变量切换 |
| 弹窗阴影 | `var(--shadow-lg)` | `0 8px 24px rgba(0,0,0,0.5)` |
| 输入框背景 | `var(--color-input-bg)` | 自动通过变量切换 |
| 输入框边框（聚焦） | `var(--color-primary)` + `--color-primary-bg` 阴影 | `var(--color-primary-dark)` + `--color-primary-bg` 阴影 |
| 预览条分隔线 | `var(--color-border-light)` | `var(--color-border)` |
| 预览条悬浮背景 | `var(--color-primary-bg)` | 自动通过变量切换 |
| 编辑按钮边框 | `var(--color-border)` | 自动通过变量切换 |
| 编辑按钮悬浮边框 | `var(--color-primary-light)` | `var(--color-primary-dark)` |
| 编辑按钮悬浮文字 | `var(--color-primary)` | `var(--color-primary-dark)` |
| 拖拽指示条 | `var(--color-border)` | `var(--color-border-dark, #444)` |
| 字数统计颜色 | `var(--color-text-muted)` | 自动通过变量切换 |

> **说明：** 大部分元素已通过 CSS 变量自动适配暗色模式。只需在 `body.dark` 选择器中覆写需要特殊处理的规则即可。

---

## 8. 验收清单

### 视觉验收

- [ ] 桌面端弹窗居中，max-width 420px，圆角 `--radius-md (12px)`
- [ ] 移动端弹窗底部全宽，圆角 `--radius-lg (16px) 16px 0 0`，带拖拽指示条
- [ ] 三个按钮（关闭/取消/保存）均遵循项目按钮规范
- [ ] 字数统计（n/500），接近上限时黄色提醒，超出时红色警告
- [ ] 备注预览 2 行截断 + 省略号，分隔线 `--color-border-light`
- [ ] 编辑图标按钮圆形（50%），有备注时右上角主色小圆点指示器
- [ ] 所有 hover/focus/active/disabled/empty 状态均有定义
- [ ] 暗色模式下所有视觉元素均适配

### 响应式验收

- [ ] >768px：居中弹窗
- [ ] ≤768px：全屏底部滑入弹窗
- [ ] ≤480px：弹窗高度放宽到 90vh，textarea 最小高度 120px
- [ ] 移动端 textarea 使用 16px 防止 iOS 自动缩放
- [ ] 移动端 `:active` 替代 `:hover` 交互

### 可访问性验收

- [ ] 弹窗打开时聚焦到 textarea
- [ ] 弹窗关闭后焦点回到触发按钮
- [ ] 遮罩点击关闭弹窗
- [ ] Escape 键关闭弹窗
- [ ] 按钮色彩对比度满足 WCAG AA
- [ ] textarea 使用原生 placeholder

---

## 附录：完整示例 — React 组件 CSS Module scss 文件骨架

```scss
// FavoriteNoteModal.module.scss
.favorite-note-overlay { /* 见上文 */ }
.favorite-note-modal { /* 见上文 */ }
// ... 全部 CSS 规则
```

```scss
// NotePreview.module.scss
.note-preview { /* 见上文 */ }
.note-preview__text { /* 见上文 */ }
```

```scss
// NoteButton.module.scss
.note-button { /* 见上文 */ }
.note-button--empty { /* 见上文 */ }
.note-button--has-note { /* 见上文 */ }
```

> 上述 CSS 规则可直接按 `*.module.scss` 格式插入对应组件目录。变量名直接引用 CSS 变量（`var(--color-xxx)`）以保持与设计系统的一致性。

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-30 | 初版：三个组件完整样式方案 |