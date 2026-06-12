# ARCH：用户个人评分历史可视化 — 技术方案

**迭代编号**：#134
**架构师**：Architect Agent
**文档版本**：v1.0
**最后更新**：2026-06-12
**对应 PRD**：[`PRD-rating-history.md`](./PRD-rating-history.md)
**状态**：待评审

---

## 0. 关键事实校对（来自代码核查）

| 项 | PRD 假设 | 实际代码 | 处置 |
|---|---|---|---|
| 评分字段名 | `tasteRating` / `difficultyRating` / `presentationRating` / `valueRating` / `overall` | `taste` / `difficulty` / `presentation` / `value` / `rating`（见 `backend/models/comment.js:24-66`） | **API 用真实字段名**（taste/difficulty/presentation/value/rating），PRD 字段名为概念示意，文档需统一 |
| 字段类型 | int 1-5，0 表示未评分 | `INTEGER` + `allowNull: true`，validate 1-5，**未评分 = NULL**（见 `models/comment.js:24-50`） | "4 维全 0" 规则在代码中**不存在**（`0` 会被 validate 拒绝）。实际"未评分"是 NULL |
| userId / recipeId 类型 | int | `UUID`（见 `models/comment.js:86, 95`） | URL 用 `:userId` 但实际是 UUID 字符串，路由参数是字符串 |
| 软删除 | 启用 | **未启用**（`models/comment.js:147-156` 中没有 `paranoid: true`，无 `deletedAt` 字段） | 物理删除；`deletedAt` 过滤自动处理这一条 PRD 规则**简化为不适用** |
| 后端缓存 | 推测有 Redis | **无 Redis 依赖**（`backend/package.json` 不含 ioredis/redis），无统一 cache 模块；`utils/` 中无 cache 工具 | 采用**进程内 LRU 缓存**（轻量、零基础设施），并标注"未来可平滑升级 Redis" |
| 全站聚合 baseline | `GET /api/recipes/comments/global-stats`（PRD 推测存在） | **不存在**（全局搜索 `global-stats` / `site:dimAverages` 无结果） | **必须新增**全站维度平均 API（API-1 依赖） |
| 隐私字段 | 新建 `ratingsHistoryPublic` 字段 | 现有 `User.preferences` JSON 中已有 `privacy.collectionVisibility` / `cookingLogVisibility`（见 `routes/settings.js:34-37, 132-152`） | **复用**现有 `preferences.privacy.ratingsHistoryPublic` 字段，不新增 User 模型字段 |

---

## 1. 后端 API 实现策略

### 1.1 API 总览

| 编号 | 端点 | 方法 | 用途 | PRD 引用 |
|---|---|---|---|---|
| API-1 | `/api/users/:userId/ratings/summary` | GET | 4 维平均 + 全站对比 + 分布 + 趋势 | F-01, F-02, F-04, F-05, F-06 |
| API-2 | `/api/users/:userId/ratings/history` | GET | 评分历史分页列表 | F-03, F-09, F-10 |
| API-3 | `/api/users/:userId/ratings/top` | GET | TOP 5 高/低分 | F-07 |
| API-4 | `/api/users/:userId/ratings/privacy` | GET / PUT | 隐私设置 | F-11 |
| API-5（依赖） | `/api/comments/global-stats` | GET | **全站** 4 维维度平均（供 API-1 内联或独立调用） | PRD 6.1 siteAverage |

> **API-4 设计决定**：不复用 `PUT /settings/privacy`（它对 ratingsHistoryPublic 字段不感知），而新建 `/api/users/:userId/ratings/privacy` 端点，**统一读写**到 `User.preferences.privacy.ratingsHistoryPublic`，前端模块只关心单一字段、不污染通用隐私端点。

### 1.2 API-1：summary 聚合策略

**核心查询**：基于 `Comment` 模型，做 **3 类子查询**并行：

1. **个人 4 维平均**（一次 SQL 完成，避免 4 次 round-trip）
2. **个人分布**（4 个维度的 `COUNT GROUP BY value`，1 次 SQL 或 4 次）
3. **个人按月趋势**（`DATE_FORMAT(createdAt, '%Y-%m')` + `GROUP BY`，1 次 SQL）
4. **个人总评分次数**（`COUNT` + 子查询判断"4 维全 NULL" 的旧评论）
5. **全站 4 维平均**（API-5 缓存返回，1 次缓存读）

**实现方式**：Sequelize `findAll` + `attributes` + `fn` + `group`。**示例查询骨架**（不写实现代码）：
- 4 维平均：用 `sequelize.fn('AVG', sequelize.col('taste'))`，包裹 `Op.and: [{ [Op.ne]: null }]` 的 where 条件
- 分布：用 `sequelize.fn('COUNT', '*')` + `group: ['taste']`（按维度分别 4 次）
- 趋势：用 `sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')` + `group: [literal("DATE_FORMAT(createdAt, '%Y-%m')")]`

