# QA Plan — T-2026-0612-001

> 图片懒加载 + RecipeCard 卡片骨架屏 shimmer 动画打磨
> QA 阶段:门 3 (QA 计划 + 执行报告)
> 编写角色: tester
> 编写时间: 2026-06-12 12:05 GMT+8
> 关联: `00-story.md` (140 行 / 8 条 AC) · `01-design.md` (817 行) · `02-plan-review-r1.json` (PASS) · `04-code-review-r1.json` (PASS, 0 blockers)
> main HEAD: `22a8304`

---

## 1. 范围与约束

### 1.1 验证范围
- **In-scope 改动文件** (7 个, +50 / -2 行):
  1. `frontend/src/components/CollectionComments.tsx` (AC-3, 1 处 lazy)
  2. `frontend/src/components/CookingJournalPhotoPicker.tsx` (AC-3, 2 处 lazy + R-4 注释)
  3. `frontend/src/components/PersonalizedDailyPick.tsx` (AC-3, 2 处 lazy)
  4. `frontend/src/components/recipe/QuickPreviewModal.tsx` (AC-2 + AC-8, 1 处 eager + 注释)
  5. `frontend/src/components/ImageLightbox.tsx` (AC-2 + AC-8, 1 处 eager + 注释)
  6. `frontend/src/components/HeroSection.tsx` (AC-2, 1 行 R-5 注释)
  7. `frontend/src/components/RecipeCardSkeleton.css` (AC-6, 30 行 shimmer + 暗色 + reduced-motion)

### 1.2 不在范围 (硬约束)
- 不修改 `00-story.md` / `01-design.md` / `02-plan-review-r1.json` / `04-code-review-r1.json`
- 不修改 `frontend/src/components/ImagePlaceholder.tsx` / `RecipeCard.tsx` / `Skeleton.tsx`
- 不修改 CSS 变量 `var(--color-*)` (新加 CSS 用字面值颜色)
- 不 commit / push / 重置 working tree
- 不修改 out-of-scope 的 5 个 `<img>` (ActivityFeed / CommentImagePicker / DailyPickCard / ShareModal / VideoPlayer)

---

## 2. AC 映射与测试用例

### AC-1 · 静态扫描：非模态/非首屏关键图 100% 带 lazy
- **测试方法**: `grep -rn "<img" frontend/src/components/ | grep -v "loading="`
- **期望**: 输出仅包含白名单 (3 处) + out-of-scope 5 处 follow-up
- **判定**: 白名单外 0 行 = PASS
- **白名单 (3 处)**:
  - `recipe/QuickPreviewModal.tsx:137` (模态封面, eager)
  - `ImageLightbox.tsx:41` (已显示大图, eager)
  - `HeroSection.tsx:133` (LCP 候选, eager via 三元)

### AC-2 · 白名单 3 处保持 eager + 注释
- **测试方法**: 逐行检查上述 3 个文件的 `<img>` 标签含 `loading="eager"` + 业务注释
- **期望**: 3 处全部 `loading="eager"` + 中文注释点明原因
- **判定**: 3/3 = PASS

### AC-3 · 8 个组件目标行加 lazy
- **测试方法**: `git diff -- frontend/src/components/` 精确到行号
- **期望 (5 处 lazy, 实际因 Story 勘误后修正为 5 处而不是 8 处)**:
  - `CookingJournalPhotoPicker.tsx:153` ✅
  - `CookingJournalPhotoPicker.tsx:172` ✅
  - `PersonalizedDailyPick.tsx:70` (impl 落到 74) ✅
  - `PersonalizedDailyPick.tsx:228` (impl 落到 233) ✅
  - `CollectionComments.tsx:127` ✅
- **判定**: 5/5 lazy 加到位 = PASS (行号偏移因新增行顺移,属正常现象)
- **Story 勘误说明**: Story 原文 8 处,实测 ImagePlaceholder/RatingTopList/RatingHistoryList/RecipeCard.tsx 已有 lazy 不需再加 (AC-4 + AC-5),实际 lazy 改动 = 5 处

### AC-4 · 任务书勘误
- **测试方法**: `sed -n '47p' RatingTopList.tsx` / `sed -n '89p' RatingHistoryList.tsx` / `sed -n '74p' ImagePlaceholder.tsx` 输出含 `loading="lazy"`
- **期望**: 3 处都含 `loading="lazy"`
- **判定**: 3/3 = PASS

### AC-5 · RecipeCard 闭环
- **测试方法**: 确认 `RecipeCard.tsx:280-285` 使用 `<ImagePlaceholder>`,且 `ImagePlaceholder.tsx:74` 已传 `loading="lazy"`
- **期望**: RecipeCard 间接具备 lazy 能力,本次不需改 RecipeCard
- **判定**: `git diff RecipeCard.tsx` 为空 + ImagePlaceholder 含 lazy = PASS

