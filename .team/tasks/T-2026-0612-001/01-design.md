# Design — T-2026-0612-001

> 图片懒加载 + RecipeCard 卡片骨架屏 shimmer 动画打磨
> TaskID: T-2026-0612-001
> Author: architect · 2026-06-12
> Story: `00-story.md`（140 行，8 条 AC + 5 条风险）
> Stack: JavaScript / TypeScript · React 18 · Vite SPA · `food-website/frontend`
> Deploy: 静态构建产物经 nginx 提供，docker 容器名为 `food-website-frontend`

---

## 0. TL;DR

1. 给 5 个 `<img>` 加 `loading="lazy"`（CookingJournalPhotoPicker × 2 / PersonalizedDailyPick × 2 / CollectionComments × 1），全部保留 `alt` / `className` / `onError`。
2. 给 3 个**白名单** `<img>` 显式标注 `loading="eager"`（或保持默认）并加 `// 显式 eager：…` 注释（QuickPreviewModal / ImageLightbox / HeroSection）。
3. `RecipeCardSkeleton.css` 追加 `@keyframes shimmer`（复用 `FeaturedSection.css:86-92` 颜色字面值，**不动** `--color-*` token）；`Skeleton.tsx` 不动组件契约，保持现有 `.skeleton` 自动联动 `Skeleton.css:14` 的 `skeleton-shimmer` 动画，并通过新加 `.rcs-cover` / `.rcs-body *` 选择器级联 `Skeleton.css` 的暗色变量；同时**新增** `prefers-reduced-motion` 兜底。
4. 不动 `ImagePlaceholder.tsx`（已 lazy） / `RecipeCard.tsx` / 后端 / API / `srcset` / 响应式图片 / SEO 抓取 / SSR（纯 CSR 项目不涉及）。
5. `overall` 评审门 1：执行"前端 build → docker cp → nginx reload，不重启容器"流程。
6. 风险：模态空白闪烁（R-1）、Lightbox 切下一张空白（R-2）、HeroSection 是否在视口（R-5）—— 全部在第 6 章用代码层对策覆盖。

---

## 1. 技术方案总览

> **In Scope**：1 个 React 组件（`<Skeleton>`）、3 个 CSS 文件、5 处 `<img>` 加 lazy、3 处 `<img>` 加 eager 注释。
> **Out of Scope**：`RecipeCard` / `ImagePlaceholder` / `RatingTopList` / `RatingHistoryList` / `RecipeCard.tsx` / 后端 / API / `srcset` / SEO / `prefers-reduced-motion` 之外的可访问性 / i18n。

| # | 文件 | 行号 | 改动类型 | 风险等级 | 备选方案（被否决） |
|---|------|------|----------|----------|---------------------|
| 1 | `frontend/src/components/CookingJournalPhotoPicker.tsx` | 153 | 加 `loading="lazy"`（缩略图列表） | 低 | A. 用 `IntersectionObserver` 包一层（过度工程） B. 不改（违反 AC-1） |
| 2 | `frontend/src/components/CookingJournalPhotoPicker.tsx` | 172 | 加 `loading="lazy"`（blob URL 上传中预览，注释说明） | 低 | A. 删 lazy（blob URL 也不抢带宽但会触发 IntersectionObserver 调度，保留 lazy 行为一致） |
| 3 | `frontend/src/components/PersonalizedDailyPick.tsx` | 70 | 加 `loading="lazy"`（每日推荐封面） | 低 | — |
| 4 | `frontend/src/components/PersonalizedDailyPick.tsx` | 228 | 加 `loading="lazy"`（个性化推荐卡片封面） | 低 | — |
| 5 | `frontend/src/components/CollectionComments.tsx` | 127 | 加 `loading="lazy"`（评论者头像） | 低 | A. 改成 `decoding="async"`（与 lazy 不互斥，但 lazy 已经是浏览器默认且收益更大） |
| 6 | `frontend/src/components/recipe/QuickPreviewModal.tsx` | 137 | 显式 `loading="eager"` + 注释（白名单） | **中** | A. 删属性用默认（语义不清，违反 AC-2 注释要求） B. 用 `fetchpriority="high"` 叠加（与 eager 等价但增加新键值，不在 Story 范围） |
| 7 | `frontend/src/components/ImageLightbox.tsx` | 41 | 显式 `loading="eager"` + 注释（白名单） | **中** | 同上 |
| 8 | `frontend/src/components/HeroSection.tsx` | 133 | 当前已用三元 `loading={idx === 0 ? 'eager' : 'lazy'}`，**不动**；在 `:80-93` `useEffect` 注释旁追加 `// R-5：首张 eager=LCP，其余 lazy=节省带宽` 注释 | 低 | A. 全 eager（违反 AC-1） B. 全 lazy（违反 LCP 优化） |
| 9 | `frontend/src/components/RecipeCardSkeleton.css` | 末尾 | 追加 `@keyframes shimmer` + 暗色覆盖 + `prefers-reduced-motion` 关闭 | 低 | A. 改 `--color-*` token（违反 AC-Out-of-Scope #3） B. 复制 `Skeleton.css` 已有 `skeleton-shimmer`（重名冲突） |
| 10 | `frontend/src/components/Skeleton.tsx` | 全文 | **不**新增 `animated` prop（见 §4 论证） | — | A. 加 `animated` prop 默认 true（破坏 API、Story AC-6 允许但不必要） |
| 11 | `frontend/src/components/ImagePlaceholder.tsx` | 74 | **不动**（已有 `loading="lazy"`，勘误于 AC-4） | — | — |
| 12 | `frontend/src/components/RecipeCard.tsx` | 280-285 | **不动**（走 ImagePlaceholder 间接 lazy，AC-5） | — | — |

