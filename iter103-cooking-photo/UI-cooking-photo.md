# UI 设计规范 — 烹饪日志照片上传增强 (iter103-cooking-photo)

> **范围**：`frontend/src/pages/CookingJournalPage.tsx` 的弹窗表单 + 列表卡片 + ImageLightbox 集成
> **版本**：v1 · 2026-06-08
> **设计语言**：延续项目现有 `CommentImagePicker` 的 80×80 缩略图 + 虚线 dropzone 范式，统一暖橙主色 (`--color-primary: #e8663e`) 与米白底色

---

## 0. 关键发现 & 决策点

| 议题 | 现状 | 决策 |
|------|------|------|
| `CookingLog.photoUrl` 类型 | 后端是 **单数** `string \| null` | **前端将 `photoUrls: string[]` 视为新规范**，提交时用 `JSON.stringify(photoUrls)` 写入 `photoUrl` 字段（兼容旧后端），后续后端迁移为 `photoUrls: string[]` 时只改 API 不改 UI |
| `ImageLightbox` 实际 API | `images: { src: string; alt?: string }[]` + `initialIndex: number` + `onClose`（测试文件证实） | 设计规范以 **实际代码为准**，任务说明中的 `images: string[]` + `currentIndex` 写法会在编译期报错 |
| 现有 dropzone 模式 | `CommentImagePicker` 已实现 80×80 dashed-border dropzone + `uploadCommentImages` API | **直接复用其视觉与上传逻辑**，新增 `PhotoPicker` 组件 (or inline) 避免在 CookingJournalPage 内重复实现 |
| 暗色模式 | 项目同时使用 `[data-theme='dark']` 与 `body.dark` 两种 selector | 沿用 `body.dark`（与 CommentImagePicker 一致） |

---

## 1. 照片上传区域 (Dropzone + 预览区)

### 1.1 位置
在弹窗表单的 **"笔记" textarea 下方**、**"记录" 提交按钮上方** 之间插入 `<PhotoPicker />`（命名 BEM：`cooking-journal__photo-picker`）。

### 1.2 布局结构

```
┌─────────────────────────────────────────────────────┐
│ 笔记                                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ textarea ...                                      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ 照片  (📸)                                  0 / 3    │  ← 标签 + 计数
│ ┌─────────────────────────────────────────────────┐ │
│ │ [thumb1] [thumb2] [thumb3]                       │ │  ← 预览区（已上传）
│ │  ×      ×      ×                                  │ │
│ │   ↑ 悬停显示删除按钮                               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │  ← Dropzone（未达上限时显示）
│ │                                                       │ │
│ │        📸 拖拽照片到此处或点击上传                   │ │
│ │        jpg / png / webp · 单张 ≤ 5MB                 │ │
│ │                                                       │ │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                                      │
│ [ 进度条 45% ]   hero-01.jpg                          │  ← 上传中（可多文件并发）
│                                                      │
│ [    📝 记录    ]                                    │
└─────────────────────────────────────────────────────┘
```

### 1.3 行为规则

| 状态 | 行为 |
|------|------|
| 初始 / 未达 3 张 | 显示 dropzone + 已上传缩略图 |
| 上传中 | dropzone 仍可点击；缩略图位上方出现 **进度卡片**（独立于缩略图区） |
| 已达 3 张 | **整个 dropzone 隐藏**（高度 0，无残留） |
| 拖拽进入 dropzone | dropzone 边框变为 `--color-primary`，背景变为 `--color-primary-bg` (浅橙) |
| 拖拽离开 / 释放失败 | 恢复虚线 `var(--color-border)` |

### 1.4 校验规则

| 规则 | 处理 |
|------|------|
| 单张 > 5 MB | Toast 报错「图片不能超过 5MB」，拒绝 |
| 格式 ≠ jpg/png/webp | Toast 报错「仅支持 jpg/png/webp 格式」，拒绝 |
| 同时选 5 张（超限） | **只取前 3 张入队**，第 4/5 张以 Toast 提示「最多上传 3 张」 |
| 上传失败（HTTP 4xx/5xx） | 缩略图位变成红色边框 + 错误图标，可点击重试 |

### 1.5 CSS 规范 — Dropzone

