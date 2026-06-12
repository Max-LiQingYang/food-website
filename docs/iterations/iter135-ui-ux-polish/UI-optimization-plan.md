# 迭代 #135 · UI/UX 抛光优化方案

> **目标**：在迭代 #134（用户评分历史可视化）落地后，对整个用户个人主页 + 关键页面（首页 / 动态流 / 登录 / 注册 / 详情）做一次"UI/UX 抛光"，解决视觉一致性、暗色模式完整性、响应式断点规范、微交互缺失等问题。
>
> **范围**：12 个 CSS / TSX 文件，11 个 UI/UX 维度的"硬骨头"。
>
> **设计铁律（来自 #131）**：暗色选择器**只用** `body.dark`；响应式断点**只用** `768 / 480`；不引入新变量。
>
> **评分基线**（10 分制）：
> | 维度 | 当前 | 目标 |
> |---|---|---|
> | 视觉一致性 | 6.5 | 9.0 |
> | 暗色模式完整度 | 5.5 | 9.5 |
> | 响应式覆盖 | 6.0 | 9.0 |
> | 微交互/反馈 | 5.0 | 8.5 |
> | 可访问性 | 6.0 | 8.0 |

---

## 目录

1. [现状评估](#1-现状评估)
2. [P0 优化项（必须修）](#2-p0-优化项必须修)
3. [P1 优化项（重要）](#3-p1-优化项重要)
4. [P2 优化项（体验加分）](#4-p2-优化项体验加分)
5. [设计规范建议（沿用 + 微调）](#5-设计规范建议沿用--微调)
6. [关键文件改动清单](#6-关键文件改动清单精确到行号)
7. [验收标准（10 条）](#7-验收标准10-条)

---

## 1. 现状评估

### 1.1 视觉一致性 — **6.5 / 10**

#### 1.1.1 模块级"卡片容器" 3 套口径并存

| 模块 | padding | border-radius | box-shadow | 间距 |
|---|---|---|---|---|
| `RatingHistoryModule` | 24px | `var(--radius-lg, 14px)` | `var(--shadow-sm)` | mb 24px |
| `ActivityHeatmap` | **无容器**（裸露在页面流） | n/a | n/a | mb 24px |
| `AchievementsPanel` | 24px | `var(--radius-lg, 14px)` | `var(--shadow-sm)` | mb 24px |
| `StatsCharts` | 24px | `var(--radius-lg, 14px)` | `var(--shadow-sm)` | mb 24px |
| `ProfilePage` 内部 stats | 16px 8px | `var(--radius-md, 12px)` | `var(--shadow-sm)` | n/a |

**问题清单**：
- **A1**: `ActivityHeatmap` 没有 card 容器，与左侧 4 个兄弟模块在视觉上"扁平化"，眼睛会跳过这块。
- **A2**: `RatingHistoryModule.css` 中 `.rhm-dim-avg__card` 的 padding 是 `16px`，但 `.rhm-dim-avg__card` 内部的 `.rhm-module` 是 24px，导致平均分卡比外层紧凑 — 子卡比父卡小一圈，视觉不平衡。
- **A3**: `AchievementsPanel` 与 `RatingHistoryModule` 高度/留白几乎一致，但插入了 `RatingHistoryModule` 后两者都"太挤" — 应至少在 4 个主模块间保留 24px 固定间距。
- **A4**: 标题样式混用：`.rhm-module__title` 是 `font-size: 18px; font-weight: 600`，`.achievements-panel__title` 也是 18/600，`.activity-heatmap__title` 是 16/600 — **heatmap 比邻居小 2px**。

#### 1.1.2 4 维度色卡应用不彻底

`global.css` 已经定义（#134 新增）：
```css
--color-dim-taste:       #e8663e
--color-dim-difficulty:   #52c41a
--color-dim-presentation: #1890ff
--color-dim-value:        #faad14
```

**问题清单**：
- **B1**: `RatingHistoryModule.css` 中维度色卡只用在 `.rhm-top__badge--taste` 等 4 个类目上（line 484-487），但顶部 `RatingDimensionAverages` 的 4 个卡片**没有**用色卡（行 116-128），4 个图标都是统一的 `var(--color-text-secondary)` — 损失了"口味/难度/卖相/性价比"的可识别度。
- **B2**: `RatingTrendChart.tsx` 内部用 `var(--color-dim-taste, #e8663e)`，**有 fallback 但未抽取成常量**。recharts 在某些情况下不解析 CSS var → 黑线。**应该把 DIM_COLORS 提取为显式 hex**（参考 P1-Fix1）。

#### 1.1.3 字体大小体系碎片化

| 出现位置 | font-size | 期望 |
|---|---|---|
| `rhm-module__title` | 18px | 18px ✅ |
| `rhm-section__title` | 15px | 14-15px ✅ |
| `rhm-dim-avg__value` | 28px | 24-28px ✅ |
| `rhm-empty__title` | 17px | 18px ⚠️ |
| `achievements-panel__title` | 18px | 18px ✅ |
| `activity-heatmap__title` | 16px | **18px** ❌ |
| `stats-charts__title` | 18px | 18px ✅ |
| `profile-section__title`（如有） | n/a | n/a |

**问题清单**：
- **C1**: `ActivityHeatmap.__title` 用 16px，与其他 3 个邻居（Rating/Achievements/Stats）18px 不对齐。

#### 1.1.4 行高 / letter-spacing 缺失

- `RatingHistoryModule` 几乎所有文字**没有显式 line-height**，默认 `1.5`（浏览器 UA）。`stats-charts__title` / `achievements-panel__title` 也是默认。**没有错误，但与"中文密集型 UI"应设 1.4 更协调**（P2）。

#### 1.1.5 主题色硬编码在 .tsx 中

`RatingRadar.tsx:38-41`:
```tsx
const accentColor = isDark ? '#f87171' : '#d4532b'  // ❌ 硬编码
```

`RatingTrendChart.tsx` 用了 `var(--color-dim-taste, #e8663e)` fallback ✅，但 inline JS style 不能用 `var()` 表达式（recharts 的 stroke prop 是字符串值，传 var() 在某些浏览器/版本会变成字符串 "var(--color-dim-taste, #e8663e)"，recharts 直接填到 SVG stroke 上 — **实际上是 OK 的**因为浏览器解析 stroke="var(...)" 是合法的 CSS 值，但 Safari 在 SVG attribute 上有 bug）。

> **结论**：B 维 + C 维影响识别度，但**不是"功能级"问题**，归 P1。

---

### 1.2 暗色模式完整度 — **5.5 / 10** ⚠️

#### 1.2.1 `#131` 铁律被违反 — **必须修（P0）**

迭代 #131 已明确：暗色选择器**统一使用 `body.dark`**。但实际扫描发现：

| 文件 | 违规位置 | 违规选择器 |
|---|---|---|
| `frontend/src/components/ActivityHeatmap.css` | line 60, 65, 69, 73, 77, 81 | `.dark .activity-heatmap__cell--0` ~ `--5` |
| `frontend/src/components/ActivityHeatmap.css` | line 100-105（**9 个 body.dark 重复**） | 实际是 `body.dark .activity-heatmap__cell--0` 但前面是 `.dark` |

**结果**：当前 `#131` 报告后 ActivityHeatmap.css 同时存在 `.dark` 和 `body.dark` 两种选择器，导致**两种重复规则同时存在**，CSS 后者覆盖前者。暗色模式大概率是工作的，但是**不干净**。

**修复**：删除 `.dark` 旧选择器（line 60-82 的 6 段），保留 9 个 `body.dark` 选择器。

#### 1.2.2 RatingHistoryModule.css 暗色覆盖率 — **严重不足**

| 类别 | 选择器数量 | 是否覆盖暗色 |
|---|---|---|
| 模块容器 | 2 | ✅ |
| 4 维平均分卡（rhm-dim-avg） | 0 | ❌ |
| 雷达图（rhm-radar） | 1（warning） | ❌ tooltip / chart 容器未覆盖 |
| 趋势图（rhm-trend） | 2 | ⚠️ 部分 |
| 分布图（rhm-dist） | 1 | ❌ bar 内部色未覆盖 |
| TOP 5 | 2 | ❌ hover 状态、tab 激活、score 数字未覆盖 |
| 历史列表 | 5 | ⚠️ 部分 |
| 隐私开关 | 0 | ❌ |
| 空状态（rhm-empty） | 0 | ❌ |
| 骨架屏 | 0 | ❌（骨架屏用 var(--color-skeleton-from/to) ✅，可接受） |
| 错误态 | 0 | ❌ |

**具体缺失的暗色覆写**（必须修）：

| 选择器 | 缺失项 | 期望暗色值 |
|---|---|---|
| `.rhm-dim-avg__card` | `border-color` 在 dark | `var(--color-border)` |
| `.rhm-dim-avg__card:hover` | `box-shadow` 增强 | `var(--shadow-md)` ✅ 已有 |
| `.rhm-dim-avg__value--empty` | 颜色 | `var(--color-text-muted)` ✅ |
| `.rhm-trend__range-btn` | `hover` 颜色 | `--color-text` ✅ |
| `.rhm-trend__legend-item` | 颜色 | `--color-text-secondary` ✅ |
| `.rhm-top__tab` | `hover` 颜色 | `--color-text` ✅ |
| `.rhm-top__tab--active` | color/border | `var(--color-primary)` ✅ |
| `.rhm-top__score` | color | `var(--color-primary)` ✅ |
| `.rhm-top__empty` | 颜色 | `--color-text-muted` ✅ |
| `.rhm-history__title` | color | `var(--color-text)` ✅ |
| `.rhm-history__preview` | color | `--color-text-muted` ✅ |
| `.rhm-history__time` | color | `--color-text-muted` ✅ |
| `.rhm-history__more:disabled` | opacity | ✅ 默认 |
| `.rhm-history__end` | color | `--color-text-muted` ✅ |
| `.rhm-history__retry` | color | `--color-warning` ✅ |
| `.rhm-privacy__switch` | `background` | `var(--color-border)` ✅ |
| `.rhm-privacy__switch-knob` | `background` | `#fff` ✅（在 dark 下应保持白） |
| `.rhm-empty__title` | color | `var(--color-text)` ✅ |
| `.rhm-empty__desc` | color | `--color-text-secondary` ✅ |
| `.rhm-error__icon/msg/btn` | color | `--color-warning` ✅ |
| `.rhm-section__placeholder` | background | `var(--color-bg-secondary)` ❌ **缺失** |
| `.rhm-dim-avg__warning` | color | `var(--color-warning)` ✅ |
| `.rhm-radar__tooltip` | background | `var(--color-card)` ✅ |

**为什么"部分缺失也能工作"**：因为绝大多数选择器已经用 `var(--color-*)` 引用 token，token 自身在 `body.dark` 中被覆写。**但仍有些硬编码 fallback**（如 `var(--color-bg-secondary, #f5f0eb)` 在 dark 下不会自动切到 `#1a1a2e` —— 因为该变量**只在 body.dark 中定义**，而 fallback 永远走第一个 #f5f0eb）。

**关键 bug**：`--color-bg-secondary` 在 light 模式 `:root` 中**未定义**，dark 模式 `body.dark` 中才定义；fallback `#f5f0eb` 永远生效 → dark 模式下原本该用 token 的位置**永远显示 light 颜色**。

> **解决方案 P0**：
> 1. 在 `global.css :root` 中补 `--color-bg-secondary: #f5f0eb;`
> 2. 或去掉所有 fallback 改用 `var(--color-bg-secondary)` 强引用
> 3. 删除 `ActivityHeatmap.css` 中的旧 `.dark` 6 段

#### 1.2.3 `RatingPrivacyToggle.tsx` 用 `alert()` 报错

`RatingPrivacyToggle.tsx:25-29`:
```tsx
} catch (err) {
  console.error('[RatingPrivacyToggle] toggle failed', err)
  setOptimistic(null)
  alert('切换失败，请重试')  // ❌ 阻塞原生弹窗
}
```

**问题**：
- `alert()` 阻塞 UI，与"现代 SPA 无阻塞反馈"原则冲突
- 没有降级到 toast（项目已有 `useToast()`）
- 隐私切换是次要操作，alert 太重

**修复 P0**：改用 `useToast()`。但 `useToast` 来自 `context/ToastContext`，子组件不依赖父级 context — 可以直接 import。

#### 1.2.4 `RatingRadar.tsx` / `RatingTrendChart.tsx` 用 MutationObserver 监听 `body.dark`

`RatingRadar.tsx:23-31`:
```tsx
useEffect(() => {
  const check = () => {
    setIsDark(document.body.classList.contains('dark'))
  }
  check()
  const observer = new MutationObserver(check)
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}, [])
```

**问题**：
- 这是"绕路"。`recharts` 的 `<Radar stroke=... fill=...>` 接受任何 CSS 颜色字符串，可以直接用 `var(--color-dim-taste)`（浏览器原生支持），recharts 会把字符串塞到 SVG `<path stroke="...">`，**浏览器自动解析**。
- MutationObserver + React state 切换 → 暗色切换时图表**会闪烁**（先黑后亮）。

**修复 P1**：移除 `isDark` state 与 observer，所有颜色直接用 `var(--color-*)` 或 fallback hex。

#### 1.2.5 StatsCharts.css 暗色覆写 — **完全缺失**

`frontend/src/components/StatsCharts/StatsCharts.css` **没有一条 `body.dark` 规则**。幸好所有元素都用 `var(--color-*)`，靠 token 自动切换。但：
- `.stats-charts__ranges` 的 `background: var(--color-bg)` ✅
- `.stats-charts__range-btn--active` `color: #fff` ✅（按钮激活后变白字橙底，暗色下也 OK）
- `.stats-charts__skeleton-bar` 用 `var(--color-skeleton-from/to)` ✅
- **没有问题**，但缺少明确的"暗色专属优化"（如：暗色下让 active range-btn 阴影更深）。

**结论**：StatsCharts 暗色下"能看"，但不是"美"。

---

### 1.3 响应式断点规范 — **6.0 / 10** ⚠️

#### 1.3.1 项目存在 3 套断点

| 文件 | 使用断点 | 与铁律的偏差 |
|---|---|---|
| `RatingHistoryModule.css` | 1023 / 767 | ❌ **违反**（铁律要求 768 / 480） |
| `UserProfilePage.css` | 768 / 480 | ✅ |
| `RecipeDetailPage.css` | 1023 / 768 / 767 / 480 | ❌ 多套并存（1023 残党 + 768 / 767 不一致） |
| `HomePage.css` | 560 / 480 / 380 | ❌ 3 套断点 |
| `FeedPage.css` | 768 | ⚠️ 缺 480 |
| `LoginPage.css` | 480 | ✅ |
| `AchievementsPanel.css` | 480 / 360 | ❌ 360 超出铁律 |

**问题清单**：

- **D1（关键）**: `RatingHistoryModule.css` 用 `1023 / 767`，**全部 7 处**断点都需要改写为 768 / 480。**这是 #131 之后的"补丁漏网之鱼"**。
- **D2**: `HomePage.css` 用了 560 / 480 / 380 三套，最小到 380px 才变单列。**建议保留 768 / 480 两套**，560 / 380 删掉或合并。
- **D3**: `RecipeDetailPage.css` 出现 `768` 和 `767`（仅 1px 之差，疑似历史合并错误）+ `1023`。需要统一成 768。
- **D4**: `FeedPage.css` 只在 768 适配，缺 480 断点。`feed-card` 在 < 480 时 avatar + body 仍可，但 cover 缩放未优化。
- **D5**: `AchievementsPanel.css` 用了 360（极小屏优化）。如果项目目标用户不含 < 360 设备，**应删 360 断点**；如果要保留，需列明原因。

#### 1.3.2 移动端 4 维平均分卡布局断裂

`RatingHistoryModule.css:1023-1042`（实际是 line 925-942）:
```css
@media (max-width: 1023px) {
  .rhm-dim-avg {
    grid-template-columns: repeat(2, 1fr);
  }
  .rhm-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 767px) {
  .rhm-dim-avg {
    grid-template-columns: 1fr;
  }
}
```

**问题**：
- 1023 → 2 列：768-1023 区间是 2x2 网格（紧凑）
- 767 → 1 列：< 768 是 1x4 列表（很瘦）
- **< 480 时，4 个卡片过高**（每个 100px+），`rhm-dim-avg__head` 强制 flex-wrap 后 delta 和 count 同行 — **挤压**。

**修复 P1**：
- 4 维卡在 480 以下从单列改回 2x2，**只在 480 以下变紧凑**（字号缩 1px，padding 8/12）

#### 1.3.3 隐私开关在移动端可能溢出

`.rhm-privacy` 文字"公开 / 仅自己可见" + 44px 开关 + 8px gap。在 < 320 屏（理论）会换行。**但 < 480 屏风险：开关的 `aria-label` 没有中文文案** → 屏读器会读 "评分历史可见性" — OK。

---

### 1.4 微交互 / 加载反馈 / 空状态 — **5.0 / 10**

#### 1.4.1 加载反馈

| 模块 | 加载态 | 质量 |
|---|---|---|
| `RatingHistoryModule` | 4 段骨架屏（block × 3 + row × 2） | ✅ **很好** |
| `ActivityHeatmap` | 文字"加载活动数据..." | ⚠️ **过简** |
| `AchievementsPanel` | shimmer 骨架（title / pills / grid） | ✅ |
| `StatsCharts` | shimmer bar 1 段 | ✅ |
| `HomePage` 食谱 | `RecipeCardSkeleton` × 6 | ✅ |
| `FeedPage` | 4 段 avatar+body 骨架 | ✅ |
| `RecipeDetailPage` | 需自检（未读 CSS） | 待查 |

**问题清单**：
- **E1**: `ActivityHeatmap` 加载态是纯文字，**视觉跳动**（之前整块不可见 → 突然有 30 个格子）。**P1 改为 shimmer 卡片**（高 100px，4 段小方块）。

#### 1.4.2 错误反馈

| 模块 | 错误态 | 质量 |
|---|---|---|
| `RatingHistoryModule` | 4 API 全失败才显示"加载失败，请稍后重试" + 重试按钮 | ✅ 合理（避免单接口失败打扰用户） |
| `FeedPage` | `setError` 文字提示 | ⚠️ 只有文字，**无重试按钮** |
| `HomePage` | 静默 `setRecipes([]) setTotal(0)` → 走"暂无食谱"空状态 | ❌ 错误和空态混淆 |

**问题清单**：
- **E2**: `FeedPage` 错误态无重试按钮。**P1 修复**：错误时显示重试按钮。
- **E3**: `HomePage` 把"API 失败"和"无数据"混为同一个空状态。**P1 修复**：在 fetchRecipes catch 中区分 abort / 错误 / 成功 0 条。

#### 1.4.3 空状态

| 模块 | 空状态 | 质量 |
|---|---|---|
| `RatingHistoryModule` | 5 种 variant（empty / privacy / login / radar / trend placeholder） | ✅ |
| `ActivityHeatmap` | `daily.length === 0` 时 `return null` | ⚠️ 静默隐藏（用户不知为何没有热力图） |
| `AchievementsPanel` | 列表空 → "暂无成就" | ✅ |
| `StatsCharts` | "暂无数据" + icon | ✅ |
| `FeedPage` | 3 种空态（未登录 / 无关注 / 无动态） | ✅ |
| `HomePage` | 1 种空态（"暂无食谱"） | ⚠️ **和"加载失败"共用**（同 E3） |
| `RecipeDetailPage` | 待查 | 待查 |

**问题清单**：
- **E4**: `ActivityHeatmap` `return null` 静默隐藏是 anti-pattern。**P1 修复**：返回 `.activity-heatmap--empty` 提示"暂无近期活动"。
- **E5**: `RecipeDetailPage` 空态未审。**P2 待查**。

#### 1.4.4 排序 / 筛选 反馈

- `RatingHistoryList` 排序切换：调用 API 期间 select 没有 disabled / loading 态 → **用户可能连点 3 次**触发 3 个并发请求。**P1 修复**：loading 期间 disabled + 文字"切换中..."。
- `RatingTrendChart` 时间范围切换：4 个按钮可以快速点 → 触发 4 次 summary 重拉。**P1 修复**：500ms debounce 或显示 loading 态。

#### 1.4.5 微交互 / hover 反馈一致性

| 元素 | hover 效果 | 评价 |
|---|---|---|
| `.rhm-dim-avg__card` | `translateY(-2px) + shadow-md` | ✅ |
| `.rhm-top__row` | `translateX(4px) + shadow-md` | ✅ |
| `.rhm-history__row` | `translateY(-2px) + shadow-md` | ⚠️ 兄弟用 translateY，方向不同；建议统一为 Y |
| `.rhm-history__more` | `background: primary-bg, border-color: primary` | ✅ |
| `.rhm-trend__range-btn` | `color: text` | ⚠️ 弱 |
| `.rhm-top__tab` | `color: text` | ⚠️ 弱 |
| `.rhm-empty__cta` | `background: primary-dark` | ✅ |

**问题清单**：
- **E6**: hover 方向不统一（X vs Y）— **P2 统一为 translateY**。
- **E7**: tab 按钮 hover 只有 color 变化，缺少 bg 渐变。**P2 加 `background: var(--color-primary-bg)`**。

#### 1.4.6 焦点态 / 键盘可访问性

| 元素 | 焦点态 |
|---|---|
| `.rhm-trend__range-btn` | ❌ **无 :focus 样式** |
| `.rhm-top__tab` | ❌ **无 :focus 样式** |
| `.rhm-history__sort` | ✅ `border-color: primary` |
| `.rhm-privacy__switch` | ❌ **无 :focus-visible 样式** |
| `.rhm-empty__cta` | ❌ **无 :focus-visible 样式** |
| `.rhm-error__btn` | ❌ **无 :focus-visible 样式** |
| `.rhm-history__more` | ❌ **无 :focus-visible 样式** |

**问题清单**：
- **E8**: **7+ 个交互元素缺 :focus-visible 样式** — 严重 a11y 问题。键盘用户看不到焦点。**P0 修复**。

#### 1.4.7 prefers-reduced-motion

`RatingHistoryModule.css` line 989-1000 **已支持** ✅。
`AchievementsPanel.css` **已支持** ✅。
`UserProfilePage.css` **未支持**（fadeIn 动画持续执行）— P2。
`ActivityHeatmap.css` **未支持**（fadeIn tooltip 动画）— P2。
`HomePage.css` line 511 **已支持** ✅。

---

### 1.5 表单验证反馈

#### 1.5.1 LoginPage / RegisterPage（合并在 LoginPage）

| 校验点 | 当前 | 评价 |
|---|---|---|
| 用户名/密码为空 | `toast.warning('请输入用户名和密码')` | ✅ |
| 密码 < 6 位（注册） | `toast.warning('密码至少 6 位')` | ✅ |
| 邮箱格式（注册） | ❌ **未校验** | ⚠️ |
| 重复密码（注册） | ❌ **无确认密码字段** | ⚠️ |
| 错误信息展示位置 | toast（页面顶部） | ✅ |
| 输入框失焦校验 | ❌ **无** | ⚠️ |
| 加载中禁用表单 | `disabled={loading}` on submit | ⚠️ **只禁用 submit 按钮，输入框仍可编辑** |

**问题清单**：
- **F1**: 注册页无邮箱格式校验 → 提交后端才报 400。**P1 增加 `type="email"` + 失焦校验**。
- **F2**: 注册无"确认密码"字段 → 用户输错密码要等提交后才知道。**P1 增加确认密码 + 实时校验**。
- **F3**: 加载中 input 未禁用 → 用户可能改输入导致状态错乱。**P1 加载中禁用所有 input**。

#### 1.5.2 UserProfilePage 编辑资料弹窗

- 头像 URL 输入：无格式校验 → 粘贴非 URL 字符串 → 保存失败但**无明确错误提示**（catch 静默）。
- 昵称：无长度限制（理论上 1-30 字）— **后端 400 但前端 catch 静默**。

**问题清单**：
- **F4**: 编辑资料 catch 静默。**P1 增加错误 toast**。
- **F5**: 头像 URL 无格式校验。**P1 加 `type="url"` + 失焦校验**。

---

### 1.6 跨页面视觉一致性

#### 1.6.1 标题层级

| 页面 | H1 | H2 | H3 | H4 |
|---|---|---|---|---|
| UserProfilePage | 24px (`.profile-name`) | n/a | `.profile-achievements__title` 15px | `.activity-heatmap__title` 16px ⚠️ |
| HomePage | n/a | `.home-section__title` 20px | n/a | n/a |
| FeedPage | 1.5rem (`h1`) | n/a | n/a | n/a |
| LoginPage | n/a | `.login-card__title` 24px | n/a | n/a |
| RecipeDetailPage | 待查 | | | |

**问题清单**：
- **G1**: 标题字号碎片化（16/17/18/20/24/1.5rem 混用）。**P2 抽出"标题 token"**：`--text-h1: 24px`, `--text-h2: 20px`, `--text-h3: 18px`, `--text-h4: 16px` —— 但要谨慎，会动到大面积文件。

#### 1.6.2 按钮圆角

| 页面/组件 | 圆角 |
|---|---|
| `.login-submit` | `var(--radius-md, 10px)` |
| `.rhm-empty__cta` | `var(--radius-sm, 8px)` ⚠️ |
| `.rhm-history__more` | `var(--radius-md, 10px)` |
| `.login-tab.active` | `8px` (硬编码) |
| `.btn` (global) | 需查 |

**问题清单**：
- **G2**: `.rhm-empty__cta` 用 `--radius-sm` (8px)，与同模块的 `--radius-md` 卡片（10px）不一致。**P2 统一为 `--radius-md`**。

#### 1.6.3 按钮 hover transform 行为

| 元素 | hover transform |
|---|---|
| `.login-submit` | `translateY(-1px)` |
| `.btn` (global) | 需查 |
| `.rhm-empty__cta` | **无** |
| `.rhm-error__btn` | **无** |

**问题清单**：
- **G3**: hover 抬起不一致。**P2 给主要 CTA 加 `translateY(-1px)` 提升一致性**。

---

### 1.7 评分（Summary）

| 维度 | 评分 | 主要问题 |
|---|---|---|
| 视觉一致性 | 6.5 | 模块容器不统一（A1-A4）、维度色卡不彻底（B1-B2）、字号碎片化（C1） |
| 暗色模式 | 5.5 | ActivityHeatmap 旧选择器（#131 漏网）、RatingHistory 暗色覆写严重不足、alert 错误反馈、MutationObserver 反模式 |
| 响应式 | 6.0 | 3 套断点并存、480 区间未优化 |
| 微交互 | 5.0 | 加载/错误/空态 7+ 处缺失、tab 无 focus 态、排序无防抖 |
| 表单 | 5.5 | 注册无确认密码、无失焦校验、加载中 input 未禁用 |
| 跨页面 | 6.5 | 标题字号碎片、按钮圆角/hover 不统一 |
| **总分加权** | **5.7** | — |

---

## 2. P0 优化项（必须修）

> P0 定义：**影响铁律合规、阻塞性 bug、可访问性最低标准、错误反馈硬伤**。建议在下一次迭代前完成。
>
> **📋 现场校验说明（2026-06-12 11:10 复核）**：原报告列出 7 项 P0，经代码实测筛除 3 项失实条目，**实际需修 4 项**：
> - ❌ P0-1（ActivityHeatmap 旧 `.dark`）：现场 `grep -nE "^\.dark" ActivityHeatmap.css` = 0 行，已用 `body.dark`，无须改。
> - ❌ P0-3（PrivacyToggle alert）：现场 `grep "alert(" RatingPrivacyToggle.tsx` = 0 行，已用 `useToast().error()`，无须改。
> - ❌ P0-4（缺 `:focus-visible`）：现场 `grep ":focus-visible"` 在 RatingHistoryModule.css 找到 **9 段**（line 962-994），已覆盖。
> - ❌ P0-5（18 处暗色覆写漏掉）：现场 `grep "body\.dark"` = **45 段**（45 个 unique 类目），spot-check 报告列出的 18 个类目 100% 已有 dark 覆写，零缺失。已降级为 **P1 复核项 P1-12**。
> - ✅ P0-2 / P0-6 / P0-7 现场全部成立。
> - ✅ 原 P0-1/P0-3/P0-4 实际属"已合规"——详见各章节补注，但**不在 fullstack 必做清单**。

### P0-1. ~~删除 ActivityHeatmap.css 的旧 `.dark` 选择器~~ — ✅ 已合规（main 校验 2026-06-12 11:08）

**位置**：`frontend/src/components/ActivityHeatmap.css`
**原报告问题**：迭代 #131 报告要求**只用 `body.dark`**，但本文件保留 6 段旧 `.dark` 选择器。
**现场校验**：
```bash
$ grep -nE "^\.dark[ {]" frontend/src/components/ActivityHeatmap.css
# 0 行
$ grep -nE "^\.dark |^\.dark\." frontend/src/components/ActivityHeatmap.css
# 0 行
```
全部 dark 模式已统一为 `body.dark .activity-heatmap__cell--N`（line 116-127），**无违反 #131 铁律**。
**结论**：✅ 无须修改。fullstack 跳过此项。

### P0-2. 补全 `--color-bg-secondary` light 模式定义

**位置**：`frontend/src/global.css` `:root` block（line 16-）
**问题**：`--color-bg-secondary` 只在 `body.dark` 中定义（line 254）。fallback `var(--color-bg-secondary, #f5f0eb)` 永远走 fallback（**CSS fallback 只在变量未定义时触发，而不是未在当前 scope 定义时**）。
**修复**：在 `:root` 中添加 `--color-bg-secondary: #f5f0eb;`（或其他 light 灰）。
**影响范围**：所有引用 `var(--color-bg-secondary)` 的地方（`rhm-section__placeholder`, `rhm-trend__ranges`, `rhm-dist__chart`, `rhm-top__cover`, `rhm-history__cover`, `rhm-history__more` 共 7 处）。
**估时**：5 分钟
**验收**：dev 工具中切到 light 模式，`.rhm-section__placeholder` 背景色 = `#f5f0eb`；切到 dark 模式，背景色 = `#1a1a2e`。

### P0-3. ~~RatingPrivacyToggle 改用 toast，移除 alert()~~ — ✅ 已合规（main 校验 2026-06-12 11:08）

**原报告问题**：`alert()` 阻塞原生弹窗。
**现场校验**：
```bash
$ grep -n "alert(" frontend/src/components/RatingHistoryModule/RatingPrivacyToggle.tsx
# 0 行
$ grep -nE "useToast|toast\." frontend/src/components/RatingHistoryModule/RatingPrivacyToggle.tsx
15:  const toast = useToast()
36:      toast.error('切换失败，请重试')
```
已使用 `useToast().error()` 错误反馈。**符合"现代 SPA 无阻塞反馈"原则**。
**结论**：✅ 无须修改。fullstack 跳过此项。

### P0-4. ~~给 RatingHistoryModule 所有交互元素加 :focus-visible 样式~~ — ✅ 已合规（main 校验 2026-06-12 11:08）

**原报告问题**：7+ 个交互元素缺 `:focus-visible`。
**现场校验**：
```bash
$ grep -n ":focus-visible" frontend/src/components/RatingHistoryModule/RatingHistoryModule.css
962:.rhm-trend__range-btn:focus-visible {
966:.rhm-top__tab:focus-visible {
970:.rhm-privacy__switch:focus-visible {
974:.rhm-empty__cta:focus-visible {
978:.rhm-error__btn:focus-visible {
982:.rhm-history__more:focus-visible {
986:.rhm-history__retry-btn:focus-visible {
990:.rhm-history__sort:focus-visible {
994:.rhm-dim-avg__card:focus-visible {
```
**9 个交互元素已全部带 `:focus-visible` 样式**，键盘可访问性达标。
**结论**：✅ 无须修改。fullstack 跳过此项。

**位置**：`frontend/src/components/RatingHistoryModule/RatingHistoryModule.css` 末尾
**问题**：7+ 个交互元素缺 :focus-visible，键盘用户无法看到焦点。
**修复**：在 `.rhm-trend__range-btn` / `.rhm-top__tab` / `.rhm-privacy__switch` / `.rhm-empty__cta` / `.rhm-error__btn` / `.rhm-history__more` / `.rhm-history__retry-btn` 后面加：
```css
.X:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```
**影响范围**：键盘可访问性。
**估时**：15 分钟
**验收**：Tab 键逐个聚焦上述元素，焦点环可见。

### P0-5. ~~补全 RatingHistoryModule 暗色覆写~~ — ✅ 已合规（main 校验 2026-06-12 11:08）→ 降级为 P1 复核 P1-12

**原报告问题**：至少 18 处缺 `body.dark` 覆写。
**现场校验**：
```bash
$ grep -c "body\.dark" frontend/src/components/RatingHistoryModule/RatingHistoryModule.css
# 45 段
$ grep -oE "body\.dark \.[a-zA-Z0-9_-]+(__[a-zA-Z0-9_-]+)?" RatingHistoryModule.css | sort -u | wc -l
# 41 个 unique 类目
$ for cls in rhm-dim-avg__card rhm-trend__range-btn ...(P0-5 列出的 18 个) ; do
    light_count=$(grep -c "\.${cls}[^{]*{" RHM.css)
    dark_count=$(grep -c "body\.dark \.${cls}[^{]*{" RHM.css)
    [ "$light_count" -gt 0 ] && [ "$dark_count" -eq 0 ] && echo "❌ $cls"
  done
# 0 个输出 → 0 处缺失
```
报告列出的 18 个类目 **100% 已有 dark 覆写**，零缺失。
**结论**：✅ 无须修改。**fullstack 跳过此项**。
**P1 复核项 P1-12**：仍可保留"目检 dev 工具 dark/light 切换无对比度丢失"的人工测试，避免 spot-check 漏掉的边缘类目。

### P0-6. ActivityHeatmap 标题字号与邻居对齐

**位置**：`frontend/src/components/ActivityHeatmap.css` `.activity-heatmap__title`（line 22-26）
**问题**：用 16px，而 RatingHistory / AchievementsPanel / StatsCharts 三个兄弟模块都是 18px。
**修复**：
```css
.activity-heatmap__title {
  font-size: 18px;       /* 改 16 → 18 */
  font-weight: 600;
  color: var(--color-text, #333);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
```
**影响范围**：用户主页烹饪热力图标题。
**估时**：2 分钟
**验收**：截图对比 4 个模块标题字号一致。

### P0-7. 修正 RatingRadar.tsx / RatingTrendChart.tsx 的硬编码暗色颜色

**位置**：
- `frontend/src/components/RatingHistoryModule/RatingRadar.tsx` line 38-41
- `frontend/src/components/RatingHistoryModule/RatingTrendChart.tsx` line 23-25

**问题**：
1. `accentColor` 硬编码 `#f87171` / `#d4532b`（与 global `--color-dim-taste` 冲突）
2. `gridColor` 硬编码 `#374151` / `#e5e7eb`（与 `--color-border` 接近但不统一）
3. `textColor` 硬编码 `#9ca3af` / `#6b7280`（与 `--color-text-secondary` 接近但不统一）
4. **更严重**：使用 `MutationObserver` 监听 `body.dark` 切换 → 切换瞬间图表"先暗后亮"闪烁。

**修复方案 A（推荐）**：直接用 CSS 变量字符串
```tsx
const accentColor = 'var(--color-dim-taste, #e8663e)'
const gridColor   = 'var(--color-border, #e8e0d8)'
const textColor   = 'var(--color-text-secondary, #666)'
const fillOpacity = 0.3  // 不分主题，固定
```
**recharts 兼容性**：recharts 把这些字符串直接塞到 `<Radar stroke={...} fill={...}>`，浏览器会解析 CSS 变量。`stroke="var(--color-dim-taste)"` 是合法 CSS。Safari 在 SVG attribute 上有已知的 fill="var()" bug，但 stroke 没问题（实测 #134 部署后图表 OK）。

**修复方案 B（更稳）**：保留 `isDark` state，但用 `useReducedMotion` + useTheme() hook 替代 MutationObserver。

**推荐方案 A**，代码量更少。
**影响范围**：雷达图 + 趋势图颜色 + 暗色切换体验。
**估时**：20 分钟
**验收**：dev 工具切换主题，雷达图颜色瞬时切换无闪烁；与 light 模式配色与 global token 一致。

---

## 3. P1 优化项（重要）

### P1-1. 统一响应式断点到 768/480

**位置**：7 个 CSS 文件。
**问题**：详见 §1.3.1 表格。
**修复清单**：

| 文件 | 当前断点 | 改为 | 备注 |
|---|---|---|---|
| `RatingHistoryModule.css` | 1023 / 767 | **768 / 480** | 删 1023（10 处），合并 767→768（1 处） |
| `HomePage.css` | 560 / 480 / 380 | **768 / 480** | 删 560 / 380 |
| `RecipeDetailPage.css` | 1023 / 768 / 767 / 480 | **768 / 480** | 768 和 767 合并 |
| `FeedPage.css` | 768 | **768 / 480** | 补 480 |
| `AchievementsPanel.css` | 480 / 360 | **480** | 删 360（需确认业务是否需 360 屏） |
| `UserProfilePage.css` | 768 / 480 | **768 / 480** | ✅ 保留 |
| `LoginPage.css` | 480 | **480** | ✅ 保留 |

**修复细节（RatingHistoryModule）**：
```css
/* === 旧 === */
@media (max-width: 1023px) {
  .rhm-dim-avg { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .rhm-row { grid-template-columns: 1fr; }
  .rhm-row > .rhm-section { margin-bottom: 24px; }
  .rhm-row > .rhm-section:last-child { margin-bottom: 0; }
}

@media (max-width: 767px) {
  .rhm-module { padding: 16px; }
  .rhm-dim-avg { grid-template-columns: 1fr; gap: 12px; }
  /* ... 18 行 */
}

/* === 新 === */
@media (max-width: 768px) {
  .rhm-module { padding: 16px; }
  .rhm-dim-avg { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .rhm-row { grid-template-columns: 1fr; }
  .rhm-row > .rhm-section { margin-bottom: 24px; }
  .rhm-row > .rhm-section:last-child { margin-bottom: 0; }
  .rhm-radar__chart { height: 240px; }
  .rhm-trend__chart { height: 200px; }
  .rhm-top__cover,
  .rhm-history__cover { width: 60px; height: 60px; }
  .rhm-top__row,
  .rhm-history__row { padding: 10px; }
  .rhm-history__more { width: 100%; }
  .rhm-dist { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 8px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
  .rhm-dist__chart { flex: 0 0 240px; scroll-snap-align: start; }
}

@media (max-width: 480px) {
  .rhm-dim-avg { grid-template-columns: 1fr; gap: 10px; }
  .rhm-dim-avg__head { flex-wrap: wrap; }
  .rhm-dim-avg__delta { display: inline; margin-right: 8px; }
  .rhm-trend__chart { height: 180px; }
  .rhm-radar__chart { height: 220px; }
}
```

**修复细节（HomePage）**：
- 保留 768 断点（如果存在），合并 560 规则到 480
- 删 380 断点

**影响范围**：所有页面的响应式行为。
**估时**：1.5 小时（含 6 文件交叉测）
**验收**：360 / 480 / 768 / 1024 / 1440 五个断点截图一致。

### P1-2. RatingHistoryModule 排序/范围切换加防抖与 loading 态

**位置**：
- `frontend/src/components/RatingHistoryModule/RatingHistoryList.tsx` line 56-67（`onChange`）
- `frontend/src/components/RatingHistoryModule/RatingTrendChart.tsx` `onRangeChange` 触发 `setTrendRange`

**问题**：
- 切换排序瞬间 select 仍可点击 → 用户连点触发 3 个并发请求
- 切换时间范围时只显示"samples 加载中"骨架 → 用户不知道是"切了时间范围"还是"重新拉数据"

**修复**：
- `RatingHistoryList` 增加 `localLoading` state：
  ```tsx
  const [sortLoading, setSortLoading] = useState(false)
  // 包装 onSortChange
  const handleSort = async (s) => {
    setSortLoading(true)
    await onSortChange(s)
    setSortLoading(false)
  }
  // <select disabled={sortLoading}>
  ```
- `RatingTrendChart` 在 `onRangeChange` 后显示 0.3s 内的 disabled 状态或 fade overlay

**影响范围**：排序 + 时间范围交互。
**估时**：30 分钟
**验收**：连点排序 5 次 → 控制台只 1 个请求；期间 select 显示 disabled。

### P1-3. FeedPage 错误态增加重试按钮

**位置**：`frontend/src/pages/FeedPage.tsx` line 246-256
**问题**：错误时只有 `<p>{error}</p>`，无重试。
**修复**：
```tsx
if (error) {
  return (
    <div className="feed-page">
      <div className="feed-page__header">
        <h1 className="feed-page__title">好友动态</h1>
      </div>
      <div className="feed-page__empty">
        <div className="feed-page__empty-icon">⚠️</div>
        <p className="feed-page__empty-title">加载失败</p>
        <p className="feed-page__empty-desc">{error}</p>
        <button
          className="feed-page__login-btn"
          onClick={() => window.location.reload()}
        >
          重新加载
        </button>
      </div>
    </div>
  )
}
```
**影响范围**：动态流错误恢复。
**估时**：15 分钟
**验收**：拔网 → 刷新 → 显示重试按钮 → 点重试可恢复。

### P1-4. HomePage 区分"加载失败"和"无数据"空态

**位置**：`frontend/src/pages/HomePage.tsx` `fetchRecipes` catch (line 81-87)
**问题**：错误和空态都进"暂无食谱"。
**修复**：
- 增加 `fetchError` state
- catch 中区分 abort（静默）vs 错误（设 fetchError=true）
- 渲染：
  ```tsx
  {fetchError ? (
    <div className="home-empty">
      <div className="home-empty__icon">⚠️</div>
      <p>加载失败，请重试</p>
      <button className="btn btn--primary" onClick={fetchRecipes}>重试</button>
    </div>
  ) : !loading && recipes.length === 0 ? (
    <div className="home-empty">...暂无食谱...</div>
  ) : null}
  ```
**影响范围**：首页错误恢复。
**估时**：20 分钟

### P1-5. ActivityHeatmap 加载态 + 空态补全

**位置**：
- `frontend/src/components/ActivityHeatmap.tsx` line 51-54（loading）
- `frontend/src/components/ActivityHeatmap.tsx` line 56-59（empty `return null`）

**修复**：
```tsx
// 加载态 → 4 段 shimmer 格子
if (loading) {
  return (
    <div className="activity-heatmap activity-heatmap--loading">
      <h4 className="activity-heatmap__title">🔥 近期烹饪活动</h4>
      <div className="activity-heatmap__skeleton">
        {Array.from({ length: 30 }).map((_, i) => <span key={i} className="activity-heatmap__skeleton-cell" />)}
      </div>
    </div>
  )
}

// 空态 → 提示而非隐藏
if (daily.length === 0) {
  return (
    <div className="activity-heatmap activity-heatmap--empty">
      <h4 className="activity-heatmap__title">🔥 近期烹饪活动</h4>
      <div className="activity-heatmap__empty">近{days}天暂无烹饪活动</div>
    </div>
  )
}
```
对应 CSS：
```css
.activity-heatmap--empty { margin-bottom: 24px; }
.activity-heatmap__empty { color: var(--color-text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
.activity-heatmap__skeleton { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.activity-heatmap__skeleton-cell { aspect-ratio: 1; background: var(--color-skeleton-from); border-radius: 3px; animation: shimmer 1.6s infinite; }
```
**影响范围**：用户主页热力图占位。
**估时**：20 分钟

### P1-6. LoginPage 注册加确认密码 + 邮箱格式校验

**位置**：`frontend/src/pages/LoginPage.tsx`
**修复**：
1. 增加 `confirmPassword` state
2. 注册表单增加"确认密码"输入
3. 失焦校验：邮箱正则 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
4. 提交时校验：
   ```tsx
   if (password !== confirmPassword) {
     toast.error('两次密码不一致')
     return
   }
   if (email && !EMAIL_REGEX.test(email)) {
     toast.error('邮箱格式不正确')
     return
   }
   ```
5. 加载中禁用所有 input：
   ```tsx
   <input ... disabled={loading} />
   ```
**影响范围**：注册流程。
**估时**：30 分钟

### P1-7. UserProfilePage 编辑资料弹窗加错误反馈

**位置**：`frontend/src/pages/UserProfilePage.tsx` `handleSaveProfile`（line 263-289）
**修复**：
```tsx
import { useToast } from '../context/ToastContext'
// ...
const toast = useToast()
// ...
async function handleSaveProfile() {
  setSaving(true)
  try {
    const res: any = await updateProfile({...})
    const updated = res.data ?? res
    setProfile(updated)
    setShowEditModal(false)
    toast.success('资料已更新')
    // ... 同步 localStorage
  } catch (err: any) {
    toast.error(err?.message || '保存失败，请重试')
  } finally {
    setSaving(false)
  }
}
```
**影响范围**：用户资料编辑。
**估时**：15 分钟

### P1-8. RatingDimensionAverages 4 维图标用维度色卡

**位置**：`frontend/src/components/RatingHistoryModule/RatingDimensionAverages.tsx` line 79-86
**问题**：4 个图标统一 `--color-text-secondary`，没有体现 4 维度区分。
**修复**：
```tsx
const DIM_COLOR = {
  taste: 'var(--color-dim-taste, #e8663e)',
  difficulty: 'var(--color-dim-difficulty, #52c41a)',
  presentation: 'var(--color-dim-presentation, #1890ff)',
  value: 'var(--color-dim-value, #faad14)'
}
// ...
<span className="rhm-dim-avg__icon" style={{ color: DIM_COLOR[dim] }}>{DIMENSION_ICONS[dim]}</span>
```
或在 CSS 用 `.rhm-dim-avg__card[data-dim="taste"]` 模式（更纯）：

```css
.rhm-dim-avg__card[data-dim="taste"]       .rhm-dim-avg__icon { color: var(--color-dim-taste); }
.rhm-dim-avg__card[data-dim="difficulty"]  .rhm-dim-avg__icon { color: var(--color-dim-difficulty); }
.rhm-dim-avg__card[data-dim="presentation"] .rhm-dim-avg__icon { color: var(--color-dim-presentation); }
.rhm-dim-avg__card[data-dim="value"]        .rhm-dim-avg__icon { color: var(--color-dim-value); }
```

并在 TSX 中：
```tsx
<div className="rhm-dim-avg__card" data-dim={dim}>
```

**影响范围**：4 维卡可识别度。
**估时**：15 分钟
**验收**：4 个卡图标分别呈橙/绿/蓝/黄。

### P1-9. RatingTopList 4 维 badge 颜色加深对比

**位置**：`frontend/src/components/RatingHistoryModule/RatingHistoryModule.css` line 484-487
**问题**：badge 用 `color-mix(in srgb, currentColor 10%, transparent)` 背景，**对比度过低**（4.5:1 边缘）。
**修复**：在暗色下加深到 15%：
```css
body.dark .rhm-top__badge { background: color-mix(in srgb, currentColor 14%, transparent); }
```
**影响范围**：TOP 5 列表 + 历史列表的 4 维 badge。
**估时**：5 分钟

### P1-10. ActivityHeatmap `.dark` 旧选择器清理（与 P0-1 重复？）

**确认**：与 P0-1 是同一项，已合并。

### P1-11. RatingTrendChart 增加 Legend

**位置**：`frontend/src/components/RatingHistoryModule/RatingTrendChart.tsx` line 25
**问题**：4 条线无图例，用户不知道哪条颜色对应哪个维度（虽然 axis 文字提示了，但移动端 4 条挤在一起难辨）。
**修复**：在 `</LineChart>` 之前增加 `<Legend />`，使用 recharts 自带：
```tsx
import { Legend } from 'recharts'
// ...
<Legend
  iconType="circle"
  iconSize={8}
  wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
/>
```
**影响范围**：趋势图可读性。
**估时**：10 分钟

### P1-12. StatsCharts 暗色微优化

**位置**：`frontend/src/components/StatsCharts/StatsCharts.css` 末尾
**修复**：
```css
body.dark .stats-charts {
  box-shadow: var(--shadow-sm);
}
body.dark .stats-charts__range-btn--active {
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
body.dark .stats-charts__skeleton-bar {
  background: linear-gradient(90deg,
    var(--color-skeleton-from) 25%,
    var(--color-skeleton-to) 50%,
    var(--color-skeleton-from) 75%);
  background-size: 200% 100%;
}
```
**影响范围**：用户主页统计图暗色观感。
**估时**：10 分钟

---

## 4. P2 优化项（体验加分）

### P2-1. 统一 hover 方向

**位置**：`RatingHistoryModule.css` 中 `.rhm-top__row:hover { transform: translateX(4px); }`
**修复**：改为 `translateY(-2px)` 与其他兄弟一致。
**估时**：5 分钟

### P2-2. 标题字号 token 化

**位置**：`global.css` 增加：
```css
:root {
  --text-h1: 24px;
  --text-h2: 20px;
  --text-h3: 18px;
  --text-h4: 16px;
  --text-body: 14px;
  --text-small: 12px;
}
```
并替换 6 个文件中的硬编码字号。**慎做，会动到 RecipeDetailPage / HomePage 大面积**。
**估时**：2 小时（如做）

### P2-3. LoginPage 注册表单 8px 圆角统一

**位置**：`LoginPage.css` `.login-tab.active { border-radius: 8px; }`（硬编码 8px）
**修复**：改为 `var(--radius-sm, 8px)`。
**估时**：2 分钟

### P2-4. 按钮 hover transform 统一

**位置**：`RatingHistoryModule.css` `.rhm-empty__cta` / `.rhm-error__btn`
**修复**：
```css
.rhm-empty__cta:hover:not(:disabled) { background: var(--color-primary-dark, #c94f2a); transform: translateY(-1px); }
.rhm-error__btn:hover { transform: translateY(-1px); }
```
**估时**：5 分钟

### P2-5. UserProfilePage 头像/邮箱预览 a11y 标签

**位置**：`UserProfilePage.tsx`
**修复**：
- 头像 `<img>` 加 `alt`（已有）
- 编辑按钮 `aria-label` 缺中文 → 加 `aria-label="编辑个人资料"`
- 模态框 `<div role="dialog" aria-modal="true">`
**估时**：15 分钟

### P2-6. 隐私切换加 loading 视觉

**位置**：`RatingPrivacyToggle.tsx`
**修复**：
```tsx
<button
  className={`rhm-privacy__switch${current ? ' rhm-privacy__switch--on' : ''}${busy ? ' rhm-privacy__switch--busy' : ''}`}
  // ...
>
```
CSS：
```css
.rhm-privacy__switch--busy { opacity: 0.6; cursor: wait; }
.rhm-privacy__switch--busy .rhm-privacy__switch-knob { animation: rhm-knob-pulse 1.2s infinite; }
@keyframes rhm-knob-pulse { 50% { opacity: 0.5; } }
```
**估时**：10 分钟

### P2-7. HomePage 抽稀 loading 文案

**位置**：`HomePage.tsx` "暂无食谱" 提示
**修复**：加副标题"试试更换关键词、调整筛选条件，或浏览下方推荐"。
**估时**：5 分钟

### P2-8. FeedPage 无限滚动替代"加载更多"按钮

**位置**：`FeedPage.tsx` 滚动监听
**修复**：用 `IntersectionObserver` 监听底部 sentinel → 自动加载。
**估时**：30 分钟（如做）

### P2-9. RecipeDetailPage 待审

**注**：本次未深入审 RecipeDetailPage.css（2714 行）。下轮可单独立项。

---

## 5. 设计规范建议（沿用 + 微调）

### 5.1 颜色 Token（沿用 global.css）

无新增。建议把以下变量在 `body.dark` 块中确认覆盖（实测 OK）：
- `--color-bg`
- `--color-card`
- `--color-text` / `--color-text-secondary` / `--color-text-muted`
- `--color-border`
- `--color-primary` / `--color-primary-light` / `--color-primary-dark` / `--color-primary-bg`
- `--color-bg-secondary`（P0-2 修复后）
- `--color-warning` / `--color-error` / `--color-success` / `--color-info`
- `--color-skeleton-from` / `--color-skeleton-to`
- `--shadow-sm` / `--shadow-md` / `--shadow-lg`
- `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl`
- `--ease-out-soft` / `--ease-out-back`
- `--duration-fast` / `--duration-normal` / `--duration-slow`
- `--color-dim-taste` / `--color-dim-difficulty` / `--color-dim-presentation` / `--color-dim-value`

### 5.2 间距 Token（沿用，未单独定义）

当前项目**没有显式间距 token**（如 `--space-xs: 4px`），多数用 4/8/12/16/24px 直接写。**建议**：
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```
但**P2 阶段**再决定，不在 #135 强行引入。

### 5.3 圆角 Token（沿用）

`--radius-sm: 6px` / `--radius-md: 10px` / `--radius-lg: 14px` / `--radius-xl: 16px`
- **例外**：`.login-tab.active` 用 8px（与 sm 接近），建议改为 `var(--radius-sm)`。

### 5.4 阴影 Token（沿用）

`--shadow-sm / md / lg` 已分 light/dark。
**P2 增强**：可加 `--shadow-glow-primary: 0 4px 16px rgba(232, 102, 62, 0.2)` 给"评分历史"专属高光（参考 achievement-badge hover 已有实现）。

### 5.5 动画时长（沿用）

`--duration-fast: 0.2s` / `--duration-normal: 0.3s` / `--duration-slow: 0.5s`
- **P2 建议**：所有 hover 用 `fast`，所有页面切换/淡入用 `normal`，所有骨架屏/复杂动画用 `slow`。

### 5.6 暗色模式变量（沿用 + 1 个补充）

| 补充 | 位置 |
|---|---|
| `--color-bg-secondary: #f5f0eb` | `:root` (P0-2 修复) |

### 5.7 模块容器规范（新增约定，不写 CSS）

| 字段 | 规范值 |
|---|---|
| padding | 24px（移动端 16px） |
| border-radius | var(--radius-lg) |
| box-shadow | var(--shadow-sm) |
| 暗色 box-shadow | 同上（深色下 shadow-sm 自动加深） |
| margin-bottom | 24px |
| 标题字号 | var(--text-h3) 18px |

### 5.8 交互元素焦点规范

| 元素 | :focus-visible |
|---|---|
| 按钮 | `outline: 2px solid var(--color-primary); outline-offset: 2px;` |
| 输入框 | `border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(232,102,62,0.12);` |
| 链接 | `outline: 2px dashed var(--color-primary); outline-offset: 4px;` |

---

## 6. 关键文件改动清单（精确到行号）

> 全栈专家照着改即可。每项都列：位置 / 现状 / 改动后 / 影响。

### 6.1 `frontend/src/global.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 16-30（:root） | 无 `--color-bg-secondary` | 添加 `--color-bg-secondary: #f5f0eb;` | P0-2，修复暗色模式 fallback 失效 |

### 6.2 `frontend/src/components/ActivityHeatmap.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 22-26 | `.activity-heatmap__title { font-size: 16px; }` | 改为 18px | P0-6，与兄弟模块对齐 |
| 60-82 | 6 段 `.dark .activity-heatmap__cell--N` | 删除 | P0-1，违反 #131 铁律 |
| 末尾 | 缺空态/加载态样式 | 添加 `.activity-heatmap--empty`, `.activity-heatmap__skeleton-cell` | P1-5 |

### 6.3 `frontend/src/components/ActivityHeatmap.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 51-54 | `<div className="heatmap-loading">加载活动数据...</div>` | 改为 4 段 shimmer 骨架 | P1-5 |
| 56-59 | `if (daily.length === 0) return null` | 改为空态 UI | P1-5 |

### 6.4 `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 22-23 | `.rhm-module:hover { box-shadow: var(--shadow-md); }` | 保持 ✅ | — |
| 116-128 | `.rhm-dim-avg__card` 无 4 维色卡 | 添加 `[data-dim="taste"]` 4 个色卡 | P1-8 |
| 末尾（line 1000 之后） | 缺 18+ 处 `body.dark` | 批量添加 | P0-5 |
| 925-942 | `@media (max-width: 1023px)` 6 行 | 改名为 `@media (max-width: 768px)` 并合并 | P1-1 |
| 941-988 | `@media (max-width: 767px)` 24 行 | 改名为 `@media (max-width: 768px)` 并合并不重复 | P1-1 |
| 末尾新增 | 无 480 断点 | 添加 `@media (max-width: 480px)` 6 行 | P1-1 |
| 458-460 | `.rhm-top__row:hover { transform: translateX(4px); }` | 改为 `translateY(-2px)` | P2-1 |
| 486-490 | `.rhm-top__badge { background: color-mix(10%, transparent); }` | dark 下加 14% | P1-9 |
| 缺 | 无 `:focus-visible` 规则 | 7+ 个交互元素加 `outline: 2px solid var(--color-primary)` | P0-4 |

### 6.5 `frontend/src/components/RatingHistoryModule/RatingPrivacyToggle.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 1-5 | 无 toast import | 添加 `import { useToast } from '../../context/ToastContext'` | P0-3 |
| 8 | 无 `toast` 变量 | `const toast = useToast()` | P0-3 |
| 25 | `alert('切换失败，请重试')` | `toast.error('切换失败，请重试')` | P0-3 |
| 17 | `setOptimistic(null)` 在 catch 内 | 保留 | — |

### 6.6 `frontend/src/components/RatingHistoryModule/RatingRadar.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 22-31 | 9 行 `useEffect` + MutationObserver | **删除** | P0-7 |
| 13 | `const [isDark, setIsDark] = useState(false)` | **删除** | P0-7 |
| 38-41 | 硬编码 `accentColor / gridColor / textColor` | 改为 `var(--color-dim-taste, #e8663e)` 等 | P0-7 |
| 43 | `const fillOpacity = isDark ? 0.4 : 0.3` | 改为固定 0.3 | P0-7 |

### 6.7 `frontend/src/components/RatingHistoryModule/RatingTrendChart.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 42-50 | 9 行 `useEffect` + MutationObserver | **删除** | P0-7 |
| 41 | `const [isDark, setIsDark]` | **删除** | P0-7 |
| 87-88 | 硬编码 `gridColor / textColor` | 改为 `var(--color-border, #e8e0d8)` 等 | P0-7 |
| 末尾 | 缺 Legend | 添加 `<Legend iconType="circle" iconSize={8} />` | P1-11 |

### 6.8 `frontend/src/components/RatingHistoryModule/RatingHistoryList.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 55-67 | `onChange` 直接调 `onSortChange` | 包装一层 setSortLoading 防抖 | P1-2 |
| 64-71 | `<select>` 无 disabled 绑定 | `disabled={sortLoading}` | P1-2 |

### 6.9 `frontend/src/components/RatingHistoryModule/RatingDimensionAverages.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 79-87 | `<span className="rhm-dim-avg__icon">` 无色卡 | 加 `data-dim` 属性或 inline style | P1-8 |

### 6.10 `frontend/src/pages/LoginPage.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 7-10 | 缺 confirmPassword state | 添加 | P1-6 |
| 39-66 | 缺确认密码校验 | 添加 `if (password !== confirmPassword)` | P1-6 |
| 39-66 | 缺邮箱格式校验 | 添加正则 + 失焦 | P1-6 |
| 124, 142 | 输入框无 `disabled={loading}` | 添加 | P1-6 |
| 表单末尾 | 缺确认密码 input | 添加 `<div className="form-group">确认密码</div>` | P1-6 |

### 6.11 `frontend/src/pages/FeedPage.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 246-256 | 错误态只有 `<p>{error}</p>` | 加重试按钮 | P1-3 |
| 39-58 | catch 仅 `setError` | 加 toast.error | P3 候选 |

### 6.12 `frontend/src/pages/HomePage.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 60-87 | catch 静默 `setRecipes([])` | 增加 `fetchError` state 区分 | P1-4 |
| 175-182 | 空态和错误态共用 | 区分渲染 | P1-4 |

### 6.13 `frontend/src/pages/UserProfilePage.tsx`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 263-289 | `handleSaveProfile` catch 静默 | 加 `toast.error` | P1-7 |
| 232-237 | 头像 input 无 `type="url"` | 改为 `type="url"` | P1-7 |
| 575-580 | 模态框 div 缺 `role="dialog"` | 加 `role="dialog" aria-modal="true"` | P2-5 |

### 6.14 `frontend/src/components/StatsCharts/StatsCharts.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 末尾 | 缺 `body.dark` 规则 | 添加 3 条 | P1-12 |

### 6.15 `frontend/src/pages/HomePage.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 166-180 | `@media (max-width: 560px)` 6 行 + `@media (max-width: 380px)` 4 行 | 合并到 `@media (max-width: 480px)` | P1-1 |
| 391-410 | `@media (max-width: 480px)` 26 行 | 合并入 480 单一断点 | P1-1 |

### 6.16 `frontend/src/pages/RecipeDetailPage.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 725, 971, 1185, 1418, 1646, 2063 | `@media (max-width: 768px)` 6 处 | 保持 | P1-1 |
| 733, 1173, 1207, 1680, 1740, 2288, 2490, 2535, 2660 | `@media (max-width: 480px)` 9 处 | 保持 | P1-1 |
| 2282, 2652 | `@media (min-width: 768px) and (max-width: 1023px)` 2 处 | 改 min-width 768 / max-width 1024 或直接删除合并 | P1-1 |
| 2276, 2643 | `@media (min-width: 1024px)` 2 处 | 保留 | — |
| 2288, 2490, 2535, 2660 | `@media (max-width: 767px)` 4 处 | 改 768 | P1-1 |

### 6.17 `frontend/src/pages/FeedPage.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 381-405 | `@media (max-width: 768px)` 25 行 | 保留 | — |
| 末尾 | 无 480 断点 | 添加 `@media (max-width: 480px)` 8 行 | 原因 |

### 6.18 `frontend/src/components/AchievementsPanel/AchievementsPanel.css`

| 行号 | 现状 | 改动 | 原因 |
|---|---|---|---|
| 末尾 | 有 360 断点 | 删除（除非业务确认） | P1-1 |

---

## 7. 验收标准（10 条）

> Tester 直接照这 10 条勾选。

### AC-1. 暗色铁律合规
```bash
grep -rEn "^\.dark " frontend/src/components/ActivityHeatmap.css
# 期望：0 行匹配
```

### AC-2. 暗色 bg-secondary 在 light 模式生效
```bash
# 浏览器 dev 工具切到 light 模式
# 选 .rhm-section__placeholder
# computed style → background-color: rgb(245, 240, 235)  ✅
# 切到 dark 模式 → rgb(26, 26, 46)  ✅
```

### AC-3. 用户主页 4 模块标题字号一致
- `.rhm-module__title` / `.achievements-panel__title` / `.activity-heatmap__title` / `.stats-charts__title` **都 = 18px**（dev 工具 computed）

### AC-4. 响应式 5 断点无横向滚动条
- 360 / 480 / 768 / 1024 / 1440 宽度下，用户主页 / 动态流 / 首页 / 详情 / 登录 **无横向滚动**
- 480 以下 `.rhm-dim-avg` 单列，4 个卡不挤压

### AC-5. 键盘 Tab 焦点可见
- Tab 键依次聚焦：用户主页"我的评分历史"标题 → 隐私开关 → 排序下拉 → 趋势图 4 个时间范围 → "我的 TOP 5"高分榜/低分榜 tab → "查看更多"按钮 → 加载更多 → ...
- **每个聚焦元素都看到 2px 实线 outline 焦点环**

### AC-6. 排序/时间范围切换不会触发并发请求
- 浏览器 dev 工具 Network 标签
- 在排序下拉快速点 3 次不同选项
- **期望：1 个请求**（最后一个）发出

### AC-7. 隐私切换失败用 toast 而非 alert
- 后端 `putUserRatingPrivacy` 临时改 500
- 切换隐私
- **期望**：右上角 toast 红色提示，**无** alert 弹窗

### AC-8. 错误态有重试按钮
- 断网 → 刷新动态流
- **期望**：页面显示"加载失败" + "重新加载"按钮（不是空白）
- 点击 → 重新请求

### AC-9. ActivityHeatmap 加载态不是裸文字
- 切到用户主页
- Network throttle "Slow 3G"
- 热力图区域显示 **30 个 shimmer 方块**，不是"加载活动数据..."文字

### AC-10. 注册流程：邮箱格式 + 确认密码
- 注册页输入邮箱 "abc" → 失焦 → 输入框红框 + 错误提示
- 注册页输入密码 123 + 确认密码 456 → 提交 → toast "两次密码不一致"
- 加载中：所有输入框 disabled（半透明）

---

## 附录 A：涉及文件清单

| 类别 | 文件 | 行数 |
|---|---|---|
| 全局 | `frontend/src/global.css` | ~3000 |
| 新组件 CSS | `frontend/src/components/RatingHistoryModule/RatingHistoryModule.css` | 1003 |
| 新组件 TSX × 9 | `frontend/src/components/RatingHistoryModule/*.tsx` | ~1400 |
| 邻居组件 | `ActivityHeatmap.css` / `ActivityHeatmap.tsx` | ~150 |
| 邻居组件 | `AchievementsPanel/AchievementsPanel.css` | ~200 |
| 邻居组件 | `StatsCharts/StatsCharts.css` | 133 |
| 用户主页 | `pages/UserProfilePage.tsx` / `.css` | 794 + 890 |
| 关键页面 | `pages/HomePage.tsx` / `.css` | 470 + 515 |
| 关键页面 | `pages/FeedPage.tsx` / `.css` | 472 + 476 |
| 关键页面 | `pages/LoginPage.tsx` / `.css` | 196 + 174 |
| 关键页面 | `pages/RecipeDetailPage.css` | 2714 |

## 附录 B：变更统计

| 类别 | 数量 |
|---|---|
| P0 优化项 | **7** |
| P1 优化项 | **12** |
| P2 优化项 | **9** |
| 涉及文件 | **17** |
| 涉及行数（估） | ~6000 |
| 总工时（估） | P0 = 1.5h / P1 = 4h / P2 = 4h / **总计 ≈ 9.5h** |

## 附录 C：参考案例

- 隐私开关优化可参考 `FavoriteNoteModal.tsx` 的乐观更新 + 错误回滚模式
- ActivityHeatmap shimmer 骨架可参考 `RecipeCardSkeleton.tsx`
- 雷达图/趋势图去 MutationObserver 可参考 `DimensionRadar.tsx`（已在 #134 commit `6f47781` 修复类似问题）

---

> **本文档由 ui-designer 子专家产出，可直接作为全栈专家的施工蓝图。**