**去重**（同一食谱多次评分）：子查询或窗口函数取 `createdAt` 最新一条。Sequelize 6 不直接支持窗口函数，用 `Op.and` 子查询：先 `MAX(createdAt)` 拿每个 recipeId 的最新，再 `IN` 联合查询。**或者**用原始 `sequelize.literal` 拼接 `WHERE (userId, recipeId, createdAt) IN (SELECT userId, recipeId, MAX(createdAt) FROM comments WHERE userId = ? GROUP BY recipeId)`。

**`timeRange` 过滤**：在所有子查询的 where 上加 `createdAt >= NOW() - INTERVAL`（30d/90d/1y）。

**全站平均注入**：API-1 handler 启动时**先**从进程内缓存读 `site:dimAverages`，若 miss 则调用 API-5 handler 或内部 inline 函数计算；命中则直接合并入 response，不增加 DB round-trip。

### 1.3 API-2：history 分页策略

**查询骨架**：在 `Comment` 上 `findAndCountAll`，where 仅含 `userId` + `parentId: null`（取顶级评论）+ 可选 `createdAt >= since`。

**JOIN Recipe**：用 `include: [{ model: Recipe, as: 'recipe', attributes: ['id', 'title', 'coverImage'] }]` 拿标题和封面。

**排序**：
- `time_desc`：默认 `[['createdAt', 'DESC']]`
- `rating_desc` / `rating_asc`：`[['rating', sort === 'rating_desc' ? 'DESC' : 'ASC'], ['createdAt', 'DESC']]`（同分时按时间 tiebreak）
- `dimension` 参数（仅 `rating_*` 时生效）：用 `order: [[sequelize.col(dimension), orderDir]]`（列名经白名单校验，仅接受 5 个值，防止 SQL 注入）

**同一食谱多次评分的去重**：仍走"取最新一次"——按 `recipeId` 子查询取 `MAX(createdAt)`，作为主查询的 `where` 条件。

**Response 字段映射**（前端实际拿到的）：
- `recipeId` ← `Comment.recipeId`（UUID）
- `recipeTitle` ← `Recipe.title`
- `recipeCoverUrl` ← `Recipe.coverImage`（**注意字段名是 coverImage，不是 coverImageUrl**，PRD 用了 coverUrl）
- `ratings.overall` ← `Comment.rating`（不是 `overall`，见字段校对）
- `ratings.{taste,difficulty,presentation,value}` ← 直接映射
- `createdAt` ← `Comment.createdAt`

### 1.4 API-3：top 列表策略

**实现**：基于 API-2 的同款查询，加 `limit=5` + 排序固定。
- `type=high`：`order: [['rating', 'DESC'], ['createdAt', 'DESC']]`
- `type=low`：`order: [['rating', 'ASC'], ['createdAt', 'DESC']]`
- `limit` 上限 10（防滥用）

**去重**同样走"按 recipeId 取最新"逻辑。

**为什么独立端点而非复用 history**：单条 SQL + 固定 limit 比 history 的多条件分页简单得多，可独立缓存，且 history 走分页的索引不同。

### 1.5 API-4：privacy 端点策略

**GET**：读 `User.preferences`，parse JSON（`parsePrefs` 已有），返回 `privacy.ratingsHistoryPublic`（默认 `true`，与 PRD 4.3 一致）。
**PUT**：只接受 `ratingsHistoryPublic` 字段（boolean），写入 `User.preferences` JSON 字符串，更新后**立即失效**该用户所有 `rating:*` 缓存（见 1.7）。

**认证**：复用 `middleware/auth`（已有），通过 `req.userId` 鉴权；**只能改自己**的隐私。读取他人时返回该字段（公开 API，前端模块按 4.1 矩阵决定显示策略）。

### 1.6 API-5：global-stats 策略

**全站 4 维平均** + **全站总评分数** + **全站有效评分数**。
**实现**：单次 `Comment.findAll` + 内存计算，4 个维度各算一次。
**缓存**：进程内 LRU 缓存 key=`site:dimAverages`，**TTL = 1 小时**（PRD 6.4）。失效由定时任务或"评论总数变化超阈值"触发（PRD 8.3 建议每日凌晨刷新）。

### 1.7 缓存策略

#### 1.7.1 选型：进程内 LRU 缓存（不引入 Redis）

**理由**：
- 当前后端**无 Redis 依赖**（见 0 节），引入 Redis 需要额外服务/配置/连接池/故障转移
- 4 个 API 端点全是"个人维度的轻量聚合"，数据量小（单用户维度聚合 < 10ms），无需分布式缓存
- 单实例部署下进程内缓存等价于 Redis 的访问速度（ns 级 vs ms 级）

**实现**：使用 `lru-cache` 包（轻量、零依赖），封装为 `utils/cache.js`：
- `get(key)` / `set(key, value, ttlMs)` / `del(key)` / `delByPrefix(prefix)`
- 进程级单例（module-level `new LRU(...)`）

#### 1.7.2 缓存 key 设计与 TTL