```css
/* ── cooking-journal__photo-picker ── */
.cooking-journal__photo-picker {
  margin-bottom: 1rem;
}

.cooking-journal__photo-picker__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.35rem;
}

.cooking-journal__photo-picker__count {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.cooking-journal__photo-picker__previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.cooking-journal__photo-picker__dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md, 10px);
  padding: 1.25rem 1rem;
  text-align: center;
  cursor: pointer;
  background: transparent;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, background 0.2s;
}
.cooking-journal__photo-picker__dropzone:hover,
.cooking-journal__photo-picker__dropzone--dragging {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}
.cooking-journal__photo-picker__dropzone-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}
.cooking-journal__photo-picker__dropzone-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  display: block;
}
.cooking-journal__photo-picker__dropzone-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: block;
  margin-top: 0.25rem;
}
.cooking-journal__photo-picker__input {
  display: none; /* hidden file input */
}
```

### 1.6 CSS 规范 — 单张缩略图卡片

```css
.cooking-journal__photo-picker__thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.cooking-journal__photo-picker__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cooking-journal__photo-picker__thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;                   /* 默认隐藏 */
  transition: opacity 0.15s, background 0.15s;
}
.cooking-journal__photo-picker__thumb:hover .cooking-journal__photo-picker__thumb-remove {
  opacity: 1;                   /* 悬停时显示 */
}
.cooking-journal__photo-picker__thumb-remove:hover {
  background: var(--color-error);
}

/* 移动端：删除按钮常显 */
@media (hover: none) {
  .cooking-journal__photo-picker__thumb-remove { opacity: 1; }
}

/* 上传中进度遮罩 */
.cooking-journal__photo-picker__progress {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
}
```

### 1.7 上传进度卡片（独立于缩略图区）

```css
.cooking-journal__photo-picker__progress-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.cooking-journal__photo-picker__progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.cooking-journal__photo-picker__progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}
.cooking-journal__photo-picker__progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s;
}
```

### 1.8 状态机（推荐用 useReducer）

```
idle ──select/drop──> validating ──ok──> uploading ──ok──> success
                       │                                     │
                       └──fail──> error(reject+toast)        └─> idle (refresh thumbs)
                                          ↑
                       retry ──────────────┘
```

---

## 2. 缩略图展示样式（日志列表卡片）

### 2.1 位置
在 `cooking-journal__card-main` 的 **info 区域内、notes 下方** 插入（**不用** 卡片右上角 —— 避免与 action 按钮（✏️ 🗑️）视觉打架）。

```
┌──────────────────────────────────────────────────┐
│  ⭐⭐⭐⭐⭐ 红烧肉                       ✏️  🗑️   │
│  📅 2026-06-08  ⏱️ 45 分钟  [家常菜]              │
│  这次糖放多了，下次减半...                        │
│                                                    │
│  ┌──┐ ┌──┐ ┌──┐                                   │
│  │📷│ │📷│ │+2│  ← 80×80 缩略图（>3 张时 +N 徽章）│
│  └──┘ └──┘ └──┘                                   │
└──────────────────────────────────────────────────┘
```

### 2.2 CSS 规范

```css
.cooking-journal__card-photos {
  display: flex;
  gap: 6px;
  margin-top: 0.5rem;
}

.cooking-journal__card-photo {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: pointer;
  background: var(--color-bg-secondary);
  flex-shrink: 0;
  transition: transform 0.15s, box-shadow 0.15s;
}
.cooking-journal__card-photo:hover {
  transform: scale(1.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.cooking-journal__card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* "+N" 徽章（叠在第 3 张缩略图上） */
.cooking-journal__card-photo--more {
  position: relative;
}
.cooking-journal__card-photo--more::after {
  content: attr(data-more);   /* "data-more='+5'" */
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
}

/* 响应式：极窄屏 768px 以下缩到 64×64 */
@media (max-width: 480px) {
  .cooking-journal__card-photo,
  .cooking-journal__card-photos {
    width: 64px;
    height: 64px;
  }
}
```

### 2.3 缩略图渲染规则

```ts
const MAX_VISIBLE = 3
const visiblePhotos = log.photoUrls?.slice(0, MAX_VISIBLE) ?? []
const remaining = (log.photoUrls?.length ?? 0) - MAX_VISIBLE
// visiblePhotos.map((url, i) => {
//   const isLast = i === MAX_VISIBLE - 1 && remaining > 0
//   return <div className={isLast ? '... --more' : '...'} data-more={`+${remaining}`} />
// })
```

---

## 3. ImageLightbox 集成

### 3.1 实际 API（来自 `frontend/src/components/ImageLightbox.tsx` + `tests/ImageLightbox.test.tsx`）

