# UI 设计规范：首页加载体验优化（iter111-perf）

> **迭代**：iter111-perf
> **范围**：首页 `/` 首屏加载速度、骨架屏体验、交互流畅度、视觉一致性
> **目标指标**：LCP < 2.0s · FID < 100ms · CLS < 0.1 · 主 bundle 301KB → 220KB（-27%）
> **设计原则**：保留既有设计 token · 暗色模式全覆盖 · 渐进增强（不影响功能） · 零依赖（纯 CSS + React hooks） · 移动端优先
> **参考文件**：
> - `frontend/src/pages/HomePage.tsx`（199 行）
> - `frontend/src/pages/HomePage.css`（399 行）
> - `frontend/src/components/HeroSection.tsx` / `.css`
> - `frontend/src/components/DailyPickCard.tsx` / `.css`
> - `frontend/src/components/PageSkeleton.tsx` / `.css`
> - `frontend/src/components/RecipeCard.tsx` / `.css`
> - `frontend/src/components/PageTransition.css`
> - `frontend/src/api.ts`（已有 `getFeaturedRecipes()` 接口！）
> - `frontend/vite.config.ts`

---

## 0. 现状诊断（Code Audit）

| # | 问题 | 文件 / 行号 | 影响 |
|---|------|------------|------|
| 1 | `getRecipes({ page: 1, pageSize: 100 })` 仅为了匹配 3 条精选标题 | `HomePage.tsx:103-109` | 浪费 100 条食谱的 payload（≈20-40KB） + 100 条 ID 解析 |
| 2 | 主 bundle 301KB 未做首页组件代码分割 | `vite.config.ts`（无 manualChunks） | 首次加载过重 |
| 3 | 暗色模式选择器不一致 | `HomePage.css:242-268` 使用 `.dark` | 应统一为 `body.dark`（项目规范） |
| 4 | RecipeCard 封面图未 `loading="lazy"` | `RecipeCard.tsx`（用 `ImagePlaceholder` 已处理；HeroSection 第一张也 eager） | HeroSection 的非首屏轮播图应 lazy |
| 5 | DailyPickCard 在首屏立即挂载触发 API | `HomePage.tsx:127-135` | 视口外不渲染可省一次请求 |
| 6 | PageSkeleton home 类型缺少分类卡片骨架 | `PageSkeleton.tsx:25-48` | 分类区切换时无骨架反馈 |
| 7 | 骨架屏 shimmer 1.4s 略快，渐变更"碎" | `Skeleton.css:9` | 1.6s + 三段渐变更柔和 |
| 8 | 无关键资源 preload/preconnect | `index.html` | 字体、CDN 图片可提速 |
| 9 | 已有 `PageTransition.css` 但 `HomePage` 未挂类名 | `router/index.tsx:15`（仅导入，未用 `.page-transition-enter`） | 当前依靠 `main#main-content` fadeIn 兜底 |
| 10 | 已有 `ProgressiveImage` 组件但 HomePage/HeroSection 未用 |  | 统一淡入体验 |

---

## 1. 首屏加载优化

### 1.1 用 `getFeaturedRecipes()` 替代 100 条请求

**核心思路**：api.ts 第 249 行已存在 `getFeaturedRecipes()`，**直接调用即可**，无需新增后端接口。

#### 1.1.1 修改 `HomePage.tsx`

**删除第 102-109 行**：
```tsx
// 删除这段（运行时才写 100 条数据，浪费带宽）
useEffect(() => {
  getRecipes({ page: 1, pageSize: 100 })
    .then(res => {
      const data = res.data || res
      setAllRecipes(data.list || [])
    })
    .catch(() => {})
    .finally(() => setHeroLoaded(true))
}, [])
```

**新增导入**（`HomePage.tsx` 第 6 行 `import { getRecipes } from '../api'` 改为）：
```tsx
import { getRecipes, getFeaturedRecipes } from '../api'
```

**新增 useEffect**（替换上面那段）：
```tsx
// Load hero data — 直接拉精选 3 条，零浪费
useEffect(() => {
  let cancelled = false
  getFeaturedRecipes()
    .then((res: any) => {
      if (cancelled) return
      const data = res.data?.data || res.data || res
      const list = Array.isArray(data) ? data : data.list || []
      setAllRecipes(list)
    })
    .catch(() => {})
    .finally(() => { if (!cancelled) setHeroLoaded(true) })
  return () => { cancelled = true }
}, [])
```

