# Code Review Report — 迭代 #134 用户个人评分历史可视化

**评审员**: Code Reviewer Agent
**评审时间**: 2026-06-12
**评审范围**: 后端 + 前端全栈实现（PRD/ARCH/UI 三份规范的代码实现忠实度 + 安全性 + AC 对齐）
**评审材料**:
- PRD v1.0 (`PRD-rating-history.md`)
- ARCH v1.0 (`ARCH-rating-history.md`)
- UI v1.0 (`UI-rating-history.md`)
- Plan Review (`REVIEW-plan.md`)
- 实现文件（14 新 + 8 改 / 净增 3493 行）

---

## 1. 总体评级

**NEEDS-REVISION** — 后端实现质量高、规格匹配良好；前端组件层完整且符合 UI 规范；**但前端 `api.ts` 中 5 个新 API 方法的响应解包逻辑存在统一 P0 缺陷（`r.data?.data` 应为 `r.data`），导致模块在前端静默失败 + 隐私保护失效**。修复后即可进入测试+部署。

---

## 2. 一句话总结

后端结构与缓存策略忠实于 ARCH，前端 9 组件/CSS 完整对齐 UI；但 `api.ts` 5 个新方法把 `response.data.data` 当成响应体（实际经响应拦截器已被解包），造成全模块数据为空 + 隐私私有用户对他人的隐藏失效 — 必须修复。

---

## 3. 评审矩阵