```ts
interface Props {
  images: Array<{ src: string; alt?: string }>
  initialIndex: number
  onClose: () => void
  // onPrev / onNext 由组件内置处理（wrap-around）
}
```

> 任务描述里写的 `images: string[]` + `currentIndex` + `onClose + onPrev + onNext` 与代码不符；以 **测试文件** 为准。

### 3.2 集成方式

在 `CookingJournalPage` 顶层添加 lightbox state：

```tsx
const [lightbox, setLightbox] = useState<{
  photos: string[]
  index: number
} | null>(null)

const openLightbox = (log: CookingLog, index: number) => {
  setLightbox({
    photos: log.photoUrls ?? [],
    index,
  })
}

const closeLightbox = () => setLightbox(null)

// 在列表卡片缩略图 onClick：
onClick={() => openLightbox(log, 0)}

// JSX 末尾：
{lightbox && (
  <ImageLightbox
    images={lightbox.photos.map(url => ({ src: url, alt: `${log.recipeTitle} 烹饪照片` }))}
    initialIndex={lightbox.index}
    onClose={closeLightbox}
  />
)}
```

### 3.3 交互

| 行为 | 来源 |
|------|------|
| 左右切换（点击按钮 / 键盘 ← →） | ImageLightbox 内置（已实现） |
| 键盘 ESC 关闭 | ImageLightbox 内置（已实现） |
| 点击背景关闭 | ImageLightbox 内置（已实现） |
| 显示 `1 / 3` 计数 | ImageLightbox 内置（>1 张时） |
| 打开时 `body.overflow = 'hidden'` 锁滚动 | ImageLightbox 内置（已实现） |

> 不需要重新实现导航；只需要把 `photoUrls` 喂给 `images` 即可。

---

## 4. 暗色模式适配

### 4.1 策略
沿用项目惯例，**新增** 暗色覆写使用 `body.dark` selector（与 `CommentImagePicker` 一致），同时兼容 `[data-theme='dark']`（全局兜底在 `global.css` 已处理）。

### 4.2 暗色 CSS 增量

```css
/* ── CookingJournal 暗色覆写：照片相关 ── */
body.dark .cooking-journal__photo-picker__dropzone {
  border-color: var(--color-border);
  background: transparent;
}
body.dark .cooking-journal__photo-picker__dropzone:hover,
body.dark .cooking-journal__photo-picker__dropzone--dragging {
  border-color: var(--color-primary);
  background: rgba(232, 102, 62, 0.08);   /* --color-primary 8% 透明 */
}
body.dark .cooking-journal__photo-picker__dropzone-text {
  color: var(--color-text-secondary);
}
body.dark .cooking-journal__photo-picker__dropzone-hint {
  color: var(--color-text-muted);
}
body.dark .cooking-journal__photo-picker__thumb {
  border-color: var(--color-border);
  background: var(--color-bg-secondary);
}
body.dark .cooking-journal__photo-picker__thumb-remove {
  background: rgba(0, 0, 0, 0.65);
}
body.dark .cooking-journal__photo-picker__thumb-remove:hover {
  background: var(--color-error);
}
body.dark .cooking-journal__photo-picker__progress-bar {
  background: var(--color-border);
}
body.dark .cooking-journal__card-photo {
  border-color: var(--color-border);
  background: var(--color-bg-secondary);
}
body.dark .cooking-journal__card-photo:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
```

### 4.3 暗色模式一致性检查