**移除 `allRecipes` state**（如果只服务于 hero 精选匹配），改为直接用 `featuredRecipes`：
```tsx
// 替换
const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
const [heroLoaded, setHeroLoaded] = useState(false)

// 为
const [featuredRecipes, setFeaturedRecipes] = useState<HeroRecipe[]>([])
const [heroLoaded, setHeroLoaded] = useState(false)
```

**简化 heroRecipes 构造**（原 128-135 行）：
```tsx
// 删除 heroRecipes 计算 —— useEffect 里直接 setFeaturedRecipes
```

**预期收益**：首屏 -20~40KB payload · 减少 100 条 ID 解析 · LCP 提升 100-300ms

#### 1.1.2 后端备选方案（如 `getFeaturedRecipes` 不可靠）

后端可扩展 `getRecipes` 接受 `?ids=a,b,c` 拉指定 ID（如不修改后端，可参考 PRD-search-enhance 已有的 `recipeIds` 参数）。**推荐优先用现有 `/recipes/featured`，无后端改动**。

---

### 1.2 HeroSection 图片预加载与优先级

#### 1.2.1 修改 `HeroSection.tsx`

**HeroSection.tsx 第 117-127 行的预加载逻辑**改为：
```tsx
// Preload first image with high priority; rest lazy
useEffect(() => {
  if (items.length === 0) return
  const firstImg = new Image()
  firstImg.fetchPriority = 'high'
  firstImg.onload = () => setImagesLoaded(true)
  firstImg.onerror = () => setImagesLoaded(true)
  firstImg.src = getProxiedImageUrl(items[0].image) || items[0].image

  // 其余图片靠 <img loading="lazy"> 处理
  // 不再预加载所有 items（浪费）
}, [items])
```

**第 141 行的 img 标签**：
```tsx
<img
  src={getProxiedImageUrl(recipe.image)}
  alt={recipe.title}
  className="hero-slide__img"
  loading={idx === 0 ? 'eager' : 'lazy'}
  fetchPriority={idx === 0 ? 'high' : 'auto'}
  decoding={idx === 0 ? 'sync' : 'async'}
/>
```

#### 1.2.2 在 `index.html` 追加资源提示

`<head>` 内添加：
```html
<!-- 关键资源预连接/预加载 -->
<link rel="preconnect" href="https://images.unsplash.com" crossorigin />
<link rel="preconnect" href="http://localhost:3001" />
<!-- 字体预加载（如使用） -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
```

**注**：hero 图片 URL 是动态的（来自后端食谱 coverImage），无法静态 preload，所以用 `<link rel="preconnect">` 提前建连 + `<img fetchPriority="high">` 抢优先级。Unsplash 域名的 preconnect 适用于未走代理时（项目已有 `getProxiedImageUrl`，需检查代理域名是否一致）。

---

### 1.3 DailyPickCard 延迟挂载（IntersectionObserver）

#### 1.3.1 新增 hook：`frontend/src/hooks/useDeferredMount.ts`

```tsx
import { useEffect, useRef, useState } from 'react'

/**
 * 元素进入视口后再"挂载"组件（用于首屏下方非关键内容）
 * @param options.rootMargin 默认 '200px 0px'（提前 200px 触发）
 */
export function useDeferredMount<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<T | null>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return
    // SSR / 不支持 IO：立即挂载
    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true)
      return
    }
    if (!ref.current) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldMount(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px 0px', threshold: 0.01, ...options }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options, shouldMount])

  return { ref, shouldMount }
}
```

#### 1.3.2 修改 `HomePage.tsx`

替换第 127 行的 `<DailyPickCard />` 包裹：
```tsx
{showFullLayout && (
  <DeferredSection>
    <DailyPickCard />
  </DeferredSection>
)}
```