| 数据 | Key | TTL | 失效触发 |
|---|---|---|---|
| summary | `rating:summary:{userId}:{timeRange}` | 5 min | 该用户**任一**评论 create/update/delete |
| top | `rating:top:{userId}:{type}` | 5 min | 同上 |
| history 分页 | **不缓存** | - | - |
| 全站平均 | `site:dimAverages` | 1 h | 评论总数变化或定时刷新 |
| 隐私设置 | **不缓存**（小数据 + 即时性要求高） | - | - |

#### 1.7.3 缓存失效机制

**监听点**：在 `Comment` 的写操作（create / update / destroy）handler 中（位于 `backend/routes/comments.js` 的 POST / DELETE 路由）插入**显式失效 hook**：
- 拿到 `userId`（create 时从 body 拿，update/delete 时先查 DB）
- 调用 `cache.delByPrefix('rating:summary:' + userId)`
- 调用 `cache.delByPrefix('rating:top:' + userId)`
- 调用 `cache.del('site:dimAverages')`（全站平均可能受影响）

**钩子位置选择**：在路由层而非 Sequelize hook（`afterCreate` 等），原因：路由层能拿到完整的 req context（包括 auth userId vs target userId 一致性校验），且 `Comment` 模型可能用于其他场景（如后台管理），避免全局副作用。

**失效延迟**：路由处理完成后**同步**调失效，30 秒 AC-03 由 TTL 兜底（最坏情况 5 min 后强制刷新），实际"几乎实时"。

**隐私切换的强失效**：PUT /privacy 成功后，**不依赖 TTL**，主动调 `cache.delByPrefix('rating:*:' + userId)` 立即清除——避免"用户刚切到私有，他人仍看到旧数据"。

### 1.8 路由文件组织

- 新建 `backend/routes/userRatings.js`，挂载到 `app.js` 的 `/api/users/:userId/ratings` 前缀
- 新建 `backend/routes/commentGlobalStats.js`（API-5），挂载到 `/api/comments/global-stats`
- 不动 `backend/routes/comments.js`、`backend/routes/users.js`、`backend/routes/settings.js`

---

## 2. 前端集成策略

### 2.1 集成点

**插入位置**（`frontend/src/pages/UserProfilePage.tsx`）：
- 在 `<ActivityHeatmap userId={id} />`（行 583）**之后**
- 在 `<AchievementsPanel userId={id!} />`（行 586）**之前**
- 包裹条件：`{id && <RatingHistoryModule userId={id} isOwner={isOwner} privacyPublic={...} />}`

**位置理由**（与 UI §1.1 / PRD 7.1 统一）：`ActivityHeatmap` 之后是用户的"个人行为时间线"，紧接评分历史模块承接"个人向 → 个人数据 → 个人成就"叙事；最终接 `StatsCharts`（全站数据）形成"个人 ↔ 整体"对照。

### 2.2 复用现有组件/工具

| 复用对象 | 文件 | 复用方式 |
|---|---|---|
| `DimensionRadar` | `src/components/DimensionRadar.tsx` | **直接复用**，传入 `data = summary.dimensionAverages`，size 用 `lg` |
| 4 维色卡定义 | `DimensionRadar.tsx` 内部 `accentColor` 逻辑 | **复制** `DIMENSION_LABELS` 映射（前端多组件都需用到标签，不能跨组件 import 常量） |
| 雷达图 hover 提示 | DimensionRadar 已有 `count` 数据 | **扩展**：当前组件 hover 顶点只显示数值，需在 PR 中加 tooltip 渲染（与本迭代一并做，标注为 component-level change） |
| `AnimatedNumber` count-up | `UserProfilePage.tsx:36-67` | **直接复用**做平均分数字动画 |
| `api.ts` 的 `getCommentStats` 风格 | `src/api.ts:528` | **参考风格**新增 `getUserRatingSummary` / `getUserRatingHistory` / `getUserRatingTop` / `getUserRatingPrivacy` |
| Recharts 子组件 | Recharts 已在项目中 | 折线图用 `LineChart + Line + XAxis + YAxis + CartesianGrid + Tooltip + ResponsiveContainer`；直方图用 `BarChart + Bar + XAxis + YAxis + CartesianGrid + Tooltip` |

### 2.3 新建组件清单