---

## 2. 详细改动计划（git diff 草稿）

### 2.1 CookingJournalPhotoPicker.tsx

**文件**：`frontend/src/components/CookingJournalPhotoPicker.tsx`

**Before**（L150-158，缩略图列表渲染）：
```tsx
        {photoUrls.map((url, i) => (
          <div key={url} className="cooking-journal-photo-picker__item">
            <img
              src={url}
              alt={`照片 ${i + 1}`}
              className="cooking-journal-photo-picker__thumb"
            />
```

**After**：
```tsx
        {photoUrls.map((url, i) => (
          <div key={url} className="cooking-journal-photo-picker__item">
            <img
              src={url}
              alt={`照片 ${i + 1}`}
              className="cooking-journal-photo-picker__thumb"
              loading="lazy"
            />
```

**Before**（L170-176，blob URL 上传中预览）：
```tsx
        {uploading.map(item => (
          <div key={item.id} className="cooking-journal-photo-picker__item cooking-journal-photo-picker__item--uploading">
            <img
              src={item.preview}
              alt="上传中"
              className="cooking-journal-photo-picker__thumb"
            />
```

**After**：
```tsx
        {uploading.map(item => (
          <div key={item.id} className="cooking-journal-photo-picker__item cooking-journal-photo-picker__item--uploading">
            {/* R-4：blob URL (URL.createObjectURL) 不消耗网络带宽，但保留 lazy 行为一致 */}
            <img
              src={item.preview}
              alt="上传中"
              className="cooking-journal-photo-picker__thumb"
              loading="lazy"
            />
```

---

### 2.2 PersonalizedDailyPick.tsx

**文件**：`frontend/src/components/PersonalizedDailyPick.tsx`

**Before**（L68-73，每日推荐封面）：
```tsx
        <div className="daily-pick-card__image-wrap">
          <img
            src={recipe.coverImage || ''}
            alt={recipe.title}
            className="daily-pick-card__image"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
```

**After**：
```tsx
        <div className="daily-pick-card__image-wrap">
          <img
            src={recipe.coverImage || ''}
            alt={recipe.title}
            className="daily-pick-card__image"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
```

**Before**（L226-232，个性化推荐卡片封面）：
```tsx
        <img
          src={recipe.coverImage || ''}
          alt={recipe.title}
          className="personalized-pick__card-img"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
```

**After**：
```tsx
        <img
          src={recipe.coverImage || ''}
          alt={recipe.title}
          className="personalized-pick__card-img"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
```

---

### 2.3 CollectionComments.tsx

**文件**：`frontend/src/components/CollectionComments.tsx`

**Before**（L126-128，评论者头像）：
```tsx
              {comment.user?.avatar ? (
                <img src={comment.user.avatar} alt={comment.user.nickname || ''} />
              ) : (
```

**After**：
```tsx
              {comment.user?.avatar ? (
                <img
                  src={comment.user.avatar}
                  alt={comment.user.nickname || ''}
                  loading="lazy"
                />
              ) : (
```

> **格式注**：原行为单行 JSX，本次扩展为多行以容纳 `loading="lazy"` 键值，不影响渲染结果（JSX 多行展开与单行等价）。

---

### 2.4 QuickPreviewModal.tsx（白名单 + 注释）

**文件**：`frontend/src/components/recipe/QuickPreviewModal.tsx`

**Before**（L136-138）：
```tsx
          {recipe.coverImage ? (
            <img src={recipe.coverImage} alt={recipe.title} className="preview-modal__cover-img" />
          ) : (
```

**After**：
```tsx
          {recipe.coverImage ? (
            // 显式 eager：模态打开时用户已经看到这张封面，lazy 会导致开模态瞬间白底（R-1）
            <img
              src={recipe.coverImage}
              alt={recipe.title}
              className="preview-modal__cover-img"
              loading="eager"
            />
          ) : (
```

---

### 2.5 ImageLightbox.tsx（白名单 + 注释）

**文件**：`frontend/src/components/ImageLightbox.tsx`

**Before**（L40-44）：
```tsx
      <img
        className="image-lightbox__img"
        src={images[currentIndex]}
        alt="预览大图"
        onClick={e => e.stopPropagation()}
      />
```

**After**：
```tsx
      {/* 显式 eager：Lightbox 已打开，currentIndex 已经是用户正在看的图，lazy 会导致翻页/打开瞬间空白（R-2） */}
      <img
        className="image-lightbox__img"
        src={images[currentIndex]}
        alt="预览大图"
        loading="eager"
        onClick={e => e.stopPropagation()}
      />
```

---

### 2.6 HeroSection.tsx（白名单 + 注释，**不改 img 属性**）

**文件**：`frontend/src/components/HeroSection.tsx`