| 元素 | 亮色 | 暗色 |
|------|------|------|
| Dropzone 边框 | `--color-border` (#e8e0d8) | `--color-border` (#2e2e48) |
| Dropzone hover 背景 | `--color-primary-bg` (#fff3ed) | `rgba(232,102,62,0.08)` |
| 缩略图边框 | `--color-border` | `--color-border` |
| 缩略图占位背景 | `--color-bg-secondary` (#f8f8f8) | `--color-bg-secondary` (#1a1a2e) |
| 进度条底色 | `--color-bg-secondary` | `--color-border` |
| 删除按钮 (×) | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.65)`（提升对比） |
| 错误 hover | `--color-error` (#ff4d4f) | 同左 |

---

## 5. CSS 变量使用规范

### 5.1 必用变量（来自 `global.css` :root）

| 用途 | 变量 | 值 |
|------|------|------|
| 主色（dropzone hover / 删除错误 / 进度条） | `--color-primary` | `#e8663e` |
| 主色浅底（dropzone hover 背景） | `--color-primary-bg` | `#fff3ed` |
| 卡片 / 弹窗背景 | `--color-bg` / `--color-card` | `#fdf8f4` / `#ffffff` |
| 次要背景（缩略图占位） | `--color-bg-secondary` | `#f8f8f8` |
| 正文 | `--color-text` | `#2d2d2d` |
| 次要文字 | `--color-text-secondary` | `#666666` |
| 弱化文字（hint / 计数） | `--color-text-muted` | `#999999` |
| 边框 | `--color-border` | `#e8e0d8` |
| 输入框背景 | `--color-input-bg` | `#ffffff` |
| 输入框边框 | `--color-input-border` | `#d0c8c0` |
| 成功 / 警告 / 错误 | `--color-success` / `--color-warning` / `--color-error` | `#52c41a` / `#faad14` / `#ff4d4f` |
| 圆角 | `--radius-sm` / `--radius-md` / `--radius-lg` | `6px` / `10px` / `14px` |

### 5.2 暗色变量（来自 `global.css` `[data-theme='dark']`）

```
--color-bg: #12121e
--color-card: #1e1e32
--color-text: #e0e0ee
--color-text-secondary: #9898b0
--color-text-muted: #686880
--color-border: #2e2e48
--color-input-bg: #282840
--color-bg-secondary: #1a1a2e
--color-primary-bg: #2e1a14
```

### 5.3 硬性规则
- ❌ **禁止** 在新写的 CSS 里使用裸 hex（如 `#e0e0e0`、`#333`）
- ❌ **禁止** 用 `box-shadow` 里的硬色（如 `rgba(0,0,0,0.4)`）—— 亮色/暗色需要不同阴影
- ✅ 所有颜色与圆角一律走 CSS 变量
- ✅ 与现有 `cooking-journal__*` 命名保持 BEM 一致（`__` 段、`--` 修饰符）

### 5.4 复用现成模式
| 现有模块 | 可复用点 |
|----------|---------|
| `CommentImagePicker` | 80×80 缩略图 + 虚线 dropzone + 删除按钮 样式 token |
| `cooking-journal__card` | 卡片布局、hover 阴影、action 按钮 |
| `cooking-journal__modal` | 弹窗 padding、滚动条暗色 |
| `body.dark` 模式 | 全部暗色覆写入口 |

---

## 6. 验收清单

- [ ] Dropzone 仅未达 3 张时显示，达上限后整段 `display: none`（不留空隙）
- [ ] 拖拽中边框变 `--color-primary`，背景变 `--color-primary-bg`
- [ ] 上传中显示 4px 进度条，独立于缩略图区
- [ ] 单张 > 5MB 或非 jpg/png/webp 触发 Toast 报错
- [ ] 缩略图鼠标悬停时显示 × 删除按钮（移动端常显）
- [ ] 列表卡片最多展示 3 张缩略图，超出时第 3 张叠加 `+N` 徽章
- [ ] 点击任意缩略图打开 ImageLightbox，传入该日志全部照片
- [ ] ImageLightbox 键盘 ESC 关闭、← → 切换
- [ ] 暗色模式下 dropzone / 缩略图 / 进度条 颜色与亮色一致对比度
- [ ] 所有颜色与圆角走 CSS 变量，无硬编码

---

## 7. 实现文件清单（建议）

| 文件 | 变更 |
|------|------|
| `frontend/src/components/CookingJournalPhotoPicker.tsx` (新) | Dropzone + 缩略图 + 上传状态机 |
| `frontend/src/components/CookingJournalPhotoPicker.css` (新) | 上述 CSS 规范 |
| `frontend/src/pages/CookingJournalPage.tsx` | 弹窗内插入 `<CookingJournalPhotoPicker />`、state 管理、列表卡片渲染缩略图、点击调起 ImageLightbox |
| `frontend/src/pages/CookingJournalPage.css` | 追加 `cooking-journal__card-photos*` 样式 + 暗色覆写 |
| `frontend/src/components/CookingJournalPhotoPicker.test.tsx` (新) | 单元测试：上限、上传失败、删除、format 校验 |

---

## 8. 参考 & 复用

- `frontend/src/components/CommentImagePicker.tsx` / `.css` — 80×80 dropzone 原型
- `frontend/src/components/ImageLightbox.tsx` / `.css` — 全屏查看器
- `frontend/src/global.css` — 设计 token 源头
- `frontend/src/api.ts:1139` — `CookingLog.photoUrl` 当前类型 (需扩展为数组)
- `frontend/src/api.ts:2345` — `uploadCommentImages(files)` — 通用图片上传，可直接复用