| 组件名 | 文件路径 | 职责 |
|---|---|---|
| `RatingHistoryModule` | `src/components/RatingHistoryModule/RatingHistoryModule.tsx` | **容器组件**：编排 4 个子组件 + 状态管理 + 数据请求编排（4 个接口并发）+ 隐私/空态/少数据逻辑分支 |
| `RatingDimensionAverages` | `src/components/RatingHistoryModule/RatingDimensionAverages.tsx` | 4 维平均分卡片（4 列横排），每卡含：维度图标 + 平均分（大数字 + count-up）+ 全站对比 delta 标识 + 评分数小字 |
| `RatingRadar` | `src/components/RatingHistoryModule/RatingRadar.tsx` | **薄包装** `DimensionRadar`（size=lg）+ 标题"我的口味画像" + hover 浮窗（"基于 X 次评分"） |
| `RatingTrendChart` | `src/components/RatingHistoryModule/RatingTrendChart.tsx` | 4 线折线图（按月聚合），含时间范围切换器（30d/90d/1y/all），复刻 PRD 7.6 响应式 |
| `RatingDistribution` | `src/components/RatingHistoryModule/RatingDistribution.tsx` | 2×2 网格 4 个直方图（每个维度一个） |
| `RatingTopList` | `src/components/RatingHistoryModule/RatingTopList.tsx` | Tab 切换"高分榜/低分榜"，每行：封面 + 标题 + 4 维分徽标 + 评分时间 |
| `RatingHistoryList` | `src/components/RatingHistoryModule/RatingHistoryList.tsx` | 最近 10 条历史 + 排序切换（时间/分高/分低）+ "查看更多"分页 + 整行点击跳转 `/recipes/{recipeId}?from=profile` |
| `RatingPrivacyToggle` | `src/components/RatingHistoryModule/RatingPrivacyToggle.tsx` | 模块右上角隐私切换（仅自己可见时显示） |
| `RatingEmptyState` | `src/components/RatingHistoryModule/RatingEmptyState.tsx` | 5 级空状态（0/1-2/3-4/5-9/10+），对应不同引导文案和模块显隐 |

### 2.4 状态管理

**容器组件内部**用 `useState` + 自定义 `useRatingData(userId)` hook 协调 4 个 API 的并发请求、loading/error 状态。**不引入全局状态**（Redux / Zustand），与项目当前风格一致（`UserProfilePage` 内部 useState）。

**数据获取策略**：
- 首屏：summary + top + history(page=1) **三个接口并发**（`Promise.all`）
- 排序切换 / 查看更多：单独触发 history 重新拉取（summary/top 不重拉）
- timeRange 切换：仅重拉 summary（含 trend）+ distribution（如果 P1 实现）

### 2.5 Recharts 复用策略

- 折线图：参考 `DashboardPage` 的 4 线实现（如已有 `MultiLineChart` 子组件则复用）
- 直方图：参考 `StatsCharts.tsx` 中类似 Bar 图的封装风格
- 雷达图：**复用** `DimensionRadar.tsx`（不重写）
- 所有图表：**统一** `ResponsiveContainer` 包裹 + `dark` 模式颜色分支（与 `DimensionRadar` 写法对齐）

---

## 3. 数据一致性

### 3.1 同一食谱多次评分的去重

**业务规则**（PRD 4.2 + AC-02）：同一食谱多次评分时，**仅最新一次**计入历史和聚合。

**实现**（所有 4 个 API 都要应用）：
- SQL 层：用相关子查询或 `IN (SELECT MAX...)` 模式
  ```
  WHERE userId = :userId
    AND (recipeId, createdAt) IN (
      SELECT recipeId, MAX(createdAt) FROM comments
      WHERE userId = :userId
      GROUP BY recipeId
    )
  ```
- Sequelize 实现：在主 query 的 where 中加 `Op.and` 子查询，引用同样的 `Comment` model 子查询表达式
- 边界：若最新一条被物理删除（无软删除），则取次新——用 `ROW_NUMBER() OVER (PARTITION BY recipeId ORDER BY createdAt DESC)` 窗口函数更鲁棒，但 Sequelize 6 需 `literal` 拼接，**评估成本后决定**：MVP 用 `MAX(createdAt)` + 应用层二次校验（最新一条存在性）。

### 3.2 "4 维全 0 旧评论"的过滤

**现状澄清**（见 0 节）：`Comment` 模型中 0 不合法（validate 1-5），"未评分"是 NULL。所以 PRD 4.2"4 维全 0 旧评论"在**当前代码**中**不存在**。

**处置方案**：
- **API 实际过滤规则**改为"4 维全 NULL 的评论不参与 4 维统计"——即 where 条件要求 `taste IS NOT NULL OR difficulty IS NOT NULL OR presentation IS NOT NULL OR value IS NOT NULL`（**至少一个维度有效**才纳入统计）
- "总评分次数 = 全部 `rating IS NOT NULL` 的评论数"（含只有 overall 没有 4 维的旧评论）
- 在 ARCH 评审时与产品对齐：PRD 4.2 文字"全 0"应解读为"未参与 4 维评分"，需 PM 确认

### 3.3 软删除评论的过滤

**现状**（见 0 节）：`Comment` 模型**未启用软删除**（无 `paranoid: true`，无 `deletedAt` 字段），评论是物理删除。

**处置**：本节 PRD 规则**简化为不适用**。所有过滤逻辑不需考虑 `deletedAt`。若未来开启软删除，需在 `models/comment.js` 加 `paranoid: true` + `deletedAt` 字段，并在所有 4 个 API 的 where 条件中由 Sequelize 自动加 `deletedAt IS NULL`。

### 3.4 匿名评论处理

PRD 4.2 提到"匿名评论不计入"。**实际代码核查**：`Comment` 模型**没有** `isAnonymous` 字段（PRD 提示文档有误，参见 0 节）。所有评论必带 `userId`。