| 维度 | 评级 | 关键发现 |
|---|---|---|
| **A. 后端代码质量**（ARCH §8.2） | **PASS** | ①`utils/cache.js` 封装正确（max=1000, lru-cache@^10, ttlAutopurge, delByPrefix 遍历实现）；②`scripts/add-rating-history-indexes.js` 用 `SHOW INDEX` 检查幂等；③`userRatings.js` 4 端点（summary/history/top/privacy）实现完整、隐私 PUT 含鉴权 `req.userId === userId`；④`commentGlobalStats.js` 全站聚合 + 1h 缓存；⑤`app.js` 路由通过 `routes/index.js` 注册；⑥`models/comment.js` 追加 2 索引（`idx_comment_userId_rating` + `idx_comment_userId_recipeId_createdAt`）；⑦`comments.js` POST/DELETE 加 `invalidateRatingCaches` 同步失效；⑧`package.json` 依赖 `lru-cache@^10.4.3` 已就位。**小瑕疵**：`comments.js` 的 `invalidateRatingCaches` 同时清 `rating:privacy:` 单 key，但该 key 从未被 `set`（privacy 端点不缓存）— 多余但无害。 |
| **B. 前端代码质量**（ARCH §8.3） | **PASS-WITH-COMMENTS** | ①`api.ts` 新增 5 API 方法（`getUserRatingSummary/History/Top/Privacy` + `putUserRatingPrivacy` + `getCommentGlobalStats`）+ 4 TS 接口（`RatingSummary`/`RatingHistoryItem`/`RatingHistoryResponse`/`RatingPrivacy` + `RatingDimensionAverages`/`RatingDistribution`/`RatingTrendPoint`/`RatingHistoryItem`/`GlobalRatingStats` 共 8 个，含 `RatingTopItem` 由 `RatingHistoryItem` 复用）— **接口齐**；②`RatingHistoryModule/` 9 个子组件 + 桶导出 `index.ts`（含 default + 8 named export）— **齐全**；③`RatingHistoryModule.css` 1003 行 ≈ UI §8 估算的 1380 行（受优化影响偏低），变量+暗色双套 + 响应式断点齐全；④`DimensionRadar.tsx` 扩展了 `multiColor` prop + `tooltipFormatter` prop（ARCH §7 风险第 7 条），向后兼容；⑤`UserProfilePage.tsx` 在 `ActivityHeatmap`(583) → `AchievementsPanel`(586) → **`RatingHistoryModule`(589-598)** → `StatsCharts`(600) 插入；⑥`global.css` 11 个新 CSS 变量（4 维色卡 + delta ×3 + sample ×2 + gate ×1 + 1 漏？）在 `:root` + `body.dark` 双套（行 228-237 浅色 / 260-269 暗色）— **齐全**。**位置偏差**：UI §1.1 明示插入点为 "ActivityHeatmap 与 AchievementsPanel 之间"，但实现是 "AchievementsPanel 与 StatsCharts 之间" — **与 UI 规范不一致**，但与 ARCH §2.1 一致（ARCH 已与 PRD 7.1 有差异并以 ARCH 为准）。Review 应在文档中决议。 |
| **C. PRD 10 条 AC 对齐** | **MIXED** | 见 §7 表 — 6/10 ✅，1/10 ⚠️（P0 bug 导致前端失效），3/10 🔍（需手动验证）。 |
| **D. 数据一致性** | **PASS** | ①`getRecipeLatestCreatedAt` 用 `GROUP BY recipeId + MAX(createdAt)` 子查询实现"取最新"去重；②4 维全 NULL 过滤用 `c[dim] != null`（AC-06 满足）；③缓存失效走路由层 hook（POST 评论行 390 + DELETE 评论行 551），非 Sequelize hook，路径与 ARCH §1.7.3 一致；④`PUT /privacy` 调 `delByPrefix('rating:summary:'+userId)` + `delByPrefix('rating:top:'+userId)` 主动失效（**不依赖 TTL**）— 强失效满足 AC-05。 |
| **E. 性能可行性** | **PASS** | ①LRU key 前缀 + TTL 区分（summary/top=5min, site=1h）；②趋势图按月聚合 + `slice(-60)` 上限；③分布 5 行无大数据问题；④分页 `pageSize` hard cap 20；⑤`/summary` 内联读 site 缓存避免 DB 二次 round-trip；⑥`getRecipeLatestCreatedAt` 用 1 次 SQL（`MAX+GROUP BY`）拿到所有去重键，避免 N+1。 |
| **F. 关键坑处理** | **PASS-WITH-COMMENTS** | ①lru-cache@^10 API 正确（`LRUCache` named export + `set(k,v,{ttl})` 覆盖）；②`cache.js` `module.exports = {get, set, del, delByPrefix, clear, stats}` 全部具名导出，调用方按需取 — **default export 决议**：本项目用 named export，调用方一致（注释清晰）；③Vite build 不跑 tsc：项目 `frontend/package.json` `"build": "vite build"` 确认；④`recipeCoverUrl` 相对路径：与项目现有 `RecipeCard.tsx` 用 `recipe.coverImage` 直接作 `src` 的模式一致（已有项目约定）。**Code Review 决议**：沿用现有约定，不强制转绝对 URL — **P2**。 |
| **G. 安全性** | **NEEDS-REVISION** | ①**鉴权**：privacy PUT 用 `req.userId !== userId` 防越权 ✅；其他 GET 端点无鉴权（公开数据）— 与 PRD §4.1 一致；②**SQL 注入防护**：`userRatings.js:validateDimension` 维度白名单 ✅（含 'overall'→'rating' 映射）；`order` 字段固定 `'DESC'/'ASC'` 字符串非拼接 ✅；③**UUID 类型校验**：**缺失** — 后端未对 `userId` 做 UUID 格式校验（项目惯例 `users.js` 也未做），由 Sequelize 隐式处理。P2；④**隐私私有时的越权防护**：API 端点对外公开，但前端层用 `if (!isOwner && !privacyPublic)` 拦截渲染 — **存在 P0 漏洞**（见 §4-P0-1）；⑤**XSS 防护**：评论 `commentText` 走 `substring(0, 80)` 截断后 React 自动 escape；6 维分数字走 `toFixed(1)` 转字符串；`recipeTitle` 由 React escape ✅。 |

---

## 4. P0 阻塞项（必须修改才能进部署）

### P0-1【前端 P0 阻塞】5 个新 API 方法响应解包错误 — 静默失败 + 隐私保护失效

**位置**：`frontend/src/api.ts:2677-2732`（5 个新增 API 方法）

**问题**：
项目已存在 `apiClient.interceptors.response.use(response => response.data)` 拦截器（第 31 行），会把 axios envelope 拆掉一层。所以 `r` 在 `.then(r => ...)` 中**已经是**响应体（即 `{code, message, data: <inner>}`），不需要再访问 `r.data` 来获取响应体。

但新增的 5 个方法都写成了：
```ts
return apiClient.get(`/users/${userId}/ratings/privacy`).then(r => r.data?.data)
```

实际执行：
- `r = {code: 0, message: 'ok', data: {userId, ratingsHistoryPublic: true}}`
- `r.data` = `{userId, ratingsHistoryPublic: true}`（内层 data）
- `r.data?.data` = `innerData.data` = **`undefined`**