**新增组件（同文件内或单独文件）**：
```tsx
function DeferredSection({ children }: { children: React.ReactNode }) {
  const { ref, shouldMount } = useDeferredMount<HTMLDivElement>()
  return (
    <div ref={ref} style={{ minHeight: 240 }}>
      {shouldMount ? children : <DailyPickSkeletonPlaceholder />}
    </div>
  )
}

function DailyPickSkeletonPlaceholder() {
  return (
    <div className="daily-pick-skeleton" aria-hidden="true">
      <div className="daily-pick-skeleton__img shimmer" />
      <div className="daily-pick-skeleton__content">
        <div className="shimmer" style={{ height: 24, width: '60%', marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 16, width: '90%', marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 16, width: '70%' }} />
      </div>
    </div>
  )
}
```

**预期收益**：首屏 API 调用从 3 个（recipes / hero / dailyPick）减为 2 个 · 首屏 -1 RTT · `getDailyPick` 推迟到滚动到视口 200px 内才发起。

---

### 1.4 关键 CSS：DeferredSection 骨架占位

**追加到 `HomePage.css` 末尾**：

```css
/* ── 延迟挂载占位（DailyPickCard） ── */
.deferred-section {
  min-height: 240px;
  position: relative;
}

.deferred-section__placeholder {
  width: 100%;
  min-height: 240px;
  border-radius: 16px;
  background: var(--color-card, #fff);
  box-shadow: 0 4px 20px rgba(232, 102, 62, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted, #999);
  font-size: 13px;
}

body.dark .deferred-section__placeholder {
  background: var(--color-card, #1e1e32);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

---

## 2. Vite 代码分割（首页内部组件）

### 2.1 修改 `vite.config.ts`

**完整替换**：
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库分离
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['axios', 'dayjs'],
          // 首页内部组件按需懒加载（仅生产构建时）
          'home-hero': [
            './src/components/HeroSection.tsx',
            './src/components/DailyPickCard.tsx',
          ],
          'home-cards': [
            './src/components/RecipeCard.tsx',
            './src/components/RecipeCardSkeleton.tsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
```

**预期收益**：主 bundle 301KB → 220KB（-27%）· 第三方 vendor 独立缓存命中率高

### 2.2 验证方法

```bash
cd frontend && npm run build
# 检查 dist/assets/*.js 体积分布
ls -lh dist/assets/*.js
# 期望：home-hero.[hash].js ~ 20KB，home-cards.[hash].js ~ 25KB
```

---

## 3. 骨架屏体验升级

### 3.1 分类卡片骨架屏（5 个圆角卡片）

#### 3.1.1 修改 `PageSkeleton.tsx`

在 `case 'home':` 的 hero + section-title 之间插入分类骨架：

```tsx
case 'home':
  return (
    <div className={cls}>
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
      {/* ↓↓↓ 新增：分类卡片骨架 ↓↓↓ */}
      <div className="ps-home__categories" aria-hidden="true">
        {[120, 100, 90, 110, 80].map((w, i) => (
          <Skeleton key={i} width={w} height={32} rounded={16} />
        ))}
      </div>
      <Skeleton width="40%" height={28} className="ps-home__section-title" />
      <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
        {Array.from({ length: columns * rows }).map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
```

#### 3.1.2 在 `PageSkeleton.css` 追加

```css
/* ── 分类卡片骨架（Home） ── */
.ps-home__categories {
  display: flex;
  gap: 8px;
  margin: 16px 0 14px;
  padding-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.ps-home__categories::-webkit-scrollbar {
  display: none;
}

.ps-home__categories > .skeleton {
  flex-shrink: 0;
}

body.dark .ps-home__categories > .skeleton {
  /* 复用全局 --color-skeleton-from 变量，无需额外规则 */
}
```

---

### 3.2 骨架屏脉冲动画优化

**修改 `Skeleton.css`（替换第 1-21 行）**：

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-skeleton-from) 0%,
    var(--color-skeleton-to) 50%,
    var(--color-skeleton-from) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
  will-change: background-position;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
}

/* ── 暗色模式 ── */

