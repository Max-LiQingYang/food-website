# Story — T-2026-0612-001

> 图片懒加载 + RecipeCard 卡片骨架屏 shimmer 动画打磨
> 任务 ID: T-2026-0612-001
> 编写角色: product
> 编写时间: 2026-06-12 11:42 GMT+8
> main HEAD: `22a8304 docs: iter#135 部署报告`
> 部署: http://39.103.68.205/

---

## 1. 用户故事

**As a** 移动端 / 弱网用户（在 3G/4G 边缘、地铁、电梯场景下访问 food-website 的访客）
**I want** 首屏以下、视口以外的图片不要抢首屏的 HTTP 连接和带宽；卡片在图片加载完成前用一个会动的占位骨架过渡，而不是空白或生硬闪烁
**So that** 首屏 LCP 时间下降、可交互时间（TTI）提前；在 3G 模拟下首屏图片请求数从「全量并发」降到「视口内少量」，且用户不会看到「白卡 → 图片」这种跳变

---

## 2. 验收标准 AC（每条可测）

| # | 类型 | 验收点 | 测量方式 |
|---|------|--------|----------|
| AC-1 | 静态扫描 | 全站 54 个 `<img>` 中，**非模态/非首屏关键** 的图片 100% 带 `loading="lazy"` 属性。允许例外（见 AC-2） | `grep -rn "<img" frontend/src/components/ \| grep -v "loading=\"lazy\""` 输出仅包含白名单条目 |
| AC-2 | 白名单 | 以下 3 类图**不**加 `loading="lazy"`，必须保持 `eager`：<br>① `frontend/src/components/recipe/QuickPreviewModal.tsx:137`（模态打开后用户**已经看到**的封面，lazy 会导致开模态瞬间空白）<br>② `frontend/src/components/ImageLightbox.tsx:41`（Lightbox 已经打开，`currentIndex` 那张就是用户当前看的图，懒加载会让翻页/打开瞬间空白）<br>③ `frontend/src/components/HeroSection.tsx:133` 候选首屏 LCP 图（待 dev 实测确认是否在视口） | 代码 review，PR 注释中显式列出这 3 处例外 |
| AC-3 | 行级定位 | 以下 8 个组件的 `<img>` 元素加 `loading="lazy"`，并保留原 `alt` / `className` / `onError`：<br>• `frontend/src/components/CookingJournalPhotoPicker.tsx:153`（已上传照片缩略图，列表可能很长）<br>• `frontend/src/components/CookingJournalPhotoPicker.tsx:172`（上传中预览，瞬时存在）<br>• `frontend/src/components/PersonalizedDailyPick.tsx:70`（每日推荐封面，**非首屏**）<br>• `frontend/src/components/PersonalizedDailyPick.tsx:228`（个性化推荐卡片封面，**非首屏**）<br>• `frontend/src/components/CollectionComments.tsx:127`（评论者头像，列表底部，弱网时尤其需要 lazy） | git diff 精确到行号 |
| AC-4 | 任务书勘误 | 任务书提到「全站 54 个 `<img>`，43 个无 lazy」以及「`RatingTopList.tsx:47`、`RatingHistoryList.tsx:89`、`ImagePlaceholder.tsx:74` 无 lazy」——**经 product 实测，这 3 处已经有 `loading="lazy"`**，任务书数字是过时的。dev 实施时以实测为准 | `sed -n '47p' RatingTopList.tsx` 输出含 `loading="lazy"`；`ImagePlaceholder.tsx:74` 输出含 `loading="lazy"` |
| AC-5 | RecipeCard 闭环 | `frontend/src/components/RecipeCard.tsx:280-285` 使用的是 `<ImagePlaceholder>` 组件，而 `ImagePlaceholder.tsx:74` **已经传 `loading="lazy"`**。因此 RecipeCard 实际**已经**具备懒加载能力，本次**不需要**给 RecipeCard 单独加 lazy。但任务书"未加 lazy"的说法是错的 | 跑一次 RecipeCard 渲染快照，DevTools Network 面板在 `IntersectionObserver` 触发前**不**应看到 cover 图片请求 |
| AC-6 | Shimmer 动画 | `frontend/src/components/RecipeCardSkeleton.css`（24 行）增加 `@keyframes shimmer` 与 `.shimmer` 类，参考 `frontend/src/components/FeaturedSection.css:77-92` 已有的实现。`<Skeleton>` 子组件（`frontend/src/components/Skeleton.tsx`，24 行）需被改造成：默认带 `shimmer` className，或新增 `animated` prop | `grep -n "shimmer" RecipeCardSkeleton.css` 输出 ≥3 行；浏览器录屏可见背景渐变扫光 |
| AC-7 | 性能基线 | 在部署地址 `http://39.103.68.205/` 跑 Lighthouse mobile（Slow 4G / 4× CPU throttle）：<br>• LCP 改善目标：首页 `LCP ≤ 3.0s`（当前无基线，记录 before/after）<br>• 首屏图片请求数：scroll 到第 3 屏前，Network 面板的图片请求数 ≤ 12（首页 PAGE_SIZE=12，见 `frontend/src/pages/HomePage.tsx:20`）<br>• 滚动测试：清空缓存后只滚到第 1 屏，DevTools Network 看到的图片请求数等于首屏可见卡片数 | Lighthouse JSON 报告归档到 `docs/perf/iter-136/` |
| AC-8 | 回归 | `frontend/src/components/ImageLightbox.tsx:41` 加注释 `// 显式 eager：当前已展示图，lazy 会导致打开瞬间空白`；`QuickPreviewModal.tsx:137` 同 | 代码 review 看到注释 |