**处置**：本规则**简化为不适用**。`where userId = :userId` 已经天然排除匿名（如果未来引入匿名，需加 where 条件 `isAnonymous = false`）。

### 3.5 隐私可见性矩阵的实现

| 角色 | 访问路径 | 行为 |
|---|---|---|
| 未登录 | `/profile/:userId` | 前端直接 `!isLoggedIn` → 渲染"登录后查看"占位，**不发 API 请求** |
| 登录用户访问他人 | `/profile/:userId` | 拉取 API-4（privacy）→ 若 `ratingsHistoryPublic = false` → 渲染"该用户未公开评分历史"占位，**不发 summary/history/top** |
| 登录用户访问自己 | `/profile/:userId` 且 `:userId === currentUserId` | 跳过 privacy 检查，**总拉取**完整数据 |

`RatingHistoryModule` 容器组件接收 `isOwner` + `privacyPublic` 两个 prop 决定渲染分支（完整模块 / 私有占位 / 登录引导占位）。

---

## 4. 性能优化

### 4.1 索引设计

**新增索引**（在 `backend/models/comment.js` 的 `indexes` 数组中追加）：

| 索引名 | 字段 | 用途 |
|---|---|---|
| `idx_comment_userId_createdAt` | `(userId, createdAt)` | 已有！见 `models/comment.js:148-150` | history 默认排序、趋势按月聚合、按时间窗筛选 |
| `idx_comment_userId_rating` | `(userId, rating)` | **新增** | top 5 高/低分查询、history 按 rating 排序 |
| `idx_comment_userId_recipeId_createdAt` | `(userId, recipeId, createdAt)` | **新增** | "按 recipeId 取最新" 去重子查询（覆盖 `MAX(createdAt) GROUP BY recipeId`） |

**索引添加方式**（不写实现）：
- 开发环境：直接修改 `models/comment.js` + `npm run migrate` 或手工 ALTER TABLE
- 生产环境：通过 `backend/scripts/migrate.js` 新增脚本 `add-rating-history-indexes.js`（参考 `scripts/migrate-dimensional-rating.js` 风格），单独运行（避免与已有 migrate 冲突）

### 4.2 大数据量用户（1000+ 评分）的优化

**问题**：单用户 1000+ 条评论时，summary 接口做 4 维平均 + 分布 + 趋势可能 200ms+，top 仍 < 100ms（索引 LIMIT）。

**策略**：
1. **缓存兜底**：进程内 LRU 缓存 TTL 5 min，热点用户基本命中缓存
2. **分布 / 趋势按时间窗分桶**：
   - 趋势：限制单次返回 `points.length ≤ 60`（5 年 × 12 月）；超过则降采样到周 → 5 年 × 52 周 = 260 点仍超，再降到月
   - 分布：单维度 `COUNT GROUP BY value` 只有 5 行，**没有大数据量问题**
3. **历史分页**：hard-cap `pageSize ≤ 20`（PRD 已规定），避免单查询返回 1000 行
4. **趋势图 N+1 查询问题**：用单次 `GROUP BY DATE_FORMAT` SQL 一次性返回所有月份，**避免**前端按月分多次请求

### 4.3 趋势图按月聚合的实现

**SQL 模式**（伪 SQL，不写代码）：
```sql
SELECT 
  DATE_FORMAT(createdAt, '%Y-%m') AS period,
  AVG(CASE WHEN taste > 0 THEN taste END) AS taste,
  AVG(CASE WHEN difficulty > 0 THEN difficulty END) AS difficulty,
  AVG(CASE WHEN presentation > 0 THEN presentation END) AS presentation,
  AVG(CASE WHEN value > 0 THEN value END) AS value,
  COUNT(*) AS cnt
FROM comments
WHERE userId = :userId
  AND createdAt >= :since  -- 来自 timeRange
  AND (recipeId, createdAt) IN (... 去重子查询 ...)
GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
ORDER BY period ASC
```

**Sequelize 实现思路**：
- `attributes` 数组：用 `sequelize.fn` 嵌套 `sequelize.literal('CASE WHEN ...')`
- `group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')]`
- `order: [[sequelize.literal('period'), 'ASC']]`
- `raw: true`（聚合查询不需要 hydrated model）

**空白月份处理**：DB 不会返回 0 评分的月份。**前端**在展示时按时间范围生成完整月份数组，把缺失月份补成 `{ taste: null, count: 0 }` —— `LineChart` 自动跳过 null 点。

### 4.4 首屏并发策略

- `Promise.all([getSummary, getTop, getHistoryPage1])` —— 3 个请求并发
- 不串行（避免 latency 叠加）
- 容器组件用 `Promise.allSettled` 容错，**任一失败不阻塞其他**（top 失败仍显示 summary + history）

---

## 5. 错误处理