body.dark .skeleton {
  background: linear-gradient(
    90deg,
    var(--color-skeleton-from, #262640) 0%,
    var(--color-skeleton-to, #303050) 50%,
    var(--color-skeleton-from, #262640) 100%
  );
  background-size: 200% 100%;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation-duration: 0s !important;
  }
}
```

**变更点**：
- 时长 `1.4s` → `1.6s`（更柔和，不眩晕）
- 关键帧从 `100% 50% → 0% 50%` 改为 `200% 50% → -200% 50%`（更明显的"光带"扫过）
- 增加 `will-change: background-position` 提示 GPU 合成
- 增加 `prefers-reduced-motion` 兜底

**同步修改**：`DailyPickCard.css` 的 `.shimmer`（第 119-126 行）使用同款 1.6s：
```css
.shimmer {
  background: linear-gradient(90deg, #eee 0%, #f5f5f5 50%, #eee 100%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: 4px;
}
```

---

### 3.3 PageSkeleton 暗色模式全覆盖

**问题**：`PageSkeleton.css` 仅在 `body.dark .ps-profile__stat` 和 `body.dark .ps-profile__tabs` 写了暗色模式，hero/list/detail/profile 的其他部分缺失。

**追加到 `PageSkeleton.css` 末尾**：

```css
/* ── 全量暗色模式兜底 ── */

body.dark .page-skeleton {
  background: var(--color-bg, #12121e);
}

body.dark .ps-home__hero-bg,
body.dark .ps-detail__cover,
body.dark .ps-profile__heatmap > .skeleton {
  background: var(--color-card, #1e1e32);
  box-shadow: var(--shadow-sm);
}

body.dark .ps-list__searchbar > .skeleton,
body.dark .ps-list__filters > .skeleton {
  background: linear-gradient(
    90deg,
    var(--color-skeleton-from, #262640) 0%,
    var(--color-skeleton-to, #303050) 50%,
    var(--color-skeleton-from, #262640) 100%
  );
}
```

---

## 4. 交互流畅度升级

### 4.1 RecipeCard 图片 fade-in（已实现 ✅）

**结论**：`RecipeCard.tsx` 已使用 `ImagePlaceholder` 组件（行 138-145），`ImagePlaceholder.tsx` 第 80-87 行已实现 `opacity: 0 → 1` + `blur(10px → 0)` 0.4s 过渡。**无需改动**。

**HeroSection 改造建议**（如需统一）—— 见 § 4.4。

---

### 4.2 点击 ripple 效果（纯 CSS，零依赖）

**追加到 `HomePage.css` 末尾**：

```css
/* ── Ripple 效果 ── */

/* 基础：所有可点击元素设置 overflow 隐藏 + position 相对 */
.ripple-host {
  position: relative;
  overflow: hidden;
  isolation: isolate; /* 让 ::before 不会泄露到外层 */
}

.ripple-host::before {
  content: '';
  position: absolute;
  top: var(--ripple-y, 50%);
  left: var(--ripple-x, 50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.18;
  transform: translate(-50%, -50%);
  transition: width 0.5s ease-out, height 0.5s ease-out, opacity 0.6s ease-out;
  pointer-events: none;
  z-index: 0;
}

.ripple-host:active::before {
  width: 240px;
  height: 240px;
  opacity: 0;
  transition: width 0s, height 0s, opacity 0s; /* 立即开始 */
}

/* ── 应用到按钮 ── */
.home-category.ripple-host,
.home-search__btn.ripple-host,
.pagination-btn.ripple-host {
  /* color 决定 ripple 颜色（currentColor 继承） */
  color: inherit;
}

.home-search__btn.ripple-host::before {
  background: #fff;
  opacity: 0.3;
}

@media (prefers-reduced-motion: reduce) {
  .ripple-host::before {
    display: none;
  }
}
```

**使用方式**（在 `HomePage.tsx` JSX 给按钮加 `ripple-host` 类 + 点击事件）：

```tsx
// 新增：onMouseDown 计算位置（设置 CSS 变量）
function makeRippleHandler() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    target.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`)
    target.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`)
  }
}

// 应用
<button
  className="home-category ripple-host"
  onMouseDown={makeRippleHandler()}
  onClick={() => handleCategoryChange(cat)}
>
  {cat}
</button>
```

**预期收益**：触感反馈更自然 · 0 KB JS（纯 CSS + CSS 变量） · Material Design 体验

---

### 4.3 页面切换动画（已部分生效 ✅）

**现状**：
- `PageTransition.css` 定义了 `.page-transition-enter*` 类名（**CSSTransition 风格**）
- `router/index.tsx:15` 仅 `import '../components/PageTransition.css'`
- `main#main-content` 上有 `mainFadeIn` 0.35s 动画（兜底生效）

**结论**：路由切换时已经有 `mainFadeIn` 兜底，**当前用户体验 OK**。`PageTransition.css` 第 1-16 行的 `.page-transition-enter*` 类属于历史遗留（可能为未来 `react-transition-group` 升级预留），**本次不删除，避免误改**。

**新增优化**：在 `main#main-content` 动画基础上，让内容容器在加载完成时**轻微微缩+回弹**（增强"页面落定"感）。

**追加到 `PageTransition.css` 末尾**：

```css
/* ── 页面落定（加载完成时）── */
@keyframes pageSettle {
  0% {
    transform: scale(0.995);
    filter: blur(2px);
  }
  100% {
    transform: scale(1);
    filter: blur(0);
  }
}

main#main-content[data-loaded="true"] {
  animation: mainFadeIn 0.35s ease both, pageSettle 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}
```

**配合 `router/index.tsx` 在 `Suspense` fallback 切换时设置 `data-loaded`**（轻量级）：
```tsx
<main id="main-content" data-loaded="true">
  {/* 现有内容 */}
</main>
```

**说明**：当前 `<main>` 渲染即视为"加载完成"，CSS 动画在每次路由切换时重放。简单可靠。

---

### 4.4 HeroSection 图片 fade-in 统一

**修改 `HeroSection.css` 末尾追加**：

```css
/* ── 图片淡入（统一 RecipeCard 体验） ── */
.hero-slide__img {
  opacity: 0;
  filter: blur(10px);
  transition: opacity 0.5s ease, filter 0.5s ease, transform 0.6s ease;
}

.hero-track[data-loaded="true"] .hero-slide--active .hero-slide__img {
  opacity: 1;
  filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
  .hero-slide__img {
    transition: none;
    opacity: 1;
    filter: none;
  }
}
```

**配合 `HeroSection.tsx`**：在 `setImagesLoaded(true)` 时同步设置 `.hero-track[data-loaded="true"]`，并在 `current` 变化时给当前 slide 加 `.hero-slide--active` 类。

**说明**：当前已有 `opacity: 0` + 整轨道 `transition: opacity 0.4s`（HeroSection.tsx 第 137 行），效果接近。**本次仅在 480px 以下做"渐进式"加载可作为可选优化**——若实施成本与收益不匹配，可跳过。

---

## 5. 视觉一致性修复

### 5.1 暗色模式选择器统一：`.dark` → `body.dark`

**修改 `HomePage.css`（替换第 242-272 行）**：

```css
/* ── 暗色模式 ── */
body.dark .home-page {
  color: var(--color-text, #e0d8d0);
}

body.dark .home-search__input {
  background: var(--color-input-bg, #2a2520);
  color: var(--color-text, #e0d8d0);
  border-color: var(--color-border, #3a3530);
}

body.dark .home-category {
  background: var(--color-card, #2a2520);
  border-color: var(--color-border, #3a3530);
  color: var(--color-text, #e0d8d0);
}

body.dark .pagination-btn {
  background: var(--color-card, #2a2520);
  border-color: var(--color-border, #3a3530);
  color: var(--color-text, #e0d8d0);
}

body.dark .home-section__title {
  border-bottom-color: var(--color-border, #3a3530);
}

body.dark .home-section__title::after {
  background: var(--color-primary-light, #f0946e);
}
```

**注**：第 307-315 行的 `.rankings-entry` 已经使用 `body.dark`，**保持不变**。

**全项目搜索建议**：
```bash
cd frontend/src
grep -rn "^\.dark \|^\.dark{" --include="*.css" .
# 修复所有非 body.dark 选择器
```

**已知影响文件**（按优先级）：
1. `HomePage.css:242-272` ← 本次修复
2. 其他页面可能存在（搜索后逐个评估）

---

### 5.2 全量暗色模式覆盖检查

**当前覆盖**（`HomePage` 各组件）：
| 组件 | 暗色模式 |
|------|---------|
| `HeroSection` | ✅ `body.dark .hero-*`（HeroSection.css:198-225） |
| `DailyPickCard` | ✅ `body.dark .daily-pick-*`（DailyPickCard.css:106-127） |
| `RecipeCard` | ✅ `body.dark .recipe-card*`（RecipeCard.css 多处） |
| `PageSkeleton` | ⚠️ 仅 profile 部分覆盖，§3.3 已补全 |
| `HomePage` 自身 | ❌ → ✅ 本次修复 |

**暗色模式校验清单**（验收时逐项打勾）：
- [ ] 搜索框在暗色模式背景色对比度 ≥ 4.5:1
- [ ] 分类按钮 active 态在暗色模式主色不刺眼
- [ ] 骨架屏 shimmer 在暗色模式有渐变（不出现纯黑/纯白硬切）
- [ ] 分页按钮禁用态在暗色模式仍可辨识

---

### 5.3 响应式检查（≤480px）

**当前 `@media (max-width: 480px)` 覆盖**（在 `HomePage.css:386-399`）：
- `home-tabs` 间距缩小
- `home-tab` 字号 13px

**`HomePage.css` 新增 ≤480px 规则**（在末尾追加）：

```css
/* ── 小屏 ≤480px ── */
@media (max-width: 480px) {
  .home-page {
    padding: 12px 12px 32px;
  }

  .home-search {
    flex-direction: row;
    gap: 6px;
  }

  .home-search__input {
    font-size: 13px;
    padding: 7px 12px;
  }

  .home-search__btn {
    padding: 7px 12px;
    font-size: 12px;
  }

  .home-categories {
    gap: 6px;
    margin-bottom: 12px;
  }

  .home-category {
    padding: 5px 12px;
    font-size: 12px;
  }

  .home-grid {
    gap: 6px;
  }

  .home-section__title {
    font-size: 16px;
  }

  .home-section__icon {
    font-size: 20px;
  }

  .home-empty {
    padding: 32px 16px;
  }

  .home-empty__icon {
    font-size: 40px;
  }

  .home-pagination {
    gap: 10px;
    margin-top: 20px;
  }

  .pagination-btn {
    padding: 5px 10px;
    font-size: 12px;
  }

  .pagination-info {
    font-size: 12px;
  }
}
```

**同样补到 `HomePage.css:386-399` 已有的 `@media (max-width: 480px)` 块内可减少重复。**

---

## 6. 文件清单与修改说明

| # | 文件 | 类型 | 主要变更 | 工作量 |
|---|------|------|---------|--------|
| 1 | `frontend/src/pages/HomePage.tsx` | 修改 | 用 `getFeaturedRecipes` 替代 100 条请求；包裹 `<DailyPickCard>` 为 `DeferredSection`；`ripple-host` 类名 + 位置计算；移除 `allRecipes` 引入 `featuredRecipes` | M |
| 2 | `frontend/src/pages/HomePage.css` | 修改 | 5 处 `.dark` → `body.dark`；新增 `.deferred-section` 样式；新增 `.ripple-host` 样式；扩展 `@media (max-width: 480px)` 规则 | M |
| 3 | `frontend/src/components/HeroSection.tsx` | 修改 | `fetchPriority="high"` for first img；`decoding="async"` for rest；预加载只预第一张 | S |
| 4 | `frontend/src/components/HeroSection.css` | 可选 | 图片 fade-in 微调（§4.4） | S |
| 5 | `frontend/src/components/PageSkeleton.tsx` | 修改 | home 类型插入分类骨架 | S |
| 6 | `frontend/src/components/PageSkeleton.css` | 修改 | 新增 `.ps-home__categories`；全量暗色模式兜底 | S |
| 7 | `frontend/src/components/Skeleton.css` | 修改 | shimmer 1.4s → 1.6s + 关键帧优化 + reduced-motion | S |
| 8 | `frontend/src/components/DailyPickCard.css` | 修改 | `.shimmer` 1.5s → 1.6s（同步） | S |
| 9 | `frontend/src/components/PageTransition.css` | 新增 | `pageSettle` 动画（可选增强） | S |
| 10 | `frontend/src/hooks/useDeferredMount.ts` | 新增 | IntersectionObserver hook | S |
| 11 | `frontend/vite.config.ts` | 修改 | `manualChunks` 配置 | S |
| 12 | `frontend/index.html` | 修改 | `<link rel="preconnect">` 预连接 | S |

**工作量预估**：M = 30-60min · S = 5-15min · **总计 ≈ 4-6 小时**

---

## 7. 性能指标目标与验收

### 7.1 目标指标

| 指标 | 当前 | 目标 | 测量工具 |
|------|------|------|---------|
| LCP (Largest Contentful Paint) | ~2.5-3.0s | **< 2.0s** | Lighthouse · WebPageTest |
| FID (First Input Delay) | ~80-150ms | **< 100ms** | Lighthouse · Web Vitals |
| CLS (Cumulative Layout Shift) | ~0.05-0.15 | **< 0.1** | Lighthouse |
| TTFB (Time To First Byte) | ~200-400ms | < 300ms | WebPageTest |
| 主 bundle (gzipped) | 301KB | **< 220KB** | `npm run build` + gzip |
| 首次 API 请求数 | 3 (recipes/hero/dailyPick) | **2 (recipes/featured)** | Network panel |
| 字体/图片 preload | 0 | 2+ | DevTools Network → Resource Hints |

### 7.2 验收清单（Acceptance Checklist）

#### A. 首屏加载
- [ ] `HomePage.tsx` 不再调用 `getRecipes({pageSize: 100})`，改用 `getFeaturedRecipes()`
- [ ] 打开 DevTools Network，刷新首页，确认 `/recipes/featured` 返回 ≤ 10 条
- [ ] DevTools → Network → Doc → Response，确认主 HTML 头部有 `<link rel="preconnect">`
- [ ] Lighthouse 跑分（移动端 4G 模拟）LCP < 2.0s，FID < 100ms，CLS < 0.1

#### B. 代码分割
- [ ] `npm run build` 成功无 chunk 警告
- [ ] `dist/assets/` 目录有 `home-hero.*.js` + `home-cards.*.js` 两个独立 chunk
- [ ] 主入口 chunk ≤ 220KB（gzipped）

#### C. 骨架屏
- [ ] 首页初次加载（清缓存）显示完整 home 类型骨架：hero + 分类（5 个圆角）+ 网格
- [ ] 暗色模式下骨架有渐变 shimmer，无纯白/纯黑硬切
- [ ] `prefers-reduced-motion: reduce` 时骨架不动画

#### D. 交互流畅度
- [ ] 点击分类按钮有 ripple 扩散效果（仅桌面端）
- [ ] 路由切换时主内容有 fadeIn + settle 动画
- [ ] RecipeCard 封面图加载有 0.4s 淡入（已实现）
- [ ] 触屏（≤768px）下 ripple 不显示（避免误触）

#### E. 视觉一致性
- [ ] `HomePage.css` 第 242-272 行的 5 处 `.dark` 全部改为 `body.dark`
- [ ] 切换暗色模式时首页所有元素（搜索/分类/分页/标题/骨架）颜色正确
- [ ] ≤480px 视口下首页布局不溢出，分类/网格/按钮均可点

#### F. 暗色模式全量
- [ ] `grep -rn "^\.dark" frontend/src/` 仅在 `PageSkeleton.css` 残余（已纳入 §3.3）或历史遗留
- [ ] 暗色模式骨架屏有 `.ps-home__categories` / `.ps-home__hero-bg` 等兜底规则

#### G. HeroSection
- [ ] 第一张图片 `fetchPriority="high"`、`decoding="sync"`
- [ ] 其余图片 `loading="lazy"`、`decoding="async"`
- [ ] `useEffect` 预加载只创建第一个 `new Image()`，不再循环所有 items

#### H. DailyPickCard 延迟
- [ ] 首屏加载时 `DailyPickCard` 不立即调 `getDailyPick`
- [ ] 滚动到距离 200px 时才发起 API 请求
- [ ] 视口外显示 `DailyPickSkeletonPlaceholder`（240px min-height）
- [ ] 弱网环境（无 IntersectionObserver 支持）降级为立即挂载

---

## 8. 风险与回滚

| 风险 | 影响 | 回滚方案 |
|------|------|---------|
| `getFeaturedRecipes()` 后端未实现 | hero 区域回退 FALLBACK（已有 5 条静态） | 检查 backend 路由；临时保留旧 `getRecipes({pageSize:100})` 逻辑 |
| Vite `manualChunks` 引入循环依赖 | 构建失败 | 移除 `home-hero` / `home-cards` 块，保留 `vendor-react` |
| `useDeferredMount` 在 SSR 报错 | build 失败 | hook 内已有 `typeof IntersectionObserver === 'undefined'` 兜底 |
| 暗色模式选择器批量替换遗漏 | 暗色模式表现不一致 | 验收时全局 grep `^\.dark ` 逐个修复 |
| Ripple 在 iOS Safari 不生效 | 视觉无变化 | 仅桌面端启用，触屏 < 768px 通过 `@media (hover: hover)` 限制 |

**整体回滚**：`git revert <commit>` 或按 §6 表格反向修改。

---

## 9. 实施顺序（推荐 PR 拆分）

### PR 1：性能核心（~2h）
1. `HomePage.tsx` 改用 `getFeaturedRecipes`
2. `vite.config.ts` 加 `manualChunks`
3. `index.html` 加 `preconnect`
4. `HeroSection.tsx` 优先级 / 预加载优化

**→ 即可获得主 bundle 减少 + 100 条 payload 削减 + LCP 提升**

### PR 2：骨架屏（~1h）
5. `useDeferredMount` hook
6. `HomePage.tsx` 包裹 `<DeferredSection>`
7. `PageSkeleton.tsx/.css` 分类骨架
8. `Skeleton.css` 1.4s → 1.6s + 关键帧优化
9. `PageSkeleton.css` 暗色模式全量兜底

**→ 用户感知：首屏反馈更柔和，分类加载即时可见**

### PR 3：一致性 & 暗色模式（~1h）
10. `HomePage.css` 5 处 `.dark` → `body.dark`
11. 全项目 grep `.dark ` 修复遗漏
12. `HomePage.css` 480px 响应式扩展
13. `PageTransition.css` settle 动画

**→ 视觉一致性收口**

### PR 4（可选）：交互升级（~1.5h）
14. `ripple-host` CSS
15. `HomePage.tsx` 按钮 onMouseDown
16. `HeroSection.css` 图片 fade-in

**→ 微交互锦上添花，可独立 release**

---

## 10. 附录：完整 CSS 代码块（可直接复用）

### A. `useDeferredMount` 完整代码

```ts
// frontend/src/hooks/useDeferredMount.ts
import { useEffect, useRef, useState } from 'react'

export function useDeferredMount<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<T | null>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return
    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true)
      return
    }
    if (!ref.current) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldMount(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px 0px', threshold: 0.01, ...options }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [options, shouldMount])

  return { ref, shouldMount }
}
```

### B. `DailyPickSkeletonPlaceholder` 完整组件

```tsx
function DailyPickSkeletonPlaceholder() {
  return (
    <div className="daily-pick-skeleton" aria-hidden="true">
      <div className="daily-pick-skeleton__img shimmer" />
      <div className="daily-pick-skeleton__content">
        <div className="shimmer" style={{ height: 24, width: '60%', marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 16, width: '90%', marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 16, width: '70%', marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 36, width: 120 }} />
      </div>
    </div>
  )
}
```

### C. Ripple 点击坐标设置工具

```ts
// frontend/src/utils/ripple.ts
import type React from 'react'

export function makeRippleHandler() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    target.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`)
    target.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`)
  }
}
```

---

## 11. 相关参考

- **Web Vitals 官方**：<https://web.dev/vitals/>
- **LCP 优化指南**：<https://web.dev/lcp/>
- **CLS 优化指南**：<https://web.dev/cls/>
- **Vite manualChunks**：<https://rollupjs.org/configuration-options/#output-manualchunks>
- **MDN fetchPriority**：<https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/fetchPriority>
- **Material Design Ripple**：<https://m3.material.io/styles/motion/transitions/transition-patterns>

---

> **版本**：v1.0 · 2026-06-09
> **作者**：UI Designer Subagent
> **关联**：[`iter110-search/UI-search-autocomplete.md`](../iter110-search/UI-search-autocomplete.md) · [`iter109-ui-upgrade/UI-recipe-card-upgrade.md`](../iter109-ui-upgrade/UI-recipe-card-upgrade.md) · [`PRD-dark-mode-fix.md`](../../PRD-dark-mode-fix.md)