**Before**（L83-94）：
```tsx
  // Preload first image with high priority; rest lazy via <img loading="lazy">
  useEffect(() => {
    if (items.length === 0) return
    const firstImg = new Image()
    ;(firstImg as any).fetchPriority = 'high'
    firstImg.onload = () => setImagesLoaded(true)
    firstImg.onerror = () => setImagesLoaded(true)
    firstImg.src = getProxiedImageUrl(items[0].image) || items[0].image
    // 其余图片靠 <img loading="lazy"> 处理，不再循环预加载
  }, [items])
```

**After**（**仅**追加 R-5 注释）：
```tsx
  // Preload first image with high priority; rest lazy via <img loading="lazy">
  // R-5：首张 eager + fetchPriority=high 是 LCP 元素候选；其余 lazy 节省首屏外带宽
  useEffect(() => {
    if (items.length === 0) return
    const firstImg = new Image()
    ;(firstImg as any).fetchPriority = 'high'
    firstImg.onload = () => setImagesLoaded(true)
    firstImg.onerror = () => setImagesLoaded(true)
    firstImg.src = getProxiedImageUrl(items[0].image) || items[0].image
    // 其余图片靠 <img loading="lazy"> 处理，不再循环预加载
  }, [items])
```

> 关键约束：`HeroSection.tsx:135` 的 `loading={idx === 0 ? 'eager' : 'lazy'}` 已正确分流（首张 eager=LCP 优化，其余 lazy=符合 AC-1），**不动 JSX**。L133 img 上有 `loading` / `fetchpriority` / `decoding` 三件套齐全，**已满足白名单要求**，本次仅在 useEffect 处补一行 R-5 业务注释即可。

---

### 2.7 RecipeCardSkeleton.css（追加 shimmer 动画）

**文件**：`frontend/src/components/RecipeCardSkeleton.css`

**Before**（24 行末尾）：
```css
/* ── 暗色模式 ── */

body.dark .recipe-card-skeleton {
  background: var(--color-card, #1e1e32);
}
```

**After**（在文件末尾追加，原 24 行不动）：
```css
/* ── 暗色模式 ── */

body.dark .recipe-card-skeleton {
  background: var(--color-card, #1e1e32);
}

/* ── Shimmer 动画（参考 FeaturedSection.css:77-92，颜色用字面值，不动 token） ── */

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.rcs-cover,
.rcs-body > * {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

body.dark .rcs-cover,
body.dark .rcs-body > * {
  background: linear-gradient(90deg, #333 25%, #444 50%, #333 75%);
  background-size: 200% 100%;
}

/* ── 可访问性：尊重用户的「减少动态效果」偏好 ── */

@media (prefers-reduced-motion: reduce) {
  .rcs-cover,
  .rcs-body > * {
    animation: none;
    background-size: 100% 100%;
  }
}
```

> **为什么是字面值颜色 `#eee / #f5f5f5 / #333 / #444`？** Story AC-Out-of-Scope #3 明确禁止改 `--color-*` token，且 `FeaturedSection.css:77-92` 正是采用这套字面值。`Skeleton.css` 用的 `--color-skeleton-from/to` token 属于"已存在的另一套动画体系"，本次**不引用**以避免把两个动画系统耦死。

> **为什么 `.rcs-body > *` 而不是 `.rcs-body .skeleton`？** RecipeCardSkeleton 的 `rcs-body` 内有 3 个 `<Skeleton>`，它们在 `Skeleton.tsx:24` 输出 `<div class="skeleton rcs-body">…`（实际 className 由 props 传），覆盖 `.rcs-body > *` 能命中所有直接子元素（含 `.skeleton`），且避免与 Skeleton.css 自带动画叠加。

> **会不会和 Skeleton.css 已有 `.skeleton` 动画叠加？** 会。但 CSS `animation` 同 keyframes 重复声明时后加载者覆盖前加载者（最后 import 胜出），RecipeCardSkeleton.css 实际**先于** Skeleton.css 被 import（同目录同 bundle 顺序按 import 解析）—— 详细见 §4 论证。

---

## 3. shimmer 动画设计

### 3.1 复用策略

| 维度 | FeaturedSection.css（参考） | Skeleton.css（已存在） | RecipeCardSkeleton.css（本次新增） |
|------|---------------------------|------------------------|----------------------------------|
| keyframe 名 | `shimmer` | `skeleton-shimmer` | `shimmer`（同名 FeaturedSection） |
| 渐变颜色（亮） | `#eee → #f5f5f5 → #eee` | `var(--color-skeleton-from, #262640) → var(--color-skeleton-to, #303050)` | `#eee → #f5f5f5 → #eee` |
| 渐变颜色（暗） | `#333 → #444 → #333` | 同上 token 形式 | `#333 → #444 → #333` |
| 动画时长 | `1.5s` | `1.6s ease-in-out` | `1.5s`（与 FeaturedSection 完全一致） |
| 动画曲线 | `infinite` | `ease-in-out infinite` | `infinite` |
| 背景尺寸 | `200% 100%` | `200% 100%` | `200% 100%` |
| `prefers-reduced-motion` | 无 | 有（关闭动画） | **有**（新增） |

**结论**：本次新增的 `shimmer` keyframes 是 `FeaturedSection.css:86-92` 的"等价复刻"，与 `Skeleton.css` 体系**完全独立**。这样：
- 不会污染 `Skeleton.css` 的全局 `.skeleton` 选择器（其他用 `<Skeleton>` 的地方如 `PersonalizedDailyPick` 不受影响）
- RecipeCardSkeleton 的视觉与 `PersonalizedDailyPick.tsx:42-50` 的 `<div className="shimmer">` 一致（都基于 FeaturedSection 体系）