---

## 3. 数据支撑

### 3.1 首屏图片并发数

- 全站食谱总量：94 道（来源：用户原话；后端 `GET /api/recipes` 默认 `pageSize=20`，前端 `HomePage.tsx:20` 用 `PAGE_SIZE=12`）
- **首屏可见卡片 = 12 张**（按 PAGE_SIZE），每张 1 张封面图 → 首屏图片请求 = 12
- 当前实现（任务书 claim）：54 个 `<img>` 全部在 `DOMContentLoaded` 后立即发起请求，包括首屏外
- 加 lazy 后预期：滚动触达视口时才发起请求（Chrome `IntersectionObserver` 阈值 = 0px，提前 1.25× 视口高度预取）

### 3.2 移动端 3G 场景

- Chrome DevTools Slow 3G：下行 400 kbps，延迟 400ms
- 一张食谱封面典型尺寸 ~150 KB（WebP 估算，假设后端未做响应式 srcset）
- 12 张图并发 = 1.8 MB 总请求量 → 3G 下 36 秒串行，**所有并发竞争**同一个 6 连接限制
- 加 lazy 后：首屏可见 3-4 张在视口顶部并发；其余 8-9 张等用户滚动再请求，**HTTP 连接从 12 降到 4**

### 3.3 Lighthouse 评分预期

| 指标 | 当前（无 lazy） | 预期（加 lazy） | 备注 |
|------|----------------|----------------|------|
| LCP | ~4.5s（推测，3G 模拟） | ≤ 3.0s | 首屏 LCP 元素 = 首页最大封面，lazy 不影响首屏 LCP 本身，但**避免后续图片抢占带宽** |
| TBT | 高 | 略降 | 图片 decode 不再阻塞主线程 |
| Performance Score | 待实测 | +5~10 分（保守） | 受 Web Vitals 三项综合影响 |

> 注意：lazy **不直接**改善 LCP 元素本身的加载时间，但能**避免其他图片挤占首屏资源**，所以 LCP 是间接受益。量化需 before/after 对比。

### 3.4 shimmer 动画收益

- 当前：`RecipeCardSkeleton` 是静态灰色块，loading 期间用户体感"卡了"
- 加 shimmer 后：渐变扫光（`background-position: 200% 0 → -200% 0`，1.5s 循环，参考 `FeaturedSection.css:88-91`）给用户**正在加载**的视觉反馈
- 实施成本：< 10 行 CSS，复用 FeaturedSection 已有动画

---

## 4. 风险

### R-1：模态/全屏图 lazy 导致空白闪烁（**关键**）

- `QuickPreviewModal.tsx:137`：模态打开时 `recipe.coverImage` 必须立即渲染。加 `loading="lazy"` 会让浏览器延迟到图片进入 IntersectionObserver 队列才请求，但模态在 `createPortal` 挂载到 body 时**已经**在视口里了——这看似 OK，**但是**：
  - Chrome 的 lazy 实现对刚进入 DOM 的元素有 1 帧左右的"冷却期"，期间可能不立即 fetch
  - 用户从卡片缩略图（小图）→ 模态大图的瞬间，大图 lazy 会让用户看到**白底 + 大图慢慢淡入**
- **对策**：保持 `loading="eager"` 或省略 lazy（默认就是 eager），加注释说明

### R-2：ImageLightbox 已显示图 lazy