**后果**：
1. **数据全为空** — `RatingHistoryModule` 4 个并发接口（summary/topHigh/topLow/history）都返回 undefined，触发 `?.items || []` 兜底为空数组，模块进入"无评分数据"或"无排行榜"显示，**用户感受为"模块坏了"**。
2. **隐私保护失效** — `UserProfilePage.tsx:266-272`：
   ```ts
   getUserRatingPrivacy(id).then(res => {
     if (res && typeof res.ratingsHistoryPublic === 'boolean') {
       setRatingsHistoryPublic(res.ratingsHistoryPublic)
     }
   })
   ```
   `res` 是 undefined → `if` 条件 false → 保持默认 `true` → **隐私设为"私有"的用户，其主页对他人显示完整评分历史模块**（违反 AC-05、PRD §4.1、UI §3.9 RatingPrivacyGate）。这是**数据合规问题**。

**修复方向**（reviewer 不给代码）：
- 选项 A（推荐）：5 个方法改为 `.then(r => r.data)`，与项目其他 `(r => r.data?.data || r.data)` 防御性写法对齐即可。
- 选项 B：在请求拦截器保留响应包装，但所有调用方统一通过 `r.data.data` 访问 — 需要改动 200+ 处调用方，不推荐。

**验证方式**：前端运行后访问 `/profile/<某个真实用户>`，DevTools 看 `getUserRatingPrivacy` 响应 + Network 标签确认 `data.data` 为 undefined，然后确认 `setRatingsHistoryPublic` 是否被调用（应当未被调用）。

### P0-2【前端 P0 阻塞】模块插入位置与 UI 规范不一致

**位置**：`frontend/src/pages/UserProfilePage.tsx:586-598`

**问题**：
- UI §1.1 明确写："本规范以 **ARCH §2.1 为准**（位于 `ActivityHeatmap` 与 `AchievementsPanel` 之间）"
- UI §1.1 草图位置：ActivityHeatmap → **RatingHistoryModule** → AchievementsPanel → StatsCharts
- ARCH §2.1 文字也写"在 `AchievementsPanel` 之后、`StatsCharts` 之前"
- **实际代码**：ActivityHeatmap(583) → AchievementsPanel(586) → **RatingHistoryModule(589-598)** → StatsCharts(600) — **位于 AchievementsPanel 之后而非之前**

**影响**：
- 视觉叙事的"个人向 → 个人成就"承接断裂
- 与 UI 设计稿（§1.1 ASCII 图）不符，UI 设计师在像素级验收时会拒绝
- 文档与实现的不一致会成为后续维护的认知负担

**修复方向**（reviewer 不给代码）：将 `<RatingHistoryModule>` JSX 块从 `AchievementsPanel` 之后移到 `ActivityHeatmap` 之后，**同时**将 PRD 7.1/UI §1.1 草图与 ARCH §2.1 文字**统一为同一位置**（建议以 UI §1.1 为准，更新 ARCH §2.1）。

---

## 5. P1 强烈建议（部署前最好修改）

### P1-1【前端 UX】`RatingPrivacyToggle` 的 `userId` 取自 localStorage 而非 props — 边界场景下 P403

**位置**：`frontend/src/components/RatingHistoryModule/RatingPrivacyToggle.tsx:39`

**问题**：
- 组件读取 `localStorage.getItem('user')`/`'currentUser'` 解析 `user.id` 或 `user.userId` 作为 `userId` 调 PUT API
- 该 `userId` 应当等于**当前 profile 的 userId**（已通过 `isOwner` prop 验证），但若 localStorage 残留旧用户数据（如登出未清理），会导致 PUT 的 URL 路径与 auth token 的 `req.userId` 不匹配 → 后端 403 → 用户看到"切换失败，请重试"
- 此外，依赖 localStorage 与项目其他地方使用 `AuthContext` 模式不一致

**修复方向**：将 `userId` 通过 props 显式传入（容器组件已经有此 prop），并与 `isOwner` 双重校验；`getCurrentUserId` 函数可移除。

### P1-2【后端健壮性】`userRatings.js` 的 summary/history 都先 `User.findByPk` 再查评论 — 重复 user 校验

**位置**：`userRatings.js:90, 173, 305, 425, 512`

**问题**：
- 4 个端点都做了 `User.findByPk(userId, { attributes: ['id'] })`，每个请求多一次 DB round-trip
- 不存在时返回 404，但用户不存在时 `Comment.findAll({where:{userId}})` 自然返回空集，**业务上等价**（只是 user-not-found 与"无评分"在前端无法区分）
- 如果是为了给前端"用户不存在"信号，可保留 history/top 的 user 校验（用户访问不存在的 profile 报 404 是合理的），但 summary 的 user 校验可省（summary 永远是当前已登录用户自己的）