| 场景 | HTTP 状态 | Response 结构 | 前端行为 |
|---|---|---|---|
| `userId`（UUID）不存在 | 404 | `{ code: 404, message: '用户不存在', data: null }` | 渲染"用户不存在"占位，**不**渲染模块 |
| 隐私私有（非本人） | 200 | `{ code: 0, data: { ratingsHistoryPublic: false } }` | 渲染"该用户未公开评分历史"占位 |
| 未登录访问他人 | （前端拦截） | （不发 API） | 渲染"登录后查看完整评分历史" |
| 评论查询超时（5s+） | 500 | `{ code: 500, message: '服务器内部错误' }` | 渲染模块级错误占位 + "重试"按钮 |
| 缓存 miss | 200 | （正常 response） | 透明：handler 走 DB 查 → 写入缓存 → 返回 |
| 评论数为 0 | 200 | `{ dimensionAverages: 空对象, distribution: 0 桶, trend.points: [], totalRatings: 0 }` | 渲染"全空"空状态 |
| 1-2 条评论 | 200 | （正常 response） | 渲染"极少"空状态（部分模块显示） |
| API-1 timeRange 非法 | 400 | `{ code: 400, message: 'timeRange 必须为 all/30d/90d/1y' }` | 兜底为 `all` |
| `dimension` 参数非法 | 400 | `{ code: 400, message: 'dimension 必须为 overall/taste/...' }` | 兜底为 `overall` |
| 分页 page 越界 | 200 | `{ items: [], total: N }` | 渲染"无更多数据"占位 + 禁用"查看更多" |

**缓存 miss 回源**：所有读缓存的方法遵循"先查缓存 → miss 则执行 DB 查询 → 写入缓存 → 返回"模式，**不**做 stale-while-revalidate（实现复杂度高，本迭代不值）。

**鉴权失败**：未登录用户访问 API-1/2/3 时返回 401（复用现有 `middleware/auth`），前端跳登录或渲染引导。

---

## 6. 部署 / 迁移

### 6.1 DB Migration

**是否需要新字段**：**否**。`Comment` 模型字段已就绪（见 0 节 + 迭代 #130/#132/#133 记录），User 模型用现有 `preferences` JSON 存隐私设置。

**是否需要新索引**：**是**（见 4.1 节）：
- `idx_comment_userId_rating`（新增）
- `idx_comment_userId_recipeId_createdAt`（新增）
- `idx_comment_userId_createdAt`（已存在，确认下生产是否已建）

**Migration 脚本**：`backend/scripts/add-rating-history-indexes.js`（参考 `scripts/migrate-dimensional-rating.js`），幂等（`ADD INDEX IF NOT EXISTS` 或先 `SHOW INDEX` 检查）。

### 6.2 部署顺序

| 步骤 | 操作 | 风险 | 回滚 |
|---|---|---|---|
| **Step 1** | DB 索引 migration（先于代码） | 极低（加索引是 DDL 短暂锁表，1-3s） | `DROP INDEX` 立即回滚 |
| **Step 2** | 后端 deploy：新增 `routes/userRatings.js` + `routes/commentGlobalStats.js` + `utils/cache.js` + `lru-cache` 依赖 | 中：新增代码不破坏旧路径（旧端点不动） | 移除新路由挂载即可 |
| **Step 3** | 前端 deploy：新增 `RatingHistoryModule` + 子组件 | 低：纯新增组件，不动现有 `UserProfilePage.tsx` 既有逻辑（仅插入 1 行 JSX） | 移除该行 JSX |
| **Step 4** | 灰度 / 验证：内部账号 + 生产数据量最大的 3 个用户（验证大数据量性能） | - | - |

**回滚原则**：每步都可独立回滚；Step 2/3 不依赖 Step 1 也能跑（但性能会差，所以先索引后代码）。

### 6.3 配置项

- 无新增 `.env` 变量
- `lru-cache` 配置（`utils/cache.js` 初始化）：`max = 1000`（条目数）、`ttl = 5 * 60 * 1000`（summary/top）/ `ttl = 60 * 60 * 1000`（site:dimAverages），硬编码在常量中（无需配置化）

### 6.4 依赖

**后端新增**：
- `lru-cache`（`npm i lru-cache`）

**前端新增**：
- 无（Recharts 已就位）

---

## 7. 风险与权衡

### 7.1 风险登记表

| 风险 | 等级 | 缓解措施 |
|---|---|---|
| 进程内缓存不共享 → 多实例部署下 cache miss 率上升 | 中 | 当前是单实例部署，影响有限；未来上多实例时，将 `utils/cache.js` 替换为 Redis 客户端（接口兼容，迁移成本 ~1 小时） |
| 缓存失效 hook 漏挂 → 用户评论后数据陈旧 | 中 | 加单元测试覆盖：模拟"创建评论 → 验证 cache key 被删除"；Code Review 必查点 |
| 4 维全 0 规则与实际模型不符 | 高 | **本 ARCH 已与 PM 对齐**：以"4 维全 NULL" 替代"全 0"；写入 PR 描述和 AC 验证脚本 |
| `idx_comment_userId_recipeId_createdAt` 复合索引占用空间（每个用户每食谱 1 条） | 低 | 单用户评分数百到数千条，B 树深度可控；监控索引大小，必要时可降级为 `idx_comment_userId_createdAt` 单列 + 应用层去重 |
| 隐私切换后他人端 CDN / 浏览器缓存仍可能命中 | 低 | 本项目无 CDN；浏览器缓存由前端 HTTP header `Cache-Control: no-store` 控制（个人数据接口建议加） |
| `lru-cache` 包版本升级 break | 低 | pin 版本（`lru-cache@^10`），minor 升级 review changelog |
| `DimensionRadar` 不支持 hover 提示扩展 → 需 fork | 中 | 在本迭代中**一并扩展**该组件的 hover 行为（与本模块复用），加 component-level 测试 |
| 全站 4 维平均 API 是新依赖，APM 无历史 baseline | 中 | 上线后 1 周观察 P95 延迟，超 200ms 考虑走预计算（物化视图或定时任务） |