### 3.2 暗色模式

`body.dark .rcs-cover, body.dark .rcs-body > *` 使用 `#333 → #444 → #333`，与 `FeaturedSection.css:88-91` 完全一致。**不**引用 `var(--color-skeleton-from)`，避免与 `Skeleton.css` 的 token 体系交叉。

### 3.3 `prefers-reduced-motion` 处理

参考 `Skeleton.css:42-46` 既有做法，对 `prefers-reduced-motion: reduce` 用户：
- 关闭 `animation`
- 背景尺寸从 `200% 100%` 退回 `100% 100%`（去掉"扫描"效果，呈现静态单色渐变）

### 3.4 不动 token 的依据

Story AC-Out-of-Scope #3 显式禁止"不动 CSS 变量"。本任务所有新加 CSS 颜色用 `#eee / #f5f5f5 / #333 / #444` 字面值，**不**新增 `--shimmer-*` token、**不**改 `--color-skeleton-*`。

---

## 4. Skeleton 组件改造

### 4.1 结论：**不**新增 `animated` prop，不改 `type` union

**问题**：Story AC-6 写到「新增 `animated` prop」或「默认带 `shimmer` className」，存在歧义。

**论证**：
1. `Skeleton.tsx:24` 已经固定输出 `<div className={\`skeleton ${className}\`}>`，className `skeleton` 恒在；
2. `Skeleton.css:2-7` 已有 `.skeleton` 的 `animation: skeleton-shimmer 1.6s ease-in-out infinite` —— **全局生效**，**所有** `<Skeleton>` 实例**已经**在动；
3. `RecipeCardSkeleton.tsx:7` 用 `<Skeleton className="rcs-cover" />` —— 渲染结果是 `<div class="skeleton rcs-cover">`，**已经**继承 `.skeleton` 的 shimmer；
4. **但是**：在 RecipeCardSkeleton 的语境下，**我希望动画时长是 1.5s（与 FeaturedSection 体系一致）**，而不是 1.6s（Skeleton 体系）；
5. **解决**：不通过 `animated` prop 控制，而是在 `RecipeCardSkeleton.css` 中用更高优先级的 `.rcs-cover, .rcs-body > *` 选择器**覆盖** `.skeleton` 的 `animation-duration` —— 而这正是 §2.7 `animation: shimmer 1.5s infinite` 的实际作用（同名 `animation` 简写会**整体替换**而非合并：CSS `animation: shimmer 1.5s infinite` 完整重写，丢掉原 `1.6s ease-in-out`）；
6. 因此**不**需要给 `Skeleton.tsx` 加 `animated` prop。

### 4.2 `type` union 是否要改？

`Skeleton.tsx` 当前 props（行 6-12）：
```ts
interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: string | number
  circle?: boolean
  className?: string
}
```

`type` union 不存在（用的具名 props）。**不动**。

### 4.3 是否有 Story 范围外的副作用？

`PersonalizedDailyPick.tsx:208-218` 的 `daily-pick-skeleton` 也用 `<div className="shimmer">`（FeaturedSection 体系），**不**走 `<Skeleton>` —— 不受影响。
其他使用 `<Skeleton>` 的地方（git grep 可查）继续走 `Skeleton.css` 的 1.6s `skeleton-shimmer` 动画 —— **不受影响**。

### 4.4 验证手段

```bash
# impl 阶段验证 RecipeCardSkeleton 的 keyframe 名是 shimmer
grep -n "shimmer" RecipeCardSkeleton.css
# 期望输出：≥3 行（keyframe + 2 个选择器 + prefers-reduced-motion 覆盖）
```

---

## 5. 白名单与注释模板

### 5.1 通用注释模板（适用 3 处）

```tsx
{/* 显式 eager：<业务原因>，lazy 会导致 <症状>（R-<N>） */}
<img
  src={…}
  alt={…}
  className={…}
  loading="eager"
  ...
/>
```

### 5.2 QuickPreviewModal.tsx:137

```tsx
{recipe.coverImage ? (
  // 显式 eager：模态打开时用户已经看到这张封面，lazy 会导致开模态瞬间白底（R-1）
  <img
    src={recipe.coverImage}
    alt={recipe.title}
    className="preview-modal__cover-img"
    loading="eager"
  />
) : (
  <div className="preview-modal__cover-placeholder">🍽️</div>
)}
```

### 5.3 ImageLightbox.tsx:41

```tsx
{/* 显式 eager：Lightbox 已打开，currentIndex 已经是用户正在看的图，lazy 会导致翻页/打开瞬间空白（R-2） */}
<img
  className="image-lightbox__img"
  src={images[currentIndex]}
  alt="预览大图"
  loading="eager"
  onClick={e => e.stopPropagation()}
/>
```

### 5.4 HeroSection.tsx:80-94

**L80 `useEffect` 注释**追加 R-5 引用（**不动** `L133` 的 `loading={idx === 0 ? 'eager' : 'lazy'}` 三元）：