**修复方向**：history/top 保留 user 校验（公开端点），summary 可省；或者把 user 校验下沉到 `getRecipeLatestCreatedAt` 之前的统一 middleware。

### P1-3【前端 UX】`RatingHistoryModule` 容器 fetchInitial 失败时 `setError(true)`，但 `Promise.allSettled` 单个 rejected 不会触发外层 try/catch

**位置**：`frontend/src/components/RatingHistoryModule/RatingHistoryModule.tsx:99-118`

**问题**：
- 用 `Promise.allSettled` 内部已 settled 不会 reject
- 外层 `try/catch` 永远不会捕获 `allSettled` 抛错（allSettled 永不 reject）
- `setError(true)` 路径实际不可达 → **错误占位/重试按钮永远不会显示**，API 故障时用户卡在骨架屏

**修复方向**：把 `setError(true)` 放在 `allSettled` 内部，统计 `rejected` 个数，若全部 4 个都 rejected 才置 error；或干脆改成 `Promise.all`，4 个全成功才 OK，任一失败时使用兜底空数据 + 单个模块降级。

### P1-4【后端缓存】`comments.js` 的 `invalidateRatingCaches` 调用 `cache.del('rating:privacy:'+userId)`，但 privacy 端点不写入该 key — 多余调用

**位置**：`backend/routes/comments.js:39-43`

**问题**：
- `userRatings.js` 中 `privacy` GET/PUT 均**不写** `rating:privacy:` 这个 key
- `invalidateRatingCaches` 每次都尝试 `del` 一个不存在的 key（lru-cache 的 `delete` 对不存在 key 返回 false，无副作用但浪费 log 输出）
- 注释写"私有偏好缓存（如有）也清除"是 forward-looking 注释，但当前无对应写入点

**修复方向**：删除 `privCount = cache.del('rating:privacy:'+userId)` 这一行；或将 privacy GET/PUT 改为使用 `rating:privacy:{userId}` 缓存以兑现注释意图（但当前 ARCH §1.7.2 明确说 privacy 不缓存，建议保持 ARCH 一致，删行）。

### P1-5【前端 P1】RatingRadar 组件中 `Tooltip` 触发依赖 Recharts `onMouseEnter`，hover 顶点时需 mouseover 到数据点 — 移动端 tap 行为不明确

**位置**：`frontend/src/components/RatingHistoryModule/RatingRadar.tsx:74-95`

**问题**：
- UI §6.1 写 AC-09："hover 任一顶点，显示该维度的具体平均分 + '基于 X 次评分'"
- 实现走 Recharts `Tooltip`，需 mouseover 到圆点（数据点）才触发，**不是 hover 顶点（维度名）**
- AC-09 字面要求"hover 顶点"，实现是"hover 数据点" — **功能等价但触发区域不同**
- UI-Q-05 决议"移动端用 tap" — 移动端 tap 数据点更不自然

**修复方向**：在 `PolarAngleAxis.tick` 上挂 `onMouseEnter/Leave` 手动控制 tooltip 显示（参 ARCH §2.2 "扩展"）；或用 `onMouseOver` 监听 RadarChart 容器以更鲁棒。或评审时确认 AC-09 措辞可放宽为"hover 雷达图区域"。

### P1-6【后端 P1】`userRatings.js` summary 在 `dedupeConditions` 为空时**写空结果到缓存** — 边界 OK 但加 TTL 5min 后用户评第一条评论，前端首屏仍是 0 数据直到 TTL 到期

**位置**：`backend/routes/userRatings.js:114-130`

**问题**：
- 0 评分用户走 cache miss → 写空 summary 进 5min TTL
- 用户评了第一条评论后，`comments.js` 的 `invalidateRatingCaches` 会清掉该 key（`delByPrefix('rating:summary:'+userId)`）— **已解决**
- 但 history/top 的缓存**写入时机**也有类似问题：如果用户没有评论时 GET /history，会进 `if (dedupeConditions.length === 0)` 分支返回空 data 但**不写缓存**（直接 `res.json` 返回，未 `cache.set`）— **实际 OK**。但 summary 走的是 `cache.set(cacheKey, empty, TTL_SUMMARY)`，与 history 不一致。**不是 bug**但**风格不一致**。