### 7.2 关键权衡

#### 7.2.1 缓存：进程内 LRU vs Redis

| 维度 | 进程内 LRU（**选**） | Redis |
|---|---|---|
| 部署成本 | 0（已有进程） | +1 服务（Docker / 配置 / 连接池） |
| 访问延迟 | ns 级 | 0.1-1ms |
| 多实例一致性 | 各实例独立 cache | 共享 |
| 故障面 | 0 | 需监控连接/重连 |
| 适用场景 | 单实例 + 数据量小 + 一致性要求 < TTL | 多实例 + 数据量大 + 强一致 |

**结论**：当前单实例 + 5min TTL + 主动失效 hook，进程内 LRU 完全够用。

#### 7.2.2 API 数量：4 个独立 vs 1 个聚合端点

| 方案 | 优点 | 缺点 |
|---|---|---|
| 4 个独立端点（**选**） | 各自缓存粒度细；可独立 invalidation；前端并发请求 | 前端需管理 4 个请求状态 |
| 1 个超级聚合端点 | 单次请求拿到所有数据 | 任何数据变化都失效整张缓存；response payload 大（5KB+） |

**结论**：4 端点粒度更细，缓存命中率高。前端 `Promise.all` 编排并发。

#### 7.2.3 去重：相关子查询 vs 窗口函数

| 维度 | 相关子查询 / IN (SELECT MAX) | 窗口函数 ROW_NUMBER() |
|---|---|---|
| MySQL/MariaDB 兼容性 | 通用 | MySQL 8.0+ / MariaDB 10.2+ |
| 实现复杂度 | 低 | 需 `literal` 拼装 |
| 边界处理（最新一条被删） | 需应用层二次校验 | 原生鲁棒 |
| 性能 | 1000 行内无差异 | 略优 |

**结论**：MVP 用 `MAX(createdAt)` + 应用层兜底；后续如果生产有用户出现"最新一条被删"导致少算，迁移到窗口函数。

#### 7.2.4 隐私字段：独立列 vs JSON 字段

| 方案 | 优点 | 缺点 |
|---|---|---|
| 现有 `User.preferences` JSON（**选**） | 0 schema 变更；与现有 `collectionVisibility` / `cookingLogVisibility` 风格一致 | 查询/索引差（要 `JSON_EXTRACT`）；无法加 NOT NULL 约束 |
| 新增 `User.ratingsHistoryPublic` 列 | 可索引、类型安全 | migration 成本 + 与现有隐私字段风格分裂 |

**结论**：复用现有 JSON 风格。一致性 > 微观性能。

---

## 8. 实施检查清单（架构师交付给后续角色）

> 本节给 PM / 后端 / 前端 / QA 的 actionable 指引

### 8.1 给 PM（PRD 修订）

- [ ] **PRD 字段名校正**：将 PRD 中所有 `tasteRating` / `difficultyRating` / `presentationRating` / `valueRating` / `overall` 改为实际模型字段名 `taste` / `difficulty` / `presentation` / `value` / `rating`（PRD §6.1 API 响应结构里也都需调整）
- [ ] **PRD 4.2 文字校正**："4 维全 0 旧评论"实际不存在（validate 1-5），改为"4 维全 NULL 的评论"；处置规则不变（不计入 4 维统计）
- [ ] **PRD 4.2 软删除规则**：当前未启用软删除，删除是物理的；如未来开启 `paranoid: true`，需在 ARCH §3.3 加 1 行 `deletedAt` 过滤
- [ ] **PRD 4.2 匿名评论规则**：`Comment` 模型无 `isAnonymous` 字段；当前所有评论必带 userId，规则实际无效
- [ ] **Q-02 决策确认**（PRD §10）：高/低分 TOP 5 是否按 `rating` 还是按单个维度？建议按 `rating`（实现简单，符合用户直觉）
- [ ] **Q-01 决策确认**（PRD §10）：隐私默认值采用"公开"（已写死，UI 默认显示）
- [ ] **确认"整行点击跳转"和 URL `?from=profile` 参数**（AC-08）：后端不感知，前端实现

### 8.2 给后端