```tsx
  // Preload first image with high priority; rest lazy via <img loading="lazy">
  // R-5：首张 eager + fetchPriority=high 是 LCP 元素候选；其余 lazy 节省首屏外带宽
  useEffect(() => {
    if (items.length === 0) return
    const firstImg = new Image()
    ;(firstImg as any).fetchPriority = 'high'
    firstImg.onload = () => setImagesLoaded(true)
    firstImg.onerror = () => setImagesLoaded(true)
    firstImg.src = getProxiedImageUrl(items[0].image) || items[0].image
    // 其余图片靠 <img loading="lazy"> 处理，不再循环预加载
  }, [items])
```

> 为什么 HeroSection 不在 `<img>` 行加注释？因为 `L133` 已经是三元表达式 `loading={idx === 0 ? 'eager' : 'lazy'}`，代码自解释。R-5 业务理由写在 `useEffect` 注释里更合适（业务原因是"首张 preload"），避免 JSX 行过度堆注释。

---

## 6. 风险与对策

### R-1：模态/全屏图 lazy 导致空白闪烁（**关键**，Story R-1）

**代码层对策**：
- QuickPreviewModal.tsx:137 显式 `loading="eager"` + 注释
- 不依赖浏览器"DOM 刚挂载即在视口"的隐式行为，避免 Chrome lazy 实现的 1 帧冷却期

**验证**：Playwright / 手动测：点击卡片 → 模态出现 → 立即截图，封面图应**已经**完成加载（Network 面板看到 status=200，img.complete=true），不应有"白底 → 大图"跳变。

### R-2：ImageLightbox 已显示图 lazy（Story R-2）

**代码层对策**：
- ImageLightbox.tsx:41 显式 `loading="eager"` + 注释
- 切下一张（`onNext` 触发 `currentIndex` 变化）的"提前加载下一张"问题**不在本任务范围**（Story Out-of-Scope 暗示，留给未来 `preload` 优化）

**验证**：手动测 Lightbox 翻页：每张图进入组件瞬间已加载（无 200ms+ 等待）。

### R-3：用户头像 lazy 可能破坏 SEO 抓取（低风险，Story R-3）

**代码层对策**：
- food-website 是纯 CSR（Vite + React，无 SSR），SEO 本来就靠 OG meta + Googlebot 渲染
- CollectionComments.tsx:127 加 `loading="lazy"` 不影响最终渲染（Chrome 41+ 支持 lazy，Googlebot 视为 eager）
- **不加** 任何额外处理

**验证**：提交后跑 `curl -A "Googlebot/2.1" <CollectionComments URL>` 验证 HTML 渲染，img 元素有 `loading="lazy"` 属性但**不影响** Googlebot 抓取。

### R-4：上传中预览 lazy 的语义（Story R-4）

**代码层对策**：
- CookingJournalPhotoPicker.tsx:172 加 `loading="lazy"` + 注释 "blob URL 不消耗网络带宽"
- 保留 lazy 行为一致性（与 153 行同源），即使收益为 0 也无副作用

**验证**：DevTools Network 面板：上传 3 张图时，blob URL 的 3 张预览图**不**出现在 Network 请求中（blob URL 走内存不消耗连接）。

### R-5：HeroSection 是否在视口（Story R-5）

**代码层对策**：
- HeroSection.tsx:133 已经有 `loading={idx === 0 ? 'eager' : 'lazy'}` + `fetchpriority={idx === 0 ? 'high' : 'auto'}` + `decoding={idx === 0 ? 'sync' : 'async'}` 三件套分流
- L80 `useEffect` 显式 `new Image()` 预加载首张（fetchPriority=high）
- 仅追加 R-5 业务注释（§2.6），**不动** JSX

**验证**：DevTools Network 面板：进首页 → 5 张 Hero 图中只有 `current=0` 那张**立即**请求（且 priority=High），其余 4 张在轮播切到时**才**请求。

---

## 7. 部署与回归

### 7.1 本地构建

```bash
cd /Users/max_yang/Projects/food-website/frontend
npm run build
# 产物：frontend/dist/
ls -la dist/assets/  # 验证 js / css 重新 hash
```

### 7.2 部署（**不重启容器**，沿用 `deploy.sh frontend`）

```bash
cd /Users/max_yang/Projects/food-website
./deploy.sh frontend
# 内部执行（参考 deploy.sh）：
#   1. SSH 到 39.103.68.205
#   2. 本地 build
#   3. docker cp dist/ food-website-frontend:/usr/share/nginx/html/
#   4. docker exec food-website-frontend nginx -s reload
#   不重启容器，nginx 进程 PID 不变，请求 0 断开
```

### 7.3 回归步骤

1. **静态扫描**（AC-1）：服务端执行
   ```bash
   ssh root@39.103.68.205 "docker exec food-website-frontend grep -rn 'loading=\"lazy\"' /usr/share/nginx/html/assets/*.js | wc -l"
   # 期望：≥10（5 处新加 + 已有的 ImagePlaceholder / HeroSection 等）
   ```
2. **白名单验证**（AC-2 / AC-8）：本地
   ```bash
   grep -B 1 -A 4 "loading=\"eager\"" frontend/src/components/recipe/QuickPreviewModal.tsx
   grep -B 1 -A 4 "loading=\"eager\"" frontend/src/components/ImageLightbox.tsx
   grep -B 1 -A 4 "loading={idx === 0 ? 'eager'" frontend/src/components/HeroSection.tsx
   # 期望：3 处都看到 "显式 eager" 注释
   ```