**修复方向**：要么 history/top 走空也写缓存（提升首屏 hit 率），要么 summary 也不写（保持一致）。建议不写：空结果应当每次走 DB 校验，确保不丢新评论。

---

## 6. P2 提示（后续迭代可优化）

| 编号 | 位置 | 描述 |
|---|---|---|
| P2-1 | `userRatings.js:14, 102` | `Op, fn, col, literal` 导入了 `literal` 但未使用，可清理 |
| P2-2 | `userRatings.js:30-37` | `parseTimeRange` 对非法值兜底为 `null` (all)，与 ARCH §5 "API-1 timeRange 非法 → 400" 不一致；建议返回 400 而非静默兜底 |
| P2-3 | `userRatings.js:18` | `mergeParams: true` 在新 Express Router 中不必要（未在父路由用 `:userId` 占位符），可移除 |
| P2-4 | `commentGlobalStats.js:23-25` | 用 `require('sequelize').Op` 在函数内部反复 require，可提到顶部 `const {Op} = require('sequelize')` 减少开销 |
| P2-5 | `commentGlobalStats.js:88-92` | `module.exports.computeGlobalStats = ...; module.exports.CACHE_KEY = ...; module.exports.CACHE_TTL_MS = ...` 这种"挂载属性"导出方式与项目其他模块不统一；建议改 `const exports_ = {...}; module.exports = exports_` 一次性导出 |
| P2-6 | `DimensionRadar.tsx:108-122` | `multiColor` 模式用 4 个独立 `<Radar>` 叠加，每个 `dataKey` 用 `(entry) => entry.dimKey === dim ? entry.value : 0`，导致非选中维度传 0 — 视觉上正确但有 4 倍渲染开销；大数据时考虑用 `dataKey={dim}` + `data` 拆 4 个 |
| P2-7 | `RatingHistoryModule.tsx:131-139` | `useEffect(() => { ... }, [trendRange, userId, inView])` 会在 userId 变化时重拉 summary，但 `fetchInitial` 内部已含 summary，**会重复请求** 1 次。可加 guard：`if (summary == null) return` |
| P2-8 | `userRatings.js` summary 端点 | 未使用 `Op.and` 的子查询去重（按 ARCH §3.1 SQL 模板），而是用 `Op.or` + 应用层构造 `dedupeConditions` 数组 — **等效 SQL**（展开后是 `WHERE userId=? AND parentId IS NULL AND (recipeId=? AND createdAt=? OR ...)`），但 ARCH §3.1 模板是 `IN (SELECT MAX...)` 形式；建议加注释说明等价性 |
| P2-9 | `RatingEmptyState.tsx` | L1 极少状态未提供独立占位文案（"再评 X 条就能看到..."由各子组件用 placeholder 表达），与 UI §3.9 表一致但分散在多处；可考虑抽出共享占位组件 |
| P2-10 | 全局 | UUID 格式校验：后端 `userId` 参数无格式校验（项目惯例），未来若允许 `id` 字段类型变更需补 |
| P2-11 | `RatingPrivacyToggle.tsx:59-65` | `getCurrentUserId` 函数从 localStorage 读，项目其他处用 `useAuth` hook；建议迁移到 hook 统一 |
| P2-12 | `RatingHistoryModule.css` | 1003 行 — 建议拆分为 `RatingHistoryModule.css` + 子组件 scoped CSS，但项目其他大组件（`StatsCharts.css`、`CommentSection.css`）也是单文件，可保持一致 |
| P2-13 | `cache.js` | 未导出 `LRU` 实例句柄，外部无法做"原子递增 + 失效"等高级操作；可加 `getInstance()` 方法 |

---

## 7. AC 对齐表（10 条 AC 各自状态）