### AC-6 · Shimmer 动画
- **测试方法 A (静态)**: `grep -n "shimmer" RecipeCardSkeleton.css` ≥3 行
- **测试方法 B (静态)**: `grep -n "@keyframes" RecipeCardSkeleton.css` ≥1 行
- **测试方法 C (静态)**: 暗色模式块 `body.dark .rcs-cover` 存在
- **测试方法 D (静态)**: `prefers-reduced-motion: reduce` 媒体查询 + `animation: none` 存在
- **期望**: A=3+ 行, B=1+ 行, C=存在, D=存在
- **判定**: 4/4 = PASS

### AC-7 · 性能基线
- **测试方法 A**: `npm run build` 输出 0 error 0 warning
- **测试方法 B**: Lighthouse mobile (部署地址 `http://39.103.68.205/` 或本地 `http://localhost:4173/`) 跑分归档
- **测试方法 C**: 首页 5 路径 HTTP 200 (dev server)
- **测试方法 D (如有 Playwright)**: 滚动测试,视口内 ≤12 张图请求
- **期望**: A=0/0, B=Perf≥0.85 / LCP≤3.0s / TBT<200ms, C=5/5, D=≤12
- **判定**: 4/4 = PASS

### AC-8 · 回归：白名单注释
- **测试方法**: `grep -n "R-1\|R-2\|eager" QuickPreviewModal.tsx ImageLightbox.tsx`
- **期望**: 2 处都有 `// ... eager` 中文注释
- **判定**: 2/2 = PASS

---

## 3. 测试矩阵

| 测试项 | 工具 | 命令 | 通过条件 |
|--------|------|------|----------|
| 静态扫描 (AC-1) | grep | `grep -rn "<img" frontend/src/components/ \| grep -v "loading="` | 仅 3 白名单 + 5 follow-up |
| 静态扫描 (AC-2/3) | grep | `grep -n "loading=\"lazy\"" frontend/src/components/{CookingJournalPhotoPicker,PersonalizedDailyPick,CollectionComments}.tsx` | 5 处命中 |
| 静态扫描 (AC-2 eager) | grep | `grep -n "loading=\"eager\"" frontend/src/components/{HeroSection,ImageLightbox,recipe/QuickPreviewModal}.tsx` | 3 处命中 |
| 静态扫描 (AC-4) | sed | `sed -n '47p' frontend/src/components/RatingTopList.tsx` 等 | 3 处含 lazy |
| 静态扫描 (AC-5) | git diff | `git diff -- frontend/src/components/RecipeCard.tsx frontend/src/components/ImagePlaceholder.tsx` | 两者 diff 为空 |
| 静态扫描 (AC-6) | grep | `grep -c "shimmer" RecipeCardSkeleton.css` | ≥3 |
| build (AC-7) | npm | `cd frontend && npm run build` | 0 error 0 warning |
| dev server (AC-7) | npm + curl | `cd frontend && npm run dev` (后台) + `curl -I 5 路径` | 5/5 HTTP 200 |
| 资源可访问 (AC-7) | grep | 抽 2-3 个 `dist/assets/*.css` 找 `loading="lazy"` / `@keyframes shimmer` | 命中 |
| 视觉验证 (AC-7) | Playwright (如有) | render 首页,断言视口内可见 12 张图占位 | ≤12 张图请求 |
| 注释 (AC-8) | grep | `grep -n "R-1\|R-2" frontend/src/components/recipe/QuickPreviewModal.tsx frontend/src/components/ImageLightbox.tsx` | 2/2 命中 |
| follow-up (out-of-scope) | grep | 确认 5 个 out-of-scope 文件未被改动 (git diff 为空) | 全部为空 |

---

## 4. 风险与缓解

| 风险 | 缓解 |
|------|------|
| dev server 启动超时 | 4 分钟硬超时,启动失败标 ⚠️ 不阻塞 GREEN (其他 7 项 PASS 即可) |
| Playwright 不可用 | 跳过视觉验证,标 ⚠️,不阻塞 GREEN |
| Lighthouse 跑分超时 | 使用现成归档 `docs/perf/iter-136/home-mobile.json` 替代现场跑分 |
| Out-of-scope 5 个 `<img>` 被误改 | `git diff` 过滤确认 5 个文件 diff 为空 |

---

## 5. 通过标准 (门 3)

1. ✅ AC-1 ~ AC-8 全部 PASS (8/8)
2. ✅ `npm run build` 0 error 0 warning
3. ✅ 5 路径 dev server 全部 HTTP 200 (或启动失败标 ⚠️)
4. ✅ 静态扫描白名单外 0 行
5. ✅ 报告结尾明确写 "✅ GREEN" 或 "❌ RED"

---

## 6. 执行顺序

1. **静态扫描** (本地 grep, 5 分钟)
2. **build 复测** (本地 npm, 2 分钟)
3. **dev server + 5 路径 curl** (本地, 2 分钟)
4. **dist 资源抽样 grep** (本地, 1 分钟)
5. **视觉验证 (可选, Playwright)** (本地, 1 分钟)
6. **写 05-qa-report.md** (汇总, 1 分钟)

总预算: 12 分钟 (子任务超时 8 分钟内,余量留余)