3. **shimmer 验证**（AC-6）：
   ```bash
   grep -n "shimmer" frontend/src/components/RecipeCardSkeleton.css
   # 期望：≥3 行（keyframes + 2 选择器 + prefers-reduced-motion）
   ```
4. **Lighthouse 跑分**（AC-7）：
   ```bash
   npx lighthouse http://39.103.68.205/ \
     --preset=perf --form-factor=mobile \
     --throttling.cpuSlowdownMultiplier=4 \
     --output=json --output-path=docs/perf/iter-136/home-mobile.json
   ```
   归档到 `docs/perf/iter-136/`。
5. **滚动测试**（AC-7）：浏览器 DevTools Network → 清缓存 → 滚到第 1 屏 → 图片请求数 = 首屏可见卡片数（≤12）

### 7.4 回滚

```bash
# 紧急：上一次成功的 build 产物在 dist.tar.gz（项目根）
cd /Users/max_yang/Projects/food-website
tar -xzf dist.tar.gz
scp -r dist/* root@39.103.68.205:/root/food-website/frontend/dist/
ssh root@39.103.68.205 "docker cp /root/food-website/frontend/dist/. food-website-frontend:/usr/share/nginx/html/ && docker exec food-website-frontend nginx -s reload"
```

回滚**不需要** git revert（前端构建产物是 immutable 的），直接换 dist 目录即可。

---

## 8. 子任务拆分（impl 阶段 fullstack 用，每条 ≤30 分钟）

| ID | 任务 | 文件 | 估时 | 验收 |
|----|------|------|------|------|
| ST-1 | 加 2 处 lazy + R-4 注释 | `CookingJournalPhotoPicker.tsx:153, 172` | 10 min | grep 确认 2 处都有 `loading="lazy"`，第 172 行注释含 "blob URL" |
| ST-2 | 加 2 处 lazy | `PersonalizedDailyPick.tsx:70, 228` | 10 min | grep 确认 2 处都有 `loading="lazy"` |
| ST-3 | 加 1 处 lazy（多行 JSX 展开） | `CollectionComments.tsx:127` | 10 min | grep 确认 1 处 `loading="lazy"`，文件可正常解析 |
| ST-4 | 加 eager + R-1 注释 | `recipe/QuickPreviewModal.tsx:137` | 10 min | grep 确认 `loading="eager"` + 注释 "R-1" |
| ST-5 | 加 eager + R-2 注释 | `ImageLightbox.tsx:41` | 10 min | grep 确认 `loading="eager"` + 注释 "R-2" |
| ST-6 | 仅追加 R-5 注释（不动 JSX） | `HeroSection.tsx:80-94` | 5 min | diff 仅 1 行注释，JSX 不变 |
| ST-7 | 追加 shimmer CSS（keyframe + 2 选择器 + 暗色 + reduced-motion） | `RecipeCardSkeleton.css` 末尾 | 15 min | grep "shimmer" ≥3 行 |
| ST-8 | **不动** `Skeleton.tsx` / `ImagePlaceholder.tsx` / `RecipeCard.tsx` | （验证不改动） | 5 min | `git diff` 这 3 个文件为空 |
| ST-9 | 本地 `npm run build` 通过 | `frontend/` | 10 min | build 无 error，dist 产物大小合理（变化 ≤10 KB） |
| ST-10 | 部署 + 静态扫描 | 服务器 | 10 min | `deploy.sh frontend` 成功，3 处 eager 注释在生产 bundle 中可见 |
| ST-11 | Lighthouse mobile 跑分 + 归档 | `docs/perf/iter-136/` | 20 min | JSON 报告归档，LCP ≤ 3.0s（与 before 对比） |
| ST-12 | 滚动测试 + 截图对比 | 浏览器 | 15 min | 滚到第 1 屏时图片请求数 ≤12，滚动到第 3 屏时 ≤ 36 |
| ST-13 | 写 `04-code-review-r1.json` 触发 Rubric B | （imp 完成后） | 10 min | JSON 落盘 |

**总估时**：~140 分钟（约 2.5 小时）；按每人 30 min slot 切分，可分 2 人并行（ST-1~3 一组、ST-4~7 一组、ST-9~13 串行）。

---

## 9. 数据契约（无新增 API/类型）

本任务**不新增**任何 zod schema / TypeScript 类型 / API endpoint / Server Action。
- 全部改动是 `<img>` 属性加键值 + CSS 追加
- `Skeleton.tsx` props 不动
- 唯一对外可见的契约变化：`RecipeCardSkeleton.css` 多了一个 `@keyframes shimmer`（CSS 动画不影响运行时类型）

**类型影响**：`frontend/src/types/` 无文件变更。

---

## 10. 时序（用户视角）

### 10.1 改进前（首屏外图片并发抢连接）

```
T0  用户打开 http://39.103.68.205/
T1  浏览器解析 HTML，触发所有 <img> 的请求
T2  t=0ms: 12 张首屏卡片图开始下载（HTTP/1.1 6 连接限制）
T3  t=200ms: 12 张图外的 30+ 张次屏/非视口图也加入竞争
T4  t=400ms: 连接队列堵塞，LCP 元素（首张图）等待
T5  t=3500ms: 首张图加载完成（受次屏图竞争影响）
T6  LCP = 3.5s
```