- `ImageLightbox.tsx:41`：组件挂载时 `currentIndex` 已经是用户**正在看**的图，图片必须立即显示
- 切到下一张（`onNext`）时 `currentIndex` 变化，src 变化——这不属于 lazy 行为（lazy 只看 src 是否首次出现）但仍然有"切下一张时旧图还在、新图 lazy 中"的瞬时空白
- **对策**：保持 eager；如需优化"切下一张时下一张提前加载"，那是 `preload` + 1-step lookahead 的问题，**不在本任务范围**

### R-3：用户头像 lazy 可能破坏 SEO 抓取（低风险）

- `CollectionComments.tsx:127` 的头像加 lazy 后，Googlebot（Chrome 41+）支持 lazy，**不影响 SEO**
- 真正的 SSR/爬虫场景下，food-website 是纯 CSR（Vite + React，无 SSR），SEO 本来就靠 OG meta，**不依赖** img lazy 行为

### R-4：CookingJournalPhotoPicker 内的"上传中预览"加 lazy 的语义

- `CookingJournalPhotoPicker.tsx:172` 是 `item.preview`（用户本地上传后 `URL.createObjectURL` 生成的 blob URL）
- blob URL **不受网络限制**，lazy 不会节省带宽，但**也不会有害**——只是 IntersectionObserver 仍要等元素进入视口
- 折中：保留 lazy（与任务书一致），加注释说明这是 blob URL

### R-5：HeroSection 是否在视口

- `HeroSection.tsx:133` 在首屏可见，但任务书没列在 11 个组件里
- **处理**：dev 实施时确认；若在视口，加 `loading="eager"` 保持 LCP

---

## 5. 范围外确认（Out of Scope 复述）

以下事项**明确不在本任务范围**：

1. **不动后端** —— 不改 API、不改图片代理、不引入响应式 srcset、不调整图片 CDN
2. **不重构 RecipeCard 逻辑** —— RecipeCard 本身已经通过 `ImagePlaceholder` 拿到 lazy，**不需要**触碰 RecipeCard.tsx 的 props/state/hooks
3. **不改 CSS 变量** —— 不动 `var(--color-*)`、`var(--radius-*)` 等 token；新加的 shimmer 动画用**字面值**颜色（参考 `FeaturedSection.css:77-92` 用 `#eee/#f5f5f5/#333/#444` 的做法）
4. **不动其他不相关组件** —— 只触碰本文件列出的 8 个文件：
   - `CookingJournalPhotoPicker.tsx`（2 处）
   - `PersonalizedDailyPick.tsx`（2 处）
   - `CollectionComments.tsx`（1 处）
   - `ImagePlaceholder.tsx`（如果内部 `<img>` 还需要调整——但实测它已经有 lazy，所以**可能不需要动**）
   - `RecipeCardSkeleton.tsx`（可能需要给 `<Skeleton>` 传 `animated` prop）
   - `RecipeCardSkeleton.css`（加 shimmer keyframes）

---

## 附录 A：任务书勘误表

| 任务书说 | 实测 | 处理 |
|----------|------|------|
| "全站 54 个 `<img>`，43 个无 lazy" | 实际数字需 dev 跑 `grep -c "<img" frontend/src/components/**/*.tsx` 全量再核 | AC-1 规定 dev 重测 |
| "RatingTopList.tsx:47 无 lazy" | `sed -n '47p' RatingTopList.tsx` 显示已有 `loading="lazy"` | 勘误，**不动** |
| "RatingHistoryList.tsx:89 无 lazy" | 已有 `loading="lazy"` | 勘误，**不动** |
| "ImagePlaceholder.tsx:74 无 lazy" | 已有 `loading="lazy"` | 勘误，**不动** |
| "RecipeCard.tsx 已有 onLoad 但未加 lazy" | RecipeCard 用 `<ImagePlaceholder>`，内部已经有 lazy | 勘误，**不动** |
| "RecipeCardSkeleton.css 24 行无 shimmer" | 确认无 shimmer | **需要补**（AC-6） |

---

## 附录 B：dev 实施顺序建议

1. 跑 `grep -rn "<img" frontend/src/components/ | grep -v "loading=\"lazy\""` 拿到最新的"缺 lazy"清单
2. 对照本 story AC-3 清单逐个加 `loading="lazy"`，每改一处截图前后对比
3. AC-2 的 3 个例外加注释
4. 给 `RecipeCardSkeleton.css` 加 `@keyframes shimmer`（从 `FeaturedSection.css:86-92` 复制即可）
5. 检查 `Skeleton.tsx` 组件：是否需要给所有 `<Skeleton>` 实例默认带 `shimmer` className？
6. 部署后跑 Lighthouse mobile，存档 `docs/perf/iter-136/`