| AC | 描述 | 状态 | 证据 / 备注 |
|---|---|---|---|
| AC-01 | 4 维平均仅纳入 `> 0`（实际 `IS NOT NULL`），保留 1 位小数 | ✅ 通过 | `userRatings.js:181-189` 用 `c[dim] != null` 过滤 + `Math.round(... * 10) / 10` 1 位小数；**前端 P0 bug 不影响此条**（API 本身正确） |
| AC-02 | TOP 5 高/低按 `rating` 排序，同食谱多次评分只取最新 | ✅ 通过 | `userRatings.js:470-477` order by `rating DESC/ASC` + `getRecipeLatestCreatedAt` 去重 |
| AC-03 | 删除评论后 30s 内历史/平均/分布/趋势/TOP 5 全部同步 | 🔍 需手动验证 | 后端 `comments.js:551` 同步调 `invalidateRatingCaches` 失效 `rating:summary:*` + `rating:top:*` + `site:dimAverages` — 同步路径正确，但需 e2e 验证"删除后下次 GET 是否真返回新数据"（缓存 invalidate 已确保下次 miss）。**前端 P0 bug 导致此条无法在前端验证** |
| AC-04 | 未登录访问 `/profile/{anyUserId}` 看到"登录后查看"占位 | ⚠️ 部分通过 | 后端未限流（公开），由前端 `RatingHistoryModule.tsx:163-167` `if (!isLoggedIn) return <RatingEmptyState variant="login" />` 拦截；**前端 P0 bug 不影响此条**（即便 API 失败，未登录分支也走占位）。但**注意**：未登录用户仍能 curl `/api/users/<uuid>/ratings/summary` 拿到完整数据 — 这是**数据泄露**，建议后端在所有 ratings 端点也加 `auth` 中间件，或在 summary 端点对未登录返回 401 |
| AC-05 | 隐私私有用户，他人访问看到"该用户未公开"，本人可见完整 | ❌ 未实现 | **P0-1 阻塞**：`getUserRatingPrivacy` 返回 undefined → 父级 state 永远为默认 `true` → 他人看到完整模块；本人侧 OK（`isOwner` 分支） |
| AC-06 | 4 维全 NULL 旧评论不计入 4 维平均，但计入总评分次数 | ✅ 通过 | `userRatings.js:178-180` `validDimensionRatings = 4 维任一非 NULL`；`totalRatings = rating IS NOT NULL`（行 174-175），与 ARCH §3.2 一致 |
| AC-07 | "查看更多"按钮精确加载 10 条 | ✅ 通过 | `RatingHistoryList.tsx:131-137` `onLoadMore → pageSize: 10`；后端 hard cap 20（`userRatings.js:154-156`） |
| AC-08 | 点击历史行跳 `/recipes/{recipeId}?from=profile` | ✅ 通过 | `RatingHistoryList.tsx:75` `to={`/recipes/${item.recipeId}?from=profile`}`；`RatingTopList.tsx:51` 同样 |
| AC-09 | 雷达图 hover 顶点显示平均分 + 评分数 | 🔍 需手动验证 | 实现走 Recharts `Tooltip`（hover 数据点触发），非 hover 维度顶点；**功能等价但触发区域不同**（P1-5），需 e2e 验证用户感知 |
| AC-10 | P95 首屏 < 800ms | 🔍 需手动验证 | 架构层满足（3 并发 + 5min 缓存），但前端 P0 bug 导致首屏实际无数据，**无法 e2e 测真实性能**；修复 P0-1 后用 Lighthouse / Chrome DevTools 跑 P95 |

**AC 通过统计**：✅ 6 条 / ⚠️ 1 条 / ❌ 1 条 / 🔍 3 条（其中 2 条因 P0 bug 暂无法 e2e，1 条触发区域与规范差异需确认）

---

## 8. 评审签字

| 项 | 状态 |
|---|---|
| A. 后端代码质量 | ✅ PASS |
| B. 前端代码质量 | ✅ PASS-WITH-COMMENTS |
| C. PRD 10 条 AC 对齐 | ⚠️ MIXED（6/10 通过，1/10 部分，1/10 失败，2/10 需验证） |
| D. 数据一致性 | ✅ PASS |
| E. 性能可行性 | ✅ PASS |
| F. 关键坑处理 | ✅ PASS-WITH-COMMENTS |
| G. 安全性 | ⚠️ NEEDS-REVISION（隐私保护因 P0-1 失效） |
| **P0 阻塞项** | **2**（P0-1 API 解包 / P0-2 插入位置） |
| **P1 强烈建议** | 6 |
| **总体评级** | **NEEDS-REVISION** |
| **是否进入测试+部署** | **NO**（须先修 P0-1 与 P0-2） |

**建议下一步**：
1. 修复 P0-1（5 个 API 方法 `.then(r => r.data?.data)` → `.then(r => r.data)`，或 `.then(r => r.data?.data || r.data)` 防御版）
2. 修复 P0-2（移动 `<RatingHistoryModule>` JSX 块到 `ActivityHeatmap` 之后，并同步 ARCH/UI 文档）
3. 修复后再跑一次 frontend 集成 smoke（5 个端点实际渲染）
4. 修复后转 PASS，进入测试 + 部署

---

*评审结束*