### 10.2 改进后（lazy + IntersectionObserver）

```
T0  用户打开 http://39.103.68.205/
T1  浏览器解析 HTML，5 处 lazy <img> 不发起请求
T2  t=0ms: 12 张首屏卡片图（无 lazy） + HeroSection[0]（eager） = 13 张图开始下载
T3  t=200ms: 首屏外 30+ 张图仍不发起请求
T4  t=300ms: 浏览器 IntersectionObserver 阈值 = 0px，提前 1.25× 视口高度预取
T5  t=2000ms: 首张图加载完成（不再受次屏竞争影响）
T6  LCP = 2.0s ↓ 1.5s
T7  用户滚动到第 2 屏：触发下一批 IntersectionObserver，新图开始请求（错峰）
```

### 10.3 关键不变量

- **首屏 12 张图 + Hero[0] = 13 张立即请求**（与 Story 3.1 节"首屏图片请求 = 12"基本一致，差异是 Hero 多 1 张在视口内，预期 13）
- **首屏外 5 处 lazy**（CookingJournalPhotoPicker × 2 / PersonalizedDailyPick × 2 / CollectionComments × 1）**不**发起
- **3 处白名单 eager**（QuickPreviewModal / ImageLightbox / HeroSection[0]）按需触发

---

## 11. 边界与错误处理

### 11.1 `src=""` 空字符串

`PersonalizedDailyPick.tsx:70 / 228` 用 `src={recipe.coverImage || ''}`，**空字符串**是合法 React 行为：浏览器不发起请求，触发 onError。**不**需要额外处理（已有 `onError` 把 img 隐藏）。

### 11.2 404 后端图

`onError` 已统一处理（`PersonalizedDailyPick` / `CookingJournalPhotoPicker` 等），**不**需要新增。

### 11.3 lazy + onError 交互

Chrome 行为：`loading="lazy"` 的 img **仍会**触发 onError（不会因为 lazy 而吞掉错误）。**不**影响错误处理。

### 11.4 模态打开瞬间的 img 未就绪（R-1 边界）

QuickPreviewModal 显式 `loading="eager"` → 浏览器**立即** fetch，与模态 mount 同帧开始（HTTP 队列里已有请求）。`createPortal` 同步挂载到 body → 用户**不会**看到白底（即使 img 还在 decode，eager 保证了 fetch 已发）。

### 11.5 Lightbox 切下一张（R-2 边界）

切下一张时 `src` 变化 → 浏览器认为是**新**资源 → 显式 `loading="eager"` 让它**立即**开始 fetch。但**新 src 加载完成前**旧图还在显示（img 元素未替换 src 前的视觉快照保留），所以用户**不会**看到"白底"，**只会**看到"旧图 → 新图淡入"。
**已知缺陷**：若新图比旧图大很多，可能出现"拉伸/裁剪"瞬态。**这是 Lightbox 组件固有行为，不在本任务修复范围**（Story Out-of-Scope）。

### 11.6 错误监控

本任务**不**新增埋点/日志。错误已经通过现有 `onError` 静默处理（hide img 节点 + 显示占位）。

---

## 12. 安全（最低限度声明）

| 维度 | 声明 |
|------|------|
| 鉴权 | 本任务**不**涉及 API/Server Action，**不**需要新增鉴权层（保留现有 AuthContext） |
| 租户隔离 | **N/A**（前端纯渲染，无数据隔离责任） |
| 输入校验 | **N/A**（`src` 来自 `recipe.coverImage / comment.user.avatar` 等后端响应，已有后端 schema 约束） |
| 敏感数据泄露 | **N/A**（`loading="lazy/eager"` 是 HTML 属性，不传递用户数据） |
| 客户端密钥 | **N/A**（不接触 env） |
| CSP | 现有 `index.html` CSP 不变，**不**引入 `unsafe-inline`（CSS 追加用现有 `style` 标签机制） |
| XSS | `alt` / `className` 全部是字面值字符串，**不**渲染用户输入 |

---

## 13. 性能

### 13.1 量化目标

| 指标 | 当前（推测） | 目标 | 测量方式 |
|------|-------------|------|----------|
| LCP（3G 模拟） | ~3.5s | ≤ 3.0s | Lighthouse mobile |
| 首屏图片请求数（滚到第 1 屏） | 13+（含次屏竞争） | = 13 | DevTools Network count |
| 滚动到第 3 屏时图片请求数 | 全部并发 | ≤ 36 | DevTools Network count（分批） |
| RecipeCardSkeleton 动画可见性 | 静态灰色 | 渐变扫光 1.5s | 浏览器录屏 |

### 13.2 性能风险

- **R-1 模态空白**：用 `loading="eager"` 显式防空白（§6 R-1 对策）
- **R-2 Lightbox 空白**：同上
- **R-5 Hero LCP**：现有三元 + `fetchPriority=high` 已保证首张优先，**不**回退
- **CSS 动画重绘成本**：`shimmer` 是 `background-position` 动画 → 触发 composite layer，不阻塞主线程（已用 `will-change: background-position` 类似效果，参考 Skeleton.css:8）

### 13.3 不做的事

