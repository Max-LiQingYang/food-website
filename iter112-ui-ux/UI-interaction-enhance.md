# UI 交互体验打磨 — 全站微交互 + 移动端底部导航 + 夏季视觉

> **迭代**：iter112-ui-ux
> **目标**：补齐全站微交互体系（按钮 / 列表 / 卡片 / 视差），新增移动端底部导航栏，将首页 Hero 重构为夏季清爽蓝绿配色。
> **设计原则**：克制（不破坏现有视觉层级）、可达（a11y / 暗色模式全覆盖）、可复用（CSS 变量驱动）、渐进增强（IntersectionObserver 触发，移动端降级）。
> **零 JS 依赖**（除 IntersectionObserver 用于触发入场动画）。

---

## 目录

1. [设计总览](#1-设计总览)
2. [A. 移动端底部导航栏](#a-移动端底部导航栏-≤768px)
3. [B. 全站微交互动画](#b-全站微交互动画增强)
4. [C. 首页夏季视觉刷新](#c-首页夏季视觉刷新)
5. [响应式断点总览](#5-响应式断点总览)
6. [暗色模式统一对照表](#6-暗色模式统一对照表)
7. [性能与降级策略](#7-性能与降级策略)
8. [实施 Checklist](#8-实施-checklist)

---

## 1. 设计总览

### 1.1 三大改动范围

| 模块 | 现状 | 目标 |
|------|------|------|
| 移动端导航 | 仅顶部 Navbar 折叠汉堡 | 新增底部 Tab Bar（首页 / 搜索 / 创建 / 我的），≤768px 显示 |
| 微交互动画 | hover 仅有基本阴影 / 无 click 反馈 | 按钮 translateY+scale、卡片 hover 抬升、列表 stagger fade-in、Hero 视差 |
| 首页 Hero 配色 | 暖橙 `#FF6B35` 单色 | 夏季蓝绿渐变 `#00B4D8 → #0077B6`，配套时令食材卡片 |

### 1.2 配色 Token 新增（夏季主题）

| 变量 | 浅色 | 暗色 | 用途 |
|------|------|------|------|
| `--color-summer-light` | `#CAF0F8` | `rgba(0,180,216,0.18)` | Hero 起色 / 卡片浅底 |
| `--color-summer-mid` | `#00B4D8` | `#48cae4` | Hero 中色 / 强调按钮 |
| `--color-summer-deep` | `#0077B6` | `#023e8a` | Hero 终色 / 主操作 |
| `--color-summer-accent` | `#52B788` | `#74c69d` | 季节点缀（绿） |
| `--color-summer-soft` | `#e6f7fb` | `#1a2a3a` | 时令卡片浅底 |

### 1.3 新增动画 Token

| 变量 | 值 | 用途 |
|------|----|------|
| `--ease-out-soft` | `cubic-bezier(0.21, 1.02, 0.73, 1)` | 入场 / hover |
| `--ease-out-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹跳 / 强调 |
| `--duration-fast` | `0.2s` | 按钮 / 状态切换 |
| `--duration-normal` | `0.3s` | 卡片 / 列表 |
| `--duration-slow` | `0.5s` | 视差 / Hero |

---

## A. 移动端底部导航栏（≤768px）

### A.1 设计思路

- **结构**：4 个 Tab，等宽分布，固定在视口底部
- **激活态**：图标 + 文字变 `var(--color-summer-mid)`，背景用 8% 透明度的同色填充形成胶囊高亮
- **创建 Tab 视觉差异化**：使用圆形浮起按钮（48×48），背景 `var(--color-summer-deep)`，白图标，比其他 Tab 高出 12px（top: -12px）形成 FAB 错觉
- **iOS 安全区**：使用 `env(safe-area-inset-bottom)` 适配 Home Indicator
- **桌面端**：>768px 完全隐藏，保留现有顶部 Navbar
- **z-index**：1000（高于普通内容，低于 Toast 9999）

### A.2 HTML 结构

**位置**：插入到 `frontend/src/App.tsx` 的根布局中，与现有 `<Navbar />` 同级。

```jsx
{/* 移动端底部导航 — 仅 ≤768px 显示 */}
<nav className="bottom-nav" aria-label="主导航">
  <NavLink
    to="/"
    end
    className={({ isActive }) =>
      `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
    }
  >
    <span className="bottom-nav__icon" aria-hidden="true">🏠</span>
    <span className="bottom-nav__label">首页</span>
  </NavLink>

  <NavLink
    to="/search"
    className={({ isActive }) =>
      `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
    }
  >
    <span className="bottom-nav__icon" aria-hidden="true">🔍</span>
    <span className="bottom-nav__label">搜索</span>
  </NavLink>

  <NavLink
    to="/create"
    className={({ isActive }) =>
      `bottom-nav__item bottom-nav__item--fab ${isActive ? 'bottom-nav__item--active' : ''}`
    }
    aria-label="创建食谱"
  >
    <span className="bottom-nav__icon" aria-hidden="true">➕</span>
    <span className="bottom-nav__label">创建</span>
  </NavLink>

  <NavLink
    to="/profile"
    className={({ isActive }) =>
      `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
    }
  >
    <span className="bottom-nav__icon" aria-hidden="true">👤</span>
    <span className="bottom-nav__label">我的</span>
  </NavLink>
</nav>
```

### A.3 完整 CSS

**追加到 `frontend/src/global.css` 末尾（或新建 `frontend/src/components/BottomNav.css` 后在 `global.css` 顶部 `@import`）**

```css
/* ===== 移动端底部导航 ===== */
.bottom-nav {
  display: none; /* 默认桌面隐藏 */
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--color-card);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
    z-index: 1000;
    align-items: stretch;
    justify-content: space-around;
    /* 防止 iOS Safari 底部工具栏遮挡 */
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    background-color: color-mix(in srgb, var(--color-card) 92%, transparent);
  }

  .bottom-nav__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 4px;
    text-decoration: none;
    color: var(--color-text-muted);
    font-size: 11px;
    line-height: 1;
    transition: color var(--duration-fast) var(--ease-out-soft);
    position: relative;
    /* 移动端禁用复杂 hover 反馈 */
    -webkit-tap-highlight-color: transparent;
  }

  .bottom-nav__item:active {
    transform: scale(0.94);
  }

  .bottom-nav__icon {
    font-size: 22px;
    line-height: 1;
    transition: transform var(--duration-fast) var(--ease-out-soft);
  }

  .bottom-nav__label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.2px;
  }

  /* 激活态 */
  .bottom-nav__item--active {
    color: var(--color-summer-mid);
  }

  .bottom-nav__item--active .bottom-nav__icon {
    transform: translateY(-2px);
  }

  /* 激活态顶部小圆点指示 */
  .bottom-nav__item--active::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-summer-mid);
  }

  /* 创建 Tab — FAB 风格 */
  .bottom-nav__item--fab {
    position: relative;
  }

  .bottom-nav__item--fab .bottom-nav__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-summer-mid), var(--color-summer-deep));
    color: #fff;
    font-size: 26px;
    box-shadow: 0 4px 12px rgba(0, 119, 182, 0.4);
    margin-top: -16px;
    transition: transform var(--duration-fast) var(--ease-out-soft),
                box-shadow var(--duration-fast) var(--ease-out-soft);
  }

  .bottom-nav__item--fab:active .bottom-nav__icon {
    transform: scale(0.92);
    box-shadow: 0 2px 6px rgba(0, 119, 182, 0.5);
  }

  .bottom-nav__item--fab .bottom-nav__label {
    margin-top: 2px;
  }

  /* 暗色模式 */
  body.dark .bottom-nav {
    background-color: color-mix(in srgb, var(--color-card) 88%, transparent);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
  }

  body.dark .bottom-nav__item--active {
    color: var(--color-summer-mid);
  }

  body.dark .bottom-nav__item--fab .bottom-nav__icon {
    box-shadow: 0 4px 12px rgba(72, 202, 228, 0.35);
  }
}

/* 桌面端完全隐藏 */
@media (min-width: 769px) {
  .bottom-nav {
    display: none !important;
  }
}
```

### A.4 页面内容 padding 适配

**问题**：底部 Tab Bar 高度 60px + safe-area，会遮挡页面最底部内容。
**方案**：在 `frontend/src/global.css` 中追加：

```css
/* 移动端为主页面内容预留底部空间，避免被 BottomNav 遮挡 */
@media (max-width: 768px) {
  body.has-bottom-nav main,
  body.has-bottom-nav .page-container,
  body.has-bottom-nav #root > div {
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 16px);
  }
}
```

**集成方式**（`App.tsx`）：
```jsx
useEffect(() => {
  document.body.classList.add('has-bottom-nav');
  return () => document.body.classList.remove('has-bottom-nav');
}, []);
```

### A.5 路由与激活态

复用 `react-router-dom` 的 `NavLink` 组件的 `isActive` 回调，无需额外状态管理。

| 路由 | 图标 | 文字 | 备注 |
|------|------|------|------|
| `/` | 🏠 | 首页 | `end` 严格匹配 |
| `/search` | 🔍 | 搜索 | 包含子路由 `/search?q=` |
| `/create` | ➕ | 创建 | FAB 浮起样式 |
| `/profile` | 👤 | 我的 | 包含 `/profile/*` 子页面 |

---

## B. 全站微交互动画增强

### B.1 按钮微交互

#### B.1.1 设计 Token

| 状态 | 效果 | 持续时间 | 缓动 |
|------|------|---------|------|
| 默认 | `transform: none; box-shadow: var(--shadow-sm)` | — | — |
| Hover | `translateY(-1px); box-shadow: var(--shadow-md)` | 0.2s | `var(--ease-out-soft)` |
| Active/Click | `scale(0.97); box-shadow: var(--shadow-sm)` | 0.1s | `ease` |
| Focus | 2px outline 用 `var(--color-summer-mid)` | 0.15s | ease |

#### B.1.2 CSS 实现

**追加到 `frontend/src/global.css`**：

```css
/* ===== 全局按钮微交互 ===== */
button:not(:disabled),
a.btn,
.btn,
[class*="button"]:not(:disabled) {
  transition: transform var(--duration-fast) var(--ease-out-soft),
              box-shadow var(--duration-fast) var(--ease-out-soft),
              background-color var(--duration-fast) var(--ease-out-soft),
              color var(--duration-fast) var(--ease-out-soft);
  will-change: transform;
}

@media (hover: hover) {
  button:not(:disabled):hover,
  a.btn:hover,
  .btn:hover,
  [class*="button"]:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
}

button:not(:disabled):active,
a.btn:active,
.btn:active,
[class*="button"]:not(:disabled):active {
  transform: scale(0.97);
  box-shadow: var(--shadow-sm);
  transition-duration: 0.1s;
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  button:not(:disabled),
  a.btn,
  .btn,
  [class*="button"]:not(:disabled) {
    transition: none !important;
  }
  button:not(:disabled):hover,
  button:not(:disabled):active {
    transform: none !important;
  }
}
```

**注意**：使用 `button:not(:disabled)` 避免对禁用按钮产生视觉假象；`@media (hover: hover)` 排除触屏设备，触屏点击会触发 `:active` 已足够。

#### B.1.3 暗色模式

无需额外定义，box-shadow 在 `body.dark` 中已加深（`rgba(0,0,0,0.3~0.5)`）。

### B.2 列表项 Stagger 入场动画

#### B.2.1 设计目标

- 每项依次淡入上移（opacity 0→1, translateY(10px)→0）
- 间隔 50ms，总时长 ≤ 300ms（即最多 6 项可见）
- 纯 CSS animation + animation-delay，零 JS 定时器
- IntersectionObserver 触发（或首次可见即触发）

#### B.2.2 关键帧定义

**追加到 `frontend/src/global.css`**：

```css
/* ===== 列表项 Stagger 入场动画 ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 容器进入视口时，子项依次入场 */
.list-stagger > * {
  opacity: 0;
  animation: fadeInUp 0.4s var(--ease-out-soft) forwards;
}

/* 间隔 50ms，最多覆盖 10 项（10 × 50ms = 500ms；前 6 项 ≤ 300ms） */
.list-stagger > *:nth-child(1)  { animation-delay: 0ms;   }
.list-stagger > *:nth-child(2)  { animation-delay: 50ms;  }
.list-stagger > *:nth-child(3)  { animation-delay: 100ms; }
.list-stagger > *:nth-child(4)  { animation-delay: 150ms; }
.list-stagger > *:nth-child(5)  { animation-delay: 200ms; }
.list-stagger > *:nth-child(6)  { animation-delay: 250ms; }
.list-stagger > *:nth-child(7)  { animation-delay: 300ms; }
.list-stagger > *:nth-child(8)  { animation-delay: 350ms; }
.list-stagger > *:nth-child(9)  { animation-delay: 400ms; }
.list-stagger > *:nth-child(10) { animation-delay: 450ms; }
/* 超过 10 项的剩余子项统一 500ms 延迟，避免累积等待 */
.list-stagger > *:nth-child(n+11) { animation-delay: 500ms; }

/* 视口外时暂停（IntersectionObserver 移除 .is-visible 时） */
.list-stagger:not(.is-visible) > * {
  animation-play-state: paused;
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .list-stagger > *,
  .list-stagger.is-visible > * {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

#### B.2.3 触发器（仅一个 IntersectionObserver，可复用）

**新建 `frontend/src/hooks/useStaggerReveal.ts`**（TS Hook，全局注册一次）：

```ts
import { useEffect } from 'react';

/**
 * 自动为页面上所有 .list-stagger 容器注册 IntersectionObserver
 * 进入视口时添加 .is-visible，触发子项 stagger 动画
 * 视口外时移除（重新进入会重放）
 */
export function useStaggerReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // 降级：直接显示
      document.querySelectorAll('.list-stagger').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            // 可选：滚出后移除，让再次进入时重放
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    // 当前 + 未来新增（用 MutationObserver 监听）
    const scan = () => {
      document.querySelectorAll('.list-stagger:not([data-observed])').forEach((el) => {
        observer.observe(el);
        el.setAttribute('data-observed', 'true');
      });
    };
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);
}
```

**集成**（`App.tsx` 或 Layout 组件）：

```tsx
import { useStaggerReveal } from './hooks/useStaggerReveal';

function App() {
  useStaggerReveal();
  // ... 现有代码
}
```

#### B.2.4 使用示例

```jsx
{/* 时令食材列表 */}
<ul className="seasonal-grid list-stagger">
  {seasonalItems.map((item) => <li key={item.id}>...</li>)}
</ul>

{/* 搜索结果列表 */}
<div className="recipe-list list-stagger">
  {recipes.map((r) => <RecipeCard key={r.id} {...r} />)}
</div>
```

#### B.2.5 暗色模式

无需特殊处理，opacity 动画对暗色背景无影响。

### B.3 卡片 Hover 增强

#### B.3.1 现状 vs 目标

| 状态 | 现状 | 目标 |
|------|------|------|
| 默认 | `box-shadow: var(--shadow-sm)` | `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` |
| Hover | 阴影轻微变化 | `box-shadow: 0 8px 24px rgba(0,0,0,0.12)` + `translateY(-4px)` |

#### B.3.2 CSS

**追加到 `frontend/src/global.css`**：

```css
/* ===== 卡片 Hover 增强 ===== */
.recipe-card,
.season-card,
.ranking-card,
[class*="-card"] {
  transition: transform var(--duration-normal) var(--ease-out-soft),
              box-shadow var(--duration-normal) var(--ease-out-soft);
  will-change: transform;
}

@media (hover: hover) {
  .recipe-card:hover,
  .season-card:hover,
  .ranking-card:hover,
  [class*="-card"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

/* 暗色模式 hover 阴影更深 */
body.dark .recipe-card:hover,
body.dark .season-card:hover,
body.dark .ranking-card:hover,
body.dark [class*="-card"]:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .recipe-card:hover,
  .season-card:hover,
  .ranking-card:hover,
  [class*="-card"]:hover {
    transform: none !important;
  }
}
```

**精准选择器策略**：使用 `[class*="-card"]` 通配所有以 `-card` 结尾的类（如 `.recipe-card`、`.season-card`、`.ranking-card`），避免与已有组件冲突。如发现误伤，回退到显式选择器列表。

### B.4 Hero 滚动视差

#### B.4.1 实现策略

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| `background-attachment: fixed` | 纯 CSS 零 JS | iOS Safari 不支持，移动端无效 | ❌ |
| `transform: translateY()` + scroll 事件 | 兼容性最好 | 需要 JS 监听 scroll | ⚠️ |
| `transform: translateY()` + CSS `view-timeline` | 纯 CSS 零 JS | 兼容性有限（Chrome 115+） | ✅ 渐进 |
| **组合方案**：CSS `view-timeline` 优先，JS scroll 监听降级 | 兼顾现代浏览器 + 老浏览器 | 略复杂 | ✅ **推荐** |

**采用方案**：CSS `view-timeline` + JS scroll listener 降级（仅在不支持 view-timeline 时启用）。

#### B.4.2 CSS（追加到 `global.css`）

```css
/* ===== Hero 视差 ===== */
.hero-parallax {
  position: relative;
  overflow: hidden;
}

.hero-parallax__bg {
  position: absolute;
  inset: -10% 0 -10% 0; /* 留出 10% 缓冲区，避免露出 */
  z-index: 0;
  background-size: cover;
  background-position: center;
  will-change: transform;

  /* 方式 1：CSS view-timeline（Chrome 115+ / Edge 115+） */
  animation: heroParallax linear both;
  animation-timeline: view();
  animation-range: cover 0% cover 100%;
}

@keyframes heroParallax {
  from { transform: translateY(-5%); }
  to   { transform: translateY(5%); }
}

.hero-parallax__content {
  position: relative;
  z-index: 1;
}

/* 移动端降级：禁用视差 */
@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  .hero-parallax__bg {
    animation: none !important;
    transform: none !important;
    position: absolute;
    inset: 0;
  }
}

/* 不支持 view-timeline 时的 JS 降级（由 JS 脚本添加 .hero-parallax-js 类） */
.hero-parallax-js .hero-parallax__bg {
  animation: none;
  transform: translate3d(0, var(--parallax-y, 0px), 0);
  transition: transform 0.05s linear;
}
```

#### B.4.3 JS 降级脚本（仅在不支持 view-timeline 时启用）

**新建 `frontend/src/hooks/useParallax.ts`**：

```ts
import { useEffect } from 'react';

/**
 * Hero 视差降级方案（仅在不支持 CSS view-timeline 时启用）
 * 使用 transform: translate3d + rAF 节流，避免 layout thrashing
 */
export function useParallax() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检测 CSS view-timeline 支持
    const supportsViewTimeline = CSS.supports('animation-timeline: view()');
    if (supportsViewTimeline) return; // 浏览器原生支持，无需 JS

    const heroBg = document.querySelector<HTMLElement>('.hero-parallax__bg');
    if (!heroBg) return;

    const hero = heroBg.closest<HTMLElement>('.hero-parallax');
    if (!hero) return;

    hero.classList.add('hero-parallax-js');

    let ticking = false;
    const update = () => {
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight;
      // 仅在视口内计算
      if (rect.bottom < 0 || rect.top > vh) {
        ticking = false;
        return;
      }
      // 滚动进度 -1 ~ 1
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      // translate Y: -5% ~ +5% (相对元素高度)
      const offset = progress * rect.height * 0.05;
      heroBg.style.setProperty('--parallax-y', `${-offset}px`);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);
}
```

**集成**（`App.tsx`）：

```tsx
import { useStaggerReveal } from './hooks/useStaggerReveal';
import { useParallax } from './hooks/useParallax';

function App() {
  useStaggerReveal();
  useParallax();
  // ...
}
```

#### B.4.4 使用示例

```jsx
<section className="hero-parallax">
  <div
    className="hero-parallax__bg"
    style={{ backgroundImage: 'url(/images/hero-summer.jpg)' }}
    aria-hidden="true"
  />
  <div className="hero-parallax__content">
    <h1>夏日清爽食谱</h1>
    <p>让厨房成为避暑胜地</p>
  </div>
</section>
```

#### B.4.5 暗色模式

视差背景图在暗色模式下建议叠加深色遮罩（避免过亮刺眼）：

```css
body.dark .hero-parallax::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 0;
  pointer-events: none;
}

body.dark .hero-parallax__content {
  z-index: 2; /* 高于遮罩 */
}
```

---

## C. 首页夏季视觉刷新

### C.1 Hero 配色方案

#### C.1.1 渐变定义

| 区域 | 浅色模式 | 暗色模式 |
|------|---------|---------|
| 起色 | `#00B4D8` (中蓝) | `#023e8a` (深夜蓝) |
| 终色 | `#0077B6` (深蓝) | `#03045e` (更深) |
| 强调色 | `#52B788` (点缀绿) | `#74c69d` (亮绿) |
| 文字色 | `#ffffff` | `#caf0f8` |
| 副文字 | `rgba(255,255,255,0.85)` | `rgba(202,240,248,0.85)` |

#### C.1.2 CSS 变量新增

**追加到 `frontend/src/global.css` 的 `:root` 块**：

```css
:root {
  /* ... 现有变量 ... */

  /* 夏季主题色 */
  --color-summer-light: #CAF0F8;
  --color-summer-mid: #00B4D8;
  --color-summer-deep: #0077B6;
  --color-summer-accent: #52B788;
  --color-summer-soft: #e6f7fb;

  /* 动画 Token */
  --ease-out-soft: cubic-bezier(0.21, 1.02, 0.73, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 0.2s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;

  /* Hero 渐变 */
  --hero-gradient: linear-gradient(135deg, #00B4D8 0%, #0077B6 50%, #52B788 100%);
  --hero-gradient-soft: linear-gradient(180deg, rgba(202, 240, 248, 0) 0%, rgba(0, 119, 182, 0.08) 100%);
}

/* 暗色模式补充 */
body.dark {
  /* ... 现有变量 ... */
  --color-summer-light: rgba(0, 180, 216, 0.18);
  --color-summer-mid: #48cae4;
  --color-summer-deep: #023e8a;
  --color-summer-accent: #74c69d;
  --color-summer-soft: #1a2a3a;
  --hero-gradient: linear-gradient(135deg, #023e8a 0%, #03045e 60%, #0077B6 100%);
}
```

#### C.1.3 Hero 组件 CSS 改造

**位置**：`frontend/src/components/Hero.css` 或首页对应文件

```css
/* ===== 首页 Hero — 夏季清爽蓝绿 ===== */
.home-hero {
  position: relative;
  min-height: 320px;
  padding: 48px 24px 56px;
  background: var(--hero-gradient);
  color: #fff;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 119, 182, 0.15);
  margin: 16px;
}

.home-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(82, 183, 136, 0.3) 0%, transparent 50%);
  pointer-events: none;
}

.home-hero::after {
  content: '';
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  height: 40px;
  background: var(--hero-gradient-soft);
  pointer-events: none;
}

.home-hero__title {
  position: relative;
  z-index: 1;
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.home-hero__subtitle {
  position: relative;
  z-index: 1;
  font-size: 16px;
  opacity: 0.92;
  margin: 0 0 24px;
  max-width: 480px;
}

.home-hero__cta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  color: var(--color-summer-deep);
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: transform var(--duration-fast) var(--ease-out-soft),
              box-shadow var(--duration-fast) var(--ease-out-soft);
}

.home-hero__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.home-hero__cta:active {
  transform: scale(0.97);
}

/* 装饰元素 — 夏日气泡 */
.home-hero__bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.home-hero__bubble--1 {
  width: 80px; height: 80px;
  top: 20px; right: 30px;
  animation: float 6s ease-in-out infinite;
}

.home-hero__bubble--2 {
  width: 50px; height: 50px;
  top: 80px; right: 100px;
  animation: float 8s ease-in-out infinite 1s;
}

.home-hero__bubble--3 {
  width: 30px; height: 30px;
  top: 200px; right: 60px;
  background: rgba(82, 183, 136, 0.4);
  animation: float 5s ease-in-out infinite 0.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(8deg); }
}

/* 季节性角标 */
.home-hero__season-badge {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* 暗色模式 */
body.dark .home-hero {
  box-shadow: 0 4px 20px rgba(2, 62, 138, 0.4);
}

body.dark .home-hero__title {
  color: var(--color-summer-light);
}

body.dark .home-hero__cta {
  background: var(--color-summer-light);
  color: var(--color-summer-deep);
}

@media (prefers-reduced-motion: reduce) {
  .home-hero__bubble {
    animation: none !important;
  }
}

@media (max-width: 768px) {
  .home-hero {
    margin: 8px;
    padding: 32px 16px 40px;
    min-height: 240px;
  }
  .home-hero__title { font-size: 24px; }
}
```

### C.2 时令食材推荐区

#### C.2.1 设计目标

- 卡片样式优化：圆角更大（`--radius-lg`）、背景用 `--color-summer-soft`、季节性 emoji 角标
- 移动端 2 列 / 桌面端 3-4 列
- 卡片入场用 `.list-stagger` 自动 stagger

#### C.2.2 CSS

**追加到 `frontend/src/components/SeasonalSection.css`**：

```css
/* ===== 时令食材推荐区 ===== */
.seasonal-section {
  padding: 24px 16px;
  margin: 0;
}

.seasonal-section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
}

.seasonal-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.seasonal-section__title-icon {
  font-size: 24px;
}

.seasonal-section__subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.seasonal-section__more {
  font-size: 14px;
  color: var(--color-summer-mid);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--duration-fast) var(--ease-out-soft);
}

.seasonal-section__more:hover {
  color: var(--color-summer-deep);
}

/* 网格布局 */
.seasonal-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 769px) {
  .seasonal-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .seasonal-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 时令卡片 */
.season-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-out-soft),
              box-shadow var(--duration-normal) var(--ease-out-soft),
              border-color var(--duration-normal) var(--ease-out-soft);
}

.season-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-summer-mid), var(--color-summer-accent));
  opacity: 0.8;
}

@media (hover: hover) {
  .season-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 119, 182, 0.15);
    border-color: var(--color-summer-mid);
  }
}

body.dark .season-card:hover {
  box-shadow: 0 8px 24px rgba(72, 202, 228, 0.25);
  border-color: var(--color-summer-mid);
}

/* 季节性 Emoji 角标 */
.season-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 28px;
  background: var(--color-summer-soft);
  border-radius: 50%;
  margin-bottom: 12px;
}

body.dark .season-card__icon {
  background: rgba(0, 180, 216, 0.15);
}

/* 季节标签 */
.season-card__tag {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-summer-deep);
  background: var(--color-summer-soft);
  border-radius: 12px;
}

body.dark .season-card__tag {
  color: var(--color-summer-light);
  background: rgba(0, 180, 216, 0.18);
}

.season-card__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 4px;
}

.season-card__desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.season-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  font-size: 12px;
  color: var(--color-text-muted);
}

.season-card__meta-icon {
  color: var(--color-summer-accent);
}

/* 季节变体 — 在季节切换时使用 */
.season-card--summer {
  background: linear-gradient(135deg, var(--color-card) 0%, var(--color-summer-soft) 100%);
}

.season-card--summer::before {
  background: linear-gradient(90deg, var(--color-summer-mid), var(--color-summer-accent));
}
```

#### C.2.3 使用示例

```jsx
<section className="seasonal-section">
  <div className="seasonal-section__header">
    <h2 className="seasonal-section__title">
      <span className="seasonal-section__title-icon">☀️</span>
      夏日时令食材
    </h2>
    <a href="/recipes?season=summer" className="seasonal-section__more">查看更多 →</a>
  </div>

  <div className="seasonal-grid list-stagger">
    {summerIngredients.map((item) => (
      <a key={item.id} href={`/recipes?ingredient=${item.slug}`} className="season-card season-card--summer">
        <span className="season-card__icon">{item.emoji}</span>
        <span className="season-card__tag">☀️ 当季</span>
        <h3 className="season-card__name">{item.name}</h3>
        <p className="season-card__desc">{item.description}</p>
        <div className="season-card__meta">
          <span className="season-card__meta-icon">📅</span>
          <span>{item.seasonMonths}</span>
          <span>·</span>
          <span>{item.recipeCount} 道食谱</span>
        </div>
      </a>
    ))}
  </div>
</section>
```

### C.3 首页"夏"季标识统一

将首页所有出现的"🥗 厨房" 标识替换为夏季主题：

| 位置 | 原色 | 新色 |
|------|------|------|
| Logo 主色（季节性） | `--color-primary` 暖橙 | `--color-summer-mid` 蓝 |
| 顶部 Navbar 高亮 | 橙 | 蓝 |
| 关键 CTA 按钮 | 橙 | 蓝（保留重要警告按钮用橙） |

**注意**：不要全局替换为蓝色，会破坏品牌一致性。**仅首页 + 时令区** 切换到夏季主题，其他页面维持原暖橙。

---

## 5. 响应式断点总览

| 断点 | 范围 | 关键变化 |
|------|------|---------|
| **Mobile** | `≤ 480px` | 单列卡片、Hero 缩小、BottomNav 4 Tab |
| **Tablet / Mobile-L** | `481 ~ 768px` | 2 列卡片、BottomNav 显示、Hero 中等 |
| **Desktop** | `769 ~ 1023px` | 3 列卡片、BottomNav 隐藏、Navbar 显示 |
| **Desktop-L** | `≥ 1024px` | 4 列卡片、最大宽度 1200px 居中 |

**媒体查询组织**（推荐用 `mobile-first`）：

```css
/* Mobile first — 默认 */
.component { /* mobile styles */ }

@media (min-width: 481px) { /* tablet up */ }
@media (min-width: 769px) { /* desktop up */ }
@media (max-width: 768px) { /* 仅 mobile — 用于 BottomNav */ }
@media (max-width: 480px) { /* 仅小屏 mobile */ }
```

**iOS Safe Area 适配**（关键点）：

```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(60px + env(safe-area-inset-bottom, 0px));
}
```

---

## 6. 暗色模式统一对照表

| 元素 | 浅色 | 暗色 |
|------|------|------|
| BottomNav 背景 | `var(--color-card)` + 92% 透明 | `var(--color-card)` + 88% 透明 |
| BottomNav 激活色 | `var(--color-summer-mid)` | `var(--color-summer-mid)`（更亮） |
| BottomNav FAB 阴影 | `rgba(0,119,182,0.4)` | `rgba(72,202,228,0.35)` |
| 按钮 Hover 阴影 | `var(--shadow-md)` (0.08) | `var(--shadow-md)` (0.4) |
| 卡片 Hover 阴影 | `rgba(0,0,0,0.12)` | `rgba(0,0,0,0.5)` |
| Hero 渐变起色 | `#00B4D8` | `#023e8a` |
| Hero 渐变终色 | `#0077B6` | `#03045e` |
| Hero CTA 背景 | `#ffffff` | `var(--color-summer-light)` |
| Hero 装饰气泡 | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.08)` |
| 季节卡片浅底 | `var(--color-summer-soft)` | `rgba(0,180,216,0.15)` |
| 季节标签 bg | `var(--color-summer-soft)` | `rgba(0,180,216,0.18)` |
| 季节标签 text | `var(--color-summer-deep)` | `var(--color-summer-light)` |

**所有颜色均通过 CSS 变量引用**，无需重复硬编码。变量定义集中在 `:root` 和 `body.dark` 两个块。

---

## 7. 性能与降级策略

### 7.1 性能约束

| 优化点 | 策略 |
|--------|------|
| **避免 layout thrashing** | 视差用 `transform: translate3d`（GPU 合成层），不触发布局 |
| **rAF 节流** | scroll 监听用 `requestAnimationFrame`，避免高频重计算 |
| **will-change 谨慎使用** | 仅在 hover/float 元素上加，离开视口后移除 |
| **动画属性选择** | 优先 `transform / opacity`（合成层），避免 `box-shadow / background-position`（触发重绘） |
| **IntersectionObserver** | 替代 scroll 事件，性能开销 < 1ms/次 |
| **passive listeners** | scroll/touch 事件加 `{ passive: true }` |
| **backdrop-filter 限制** | BottomNav 使用，避免大范围（避免 iOS Safari 卡顿） |

### 7.2 降级策略

| 特性 | 降级方案 |
|------|---------|
| `IntersectionObserver` 不支持 | 立即添加 `.is-visible`，所有 stagger 项直接显示 |
| CSS `view-timeline` 不支持 | JS scroll 监听 + `transform: translate3d` 模拟视差 |
| `backdrop-filter` 不支持 | 使用不透明背景色（`var(--color-card)` 100%） |
| `prefers-reduced-motion: reduce` | 禁用所有非必要动画（hover translate、float、stagger） |
| `hover: none`（触屏） | hover 效果不触发，仅 `:active` 按压反馈 |
| 移动端（`max-width: 768px`） | 视差降级为静态、stagger 间隔缩短为 30ms |

### 7.3 兼容性

| 浏览器 | 最低支持 |
|--------|---------|
| Chrome / Edge | 90+（view-timeline 需 115+，否则 JS 降级） |
| Safari | 14+（iOS 14+ 支持 safe-area-inset） |
| Firefox | 88+（不支持 view-timeline，走 JS 降级） |

---

## 8. 实施 Checklist

### 8.1 文件改动清单

| 文件 | 改动类型 | 内容 |
|------|---------|------|
| `frontend/src/global.css` | 修改 | 新增 Summer 配色变量、动画 token、BottomNav CSS、按钮/卡片微交互、stagger 关键帧、视差 CSS |
| `frontend/src/App.tsx` | 修改 | 引入 `useStaggerReveal`、`useParallax` Hook，添加 `<BottomNav />` 组件 |
| `frontend/src/components/BottomNav.tsx` | 新建 | 4 Tab 底部导航组件 |
| `frontend/src/components/BottomNav.css` | 新建 | （或合并到 global.css） |
| `frontend/src/hooks/useStaggerReveal.ts` | 新建 | IntersectionObserver 触发器 |
| `frontend/src/hooks/useParallax.ts` | 新建 | 视差降级（仅不支持 view-timeline 时启用） |
| `frontend/src/components/Hero.css` | 修改 | 首页 Hero 改为夏季蓝绿渐变 + 装饰气泡 |
| `frontend/src/components/SeasonalSection.css` | 新建/修改 | 时令食材卡片样式 |
| `frontend/src/pages/HomePage.tsx` | 修改 | 给时令食材列表加 `.list-stagger` 类，季节性角标 |
| `frontend/src/styles/index.css`（如存在） | 检查 | 不与现有变量冲突 |

### 8.2 验证步骤

1. **桌面端 Chrome** (≥ 1024px)
   - [ ] BottomNav 完全隐藏
   - [ ] 顶部 Navbar 正常
   - [ ] 按钮 hover 有 translateY + 阴影
   - [ ] 卡片 hover 抬升
   - [ ] Hero 视差正常（view-timeline 路径）
   - [ ] 时令卡片 stagger 动画播放
   - [ ] 暗色模式所有元素颜色正确

2. **桌面端 Firefox**
   - [ ] 视差走 JS 降级，滚动流畅
   - [ ] 其他同上

3. **iOS Safari** (iPhone 13+)
   - [ ] BottomNav 显示，Home Indicator 不被遮挡
   - [ ] safe-area-inset 生效
   - [ ] 视差降级为静态
   - [ ] backdrop-filter 模糊生效

4. **Android Chrome**
   - [ ] BottomNav 显示
   - [ ] FAB 创建按钮点击区域 ≥ 44px（Material 规范）
   - [ ] 视差降级

5. **暗色模式切换**
   - [ ] 所有新增元素颜色切换平滑
   - [ ] Hero 渐变暗色版正确
   - [ ] 卡片 Hover 阴影暗色版正确

6. **可访问性 (a11y)**
   - [ ] BottomNav 使用 `<nav>` + `aria-label`
   - [ ] 激活态有 `aria-current="page"`（NavLink 自动）
   - [ ] 装饰图标 `aria-hidden="true"`
   - [ ] `prefers-reduced-motion: reduce` 禁用动画
   - [ ] 键盘 Tab 顺序合理

7. **性能**
   - [ ] DevTools Performance 面板录制 5 秒滚动，FPS ≥ 50
   - [ ] 移动端模拟（Slow 4G + 4× CPU throttle）流畅
   - [ ] 无 layout thrashing 警告

### 8.3 回归测试重点

- [ ] 现有页面布局不被打乱（padding-bottom 适配正确）
- [ ] 现有 Navbar 与 BottomNav 不冲突
- [ ] 暗色模式切换无闪烁
- [ ] 路由切换激活态正确高亮
- [ ] 创建页面（`/create`）FAB 按钮激活态正确

---

## 附录 A：完整 CSS 变量总表（夏季主题扩展后）

```css
:root {
  /* 原有变量 ... */

  /* === 夏季主题 === */
  --color-summer-light: #CAF0F8;
  --color-summer-mid: #00B4D8;
  --color-summer-deep: #0077B6;
  --color-summer-accent: #52B788;
  --color-summer-soft: #e6f7fb;

  /* === 动画 === */
  --ease-out-soft: cubic-bezier(0.21, 1.02, 0.73, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 0.2s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;

  /* === Hero 渐变 === */
  --hero-gradient: linear-gradient(135deg, #00B4D8 0%, #0077B6 50%, #52B788 100%);
  --hero-gradient-soft: linear-gradient(180deg, rgba(202, 240, 248, 0) 0%, rgba(0, 119, 182, 0.08) 100%);
}

body.dark {
  /* 原有暗色变量 ... */

  --color-summer-light: rgba(0, 180, 216, 0.18);
  --color-summer-mid: #48cae4;
  --color-summer-deep: #023e8a;
  --color-summer-accent: #74c69d;
  --color-summer-soft: #1a2a3a;
  --hero-gradient: linear-gradient(135deg, #023e8a 0%, #03045e 60%, #0077B6 100%);
}
```

---

## 附录 B：可访问性增强（Bonus）

为 BottomNav 添加键盘焦点样式：

```css
.bottom-nav__item:focus-visible {
  outline: 2px solid var(--color-summer-mid);
  outline-offset: -2px;
  border-radius: 8px;
}
```

为视差区域提供静态降级提示（屏幕阅读器）：

```jsx
<div className="hero-parallax" role="banner" aria-label="夏日清爽食谱专题">
  <div className="hero-parallax__bg" aria-hidden="true" />
  <div className="hero-parallax__content">
    {/* 文字内容——屏幕阅读器只读这部分 */}
  </div>
</div>
```

---

## 附录 C：iOS PWA 特殊处理

如项目作为 PWA 安装到 iOS 主屏，BottomNav 需要处理 `viewport-fit=cover`：

**`index.html` 修改**：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

**CSS 中追加**（iOS PWA 模式无 URL 栏，但仍有 Home Indicator）：

```css
@supports (padding: max(0px)) {
  .bottom-nav {
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);
  }
}
```

---

**文档版本**：v1.0
**最后更新**：2026-06-09
**作者**：ui-designer (subagent)
**关联迭代**：iter112-ui-ux