- [ ] **新建 `backend/utils/cache.js`**：封装 `lru-cache`（`max=1000`，按 key 前缀失效）
- [ ] **新增 `lru-cache` 依赖**到 `backend/package.json`（pin `^10.x`）
- [ ] **新建 `backend/routes/userRatings.js`**：4 个端点（summary / history / top / privacy），挂载 `/api/users/:userId/ratings`
- [ ] **新建 `backend/routes/commentGlobalStats.js`**：API-5，挂载 `/api/comments/global-stats`
- [ ] **修改 `backend/app.js`**：注册两个新路由
- [ ] **修改 `backend/models/comment.js`**：追加 2 个索引（`idx_comment_userId_rating` + `idx_comment_userId_recipeId_createdAt`）
- [ ] **修改 `backend/routes/comments.js`**：在 POST 创建评论、PUT 编辑、DELETE 删除 handler 中插入缓存失效 hook（`cache.delByPrefix('rating:summary:' + userId)` 等）
- [ ] **新建 `backend/scripts/add-rating-history-indexes.js`**：幂等 DDL
- [ ] **测试覆盖**：大数据量（seed 1000+ 评论）+ 0 评论 + 隐私切换 + 缓存失效时序

### 8.3 给前端

- [ ] **新建 `src/components/RatingHistoryModule/` 目录 + 9 个子组件**（见 §2.3）
- [ ] **修改 `src/api.ts`**：新增 5 个方法（getUserRatingSummary / getUserRatingHistory / getUserRatingTop / getUserRatingPrivacy / putUserRatingPrivacy + getCommentGlobalStats）
- [ ] **修改 `src/pages/UserProfilePage.tsx`**：在 `ActivityHeatmap` 之后、`AchievementsPanel` 之前插入 `<RatingHistoryModule userId={id} isOwner={isOwner} privacyPublic={...} />`
- [ ] **扩展 `src/components/DimensionRadar.tsx`**：加 hover 顶点 tooltip（"X 分 · 基于 N 次评分"），加 `tooltipFormatter` prop 复用现有 API
- [ ] **类型定义**：在 `src/api.ts` 加 `RatingSummary` / `RatingHistoryItem` / `RatingTopItem` / `RatingPrivacy` 4 个 TypeScript 接口（与 PRD API 响应一一对应）
- [ ] **i18n**（如有）：所有用户文案走 i18n key
- [ ] **可访问性**：图表 aria-label、键盘 Tab 导航、暗色模式对比度 ≥ 4.5:1

### 8.4 给 QA

- [ ] **AC-01 验证**：4 维平均仅纳入 `> 0`（实际为 `IS NOT NULL`），保留 1 位小数
- [ ] **AC-02 验证**：TOP 5 高/低，按 `rating` 排序，同食谱多次评分只取最新
- [ ] **AC-03 验证**：删除评论后 30s 内历史/平均/分布/趋势/TOP 5 全部同步
- [ ] **AC-04 验证**：未登录访问 `/profile/{anyUserId}` 看到"登录后查看"占位
- [ ] **AC-05 验证**：隐私私有用户，他人访问看到"该用户未公开评分历史"，本人可见完整
- [ ] **AC-06 验证**：4 维全 NULL 旧评论不计入 4 维平均，但计入总评分次数
- [ ] **AC-07 验证**：查看更多按钮精确加载 10 条
- [ ] **AC-08 验证**：点击历史行跳 `/recipes/{recipeId}?from=profile`
- [ ] **AC-09 验证**：雷达图 hover 顶点显示平均分 + 评分数
- [ ] **AC-10 验证**：P95 首屏 < 800ms（P95 在 4 核 8G 普通服务器）
- [ ] **边界测试**：0 / 1 / 2 / 5 / 50 / 500 / 5000 评分用户全覆盖
- [ ] **跨用户访问**：自己 / 公开用户 / 私有用户 三种身份各测一次
- [ ] **缓存失效**：评论新增/编辑/删除后 30s 内模块数据同步
- [ ] **响应式**：桌面 / 平板 / 移动端三种断点

### 8.5 给 DevOps

- [ ] **DB migration 在代码 deploy 之前**（Step 1 → Step 2/3）
- [ ] **备份策略**：本迭代无数据变更，备份策略不变
- [ ] **监控**：新增 4 个 API 的 P50/P95 延迟埋点，cache hit/miss 计数
- [ ] **告警阈值**：summary P95 > 500ms 持续 5min 告警

---

## 9. 架构师签字

| 项 | 状态 |
|---|---|
| PRD 字段名与实际模型对齐 | ✅ 已识别（§0） |
| 缓存策略选型（无 Redis 环境） | ✅ 进程内 LRU（§1.7） |
| 索引设计 | ✅ 2 个新增 + 1 个确认（§4.1） |
| 前端组件拆分 | ✅ 9 个新组件（§2.3） |
| 数据一致性边界 | ✅ 3 条规则适配（§3） |
| 部署顺序 | ✅ 4 步可独立回滚（§6.2） |
| 风险与权衡 | ✅ 7 类风险 + 4 项关键权衡（§7） |
| 与 PM/QA 移交清单 | ✅（§8） |

---

*文档结束*