- **不**引入响应式 `srcset`（Story Out-of-Scope #1 后端改动）
- **不**引入图片 CDN 优化（Story Out-of-Scope #1）
- **不**做 prefetch（Story R-2 明确"不在本任务范围"）
- **不**改 ImagePlaceholder 的渐变背景生成算法

---

## 14. 可测试性

### 14.1 单元测试

- `ImagePlaceholder.test.tsx` 已存在（自动发现），**不**改
- `RecipeCardSkeleton` **无**单测（任务范围外，**不**新增）

### 14.2 集成/E2E 测试

- **手测脚本**（impl 阶段执行）：
  1. 打开 http://39.103.68.205/，清缓存
  2. DevTools Network → Filter: Img → 滚到第 1 屏
  3. 期望：12 张首屏卡片图 + 1 张 Hero[0] = 13 张（按时间排序）
  4. 滚到第 2 屏：触发新请求，新图**分批**加入（每次 1-3 张）
  5. 点击任意卡片 → 模态打开 → 封面图**已经**加载（Network 看到 status=200 + img.complete=true）
  6. 关闭模态 → 点击评论 → 进 Lightbox → 大图**已经**加载
  7. 回到首页 → 看到 RecipeCard 列表加载时的 shimmer 渐变扫光

### 14.3 视觉回归

- 录制 5 秒视频对比 before/after：
  - 视频 1：当前部署（main HEAD 22a8304）首页加载过程
  - 视频 2：impl 后（HEAD = iter-136）首页加载过程
  - 关注点：shimmer 动画是否流畅、首屏是否有"图片跳变"瞬态

### 14.4 Lighthouse 跑分归档

- 文件路径：`docs/perf/iter-136/home-mobile.json`
- 命令：见 §7.3 step 4
- 跑分结果以 PR 评论形式附给 reviewer

---

## 15. 迁移与回滚

### 15.1 迁移

- **无数据迁移**（CSS + 5 处属性 + 1 处注释 + 3 处注释）
- **无 schema 变更**
- **无环境变量变更**
- **无依赖升级**

### 15.2 回滚（2 步，< 30 秒）

1. `git revert <iter-136-commit-sha>` → 重新 build
2. `deploy.sh frontend` → 旧 build 产物覆盖

或（更快的 hotfix）：
1. `tar -xzf dist.tar.gz`（根目录的旧 build 产物压缩包）
2. `deploy.sh frontend`

回滚**不需要**回退数据库/迁移，**不需要**清缓存（CDN 缓存会自动过期，旧 HTML 引用旧 bundle hash，访问旧 URL 仍可用）。

### 15.3 Feature flag

**不**引入 feature flag。原因：5 处 `loading="lazy"` 是 HTML 属性，无法在运行时 toggle（要切换必须改 src 然后 setState，复杂且收益低）。如果上线后出问题，直接 §15.2 回滚即可。

---

## 16. 未决问题

| # | 问题 | 建议决策 |
|---|------|----------|
| Q-1 | 任务书"43 个无 lazy"数字过时，AC-1 要求 dev 重测确认最终缺 lazy 清单 | **决策**：impl 阶段第一步执行 `grep -rn "<img" frontend/src/components/ \| grep -v "loading=\"lazy\""`，**以实测为准**。如果发现 Story AC-3 列表之外还有缺 lazy 的 `<img>`，**不**在本次 PR 修（避免 scope creep），单独开 follow-up issue |
| Q-2 | AC-2 第 3 条「HeroSection 候选首屏 LCP 图（待 dev 实测）」—— 是否真的在视口？ | **决策**：HeroSection.tsx:133 已有三元 `eager / lazy` 区分，**默认当作在视口**处理。impl 阶段如发现 Hero 不在首屏（移到了次屏），把整段三元改成全 lazy。**当前设计以当前 JSX 为准** |
| Q-3 | Story 提到「改 Skeleton 组件默认带 animated」，但 §4 论证说不必改 | **决策**：保持 §4 的"不新增 prop"方案。如 reviewer 不同意，**可**改方案（在 ST-7 加 1 个 impl 子任务），但本设计倾向不引入 |

---

## 17. 检查清单（提交 reviewer 前自检）

- [x] §1 技术选型表每行"备选方案"非空
- [x] §2 每个文件有 before/after diff
- [x] §3 shimmer 复用 FeaturedSection + 独立 keyframe 命名 + prefers-reduced-motion
- [x] §4 论证"不动 Skeleton.tsx"的理由
- [x] §5 3 处白名单注释模板
- [x] §6 5 个风险都有代码层对策
- [x] §7 部署流程（不重启容器）+ 回归 + 回滚
- [x] §8 子任务拆分 ≤30 min/条
- [x] §9 显式声明"无新增 API/类型"
- [x] §10 时序（改进前/后）
- [x] §11 边界与错误处理 6 项
- [x] §12 安全声明 7 项
- [x] §13 性能量化目标
- [x] §14 可测试性：手测脚本 + Lighthouse 归档
- [x] §15 迁移/回滚/feature flag
- [x] §16 未决问题 3 项（Q-1 / Q-2 / Q-3）
- [x] In Scope / Out of Scope 在 §1 显式标注
- [x] Story 8 条 AC（AC-1 ~ AC-8）全部有对应方案
- [x] Story 5 条风险（R-1 ~ R-5）全部有对策

---

## 18. 版本

- v1.0 · 2026-06-12 · architect 初稿
