# 架构评审报告：食谱评分维度细化

> **评审者**：Plan Reviewer (Subagent)  
> **评审日期**：2026-06-11  
> **评审对象**：`PRD-dimensional-rating.md` v1.0  
> **结论**：✅ 通过（条件性 — 5 项前置确认 + 3 项实施修正）

---

## 1. 合理性检查

### 1.1 数据库变更方案 ✅ 安全

| 检查项 | 结果 | 说明 |
|--------|------|------|
| ALTER TABLE 对现有数据影响 | ✅ 无风险 | 4 列均为 `INT NULL`，存量行自动填充 NULL，无需回填 |
| MariaDB 兼容性 | ✅ 兼容 | `ADD COLUMN ... INT NULL` 在 MariaDB 10.2+ 支持；项目使用手动 schema 管理，不自动 sync |
| 字段排序建议 | ⚠️ 建议 | PRD 中「优化版」使用 `AFTER rating` 更工整，推荐采用 |
| InnoDB 在线 DDL | ✅ 安全 | MariaDB 10.3+ `ALTER TABLE ADD COLUMN` 支持 `ALGORITHM=INPLACE`，对约 200 条数据的表瞬时完成 |
| 迁移回滚 | ✅ 简单 | `ALTER TABLE DROP COLUMN` 即可回滚，新字段无外键依赖 |

**建议**：使用优化版 SQL（`AFTER rating`），并明确标注执行的 MariaDB 最低版本要求。

### 1.2 API 扩展向前兼容性 ✅ 安全

| API 端点 | 变更 | 兼容性分析 |
|----------|------|-----------|
| `GET /comments` | 响应新增 4 字段 | ✅ `findAll()` 未使用 `attributes` 白名单，新模型字段**自动包含**在 `toJSON()` 中。老前端访问新增字段为 `null`/`undefined`，不报错 |
| `GET /comments/stats` | 响应新增 `dimensionAverages` | ✅ 顶层新增 key，老前端不读取即忽略。⚠️ 但需注意：当前 stats 查询用 `attributes: ['rating']`（见 `routes/comments.js:151`），**必须扩展为包含 4 个新字段** |
| `POST /comments` | 请求新增 4 个可选字段 | ✅ 老客户端不传即可，路由层对 `req.body` 未做严格白名单。新字段全部可选，不影响现有校验 |
| 新客户端连旧 API | — | ⚠️ `dimensionAverages` 不存在 → 前端判空后不渲染雷达图即可（PRD 已提到） |

**关键发现**：stats 端点当前硬编码 `attributes: ['rating']`，PRD 第 3.2.2 节提到「实现要点 1」需要改这个，但**未在 PRD 正文醒目标注**。这是实施时必须修改的点，否则新字段不会被查询出来。

### 1.3 前端组件变更范围 ✅ 合理

| 组件 | 变更类型 | 复用度评估 |
|------|----------|-----------|
| `CommentSection.tsx` | 修改 | ✅ 高复用 — `StarRating` 组件已支持 `size="sm"` 和 `readonly`，4 个维度评分直接复用现有组件，无需新建 |
| `DimensionRadar.tsx` | **新建** | ✅ 独立组件 — 纯展示，与现有逻辑解耦，可单独测试 |
| `api.ts` | 修改 | ✅ 仅类型扩展 — `Comment` + `CommentStats` 接口新增字段，不改变函数签名 |
| `CommentSection.css` | 修改 | ⚠️ 需新增维度评分行样式 + 雷达图容器样式 |

**复用度总结**：`StarRating` 组件直接复用 4 次（表单）+ 4 次（卡片），无需新建评分组件。`DimensionRadar` 是唯一新增组件。

**⚠️ 注意**：`CommentSection` 文件已有 ~382 行，加上维度评分逻辑后可能超过 500 行。建议评估是否需要拆分子组件（如 `CommentForm`、`CommentStats`），但非本次必须。

### 1.4 现有测试影响评估

| 测试类别 | 影响 | 需要更新？ |
|----------|------|-----------|
| `frontend/vitest` | 中等 | 如果存在 `CommentSection` 的快照测试，需更新；`Comment` 接口变更后，mock 数据需补新字段 |
| `backend` 测试 | 中等 | stats 端点测试需验证 `dimensionAverages` 返回值；POST 端点测试需覆盖 4 维校验 |
| E2E 测试 | 低 | 如有，新增维度的选择器需要更新 |

**建议**：实施前先跑一遍完整测试套件，记录基线，实施后再对比。

---

## 2. 实现顺序建议

### 推荐顺序（总工期预估：1-2 天）

```
Phase 0: 前置准备（可并行）
├── [0a] 确认生产 DB comments 表结构与 MariaDB 版本
├── [0b] 确认 Recharts 3.8.1 RadarChart 用法 + 编写 DimensionRadar 组件 demo
└── [0c] 补充/更新测试用例（可选但建议在实现前写好）

Phase 1: 数据库迁移（必须串行，阻塞后续）
└── [1] 执行 ALTER TABLE（低峰期，< 1 秒）

Phase 2: 后端（可并行）
├── [2a] 修改 models/comment.js — 新增 4 个字段定义
├── [2b] 修改 routes/comments.js:
│   ├── POST handler — 新增 taste/difficulty/presentation/value 校验
│   └── GET /stats handler — 扩展 attributes + 计算 dimensionAverages
└── [2c] 部署后端（重启 Node 进程） → 新字段对老前端透明

Phase 3: 前端（Phase 1+2 完成后进行，内部可部分并行）
├── [3a] 修改 api.ts — Comment + CommentStats + DimensionAverage 接口扩展
├── [3b] 新建 DimensionRadar.tsx — Recharts 雷达图组件
├── [3c] 修改 CommentSection.tsx:
│   ├── 表单：添加 4 行维度 StarRating + 各自 state
│   ├── 卡片：comment-item 追加 4 维标签展示
│   └── 统计区：comment-stats 下方嵌入 DimensionRadar
├── [3d] 修改 CommentSection.css — 维度评分/雷达图样式
└── [3e] 部署前端（Vite build + 上传静态资源）

Phase 4: 验收
└── [4] 逐项验证 10 条 AC（见 PRD 第 4 节）
```

### 依赖关系图

```
[0a 确认DB] ──────────────────────────────────────────────┐
[0b Recharts调研] ────────────────────────────────────────┤
[0c 测试用例] ─────────────────────────────────────────── ├── Phase 0 可并行
                                                          │
[1 数据库迁移] ── 阻塞 ── [2a 模型] ── [2b 路由] ── [2c 部署后端]
                                  │                          │
                                  │              ┌───────────┘
                                  │              ▼
                                  └──── [3a api.ts] ────┬── [3c CommentSection]
                                                         │
                                  [3b DimensionRadar] ──┘
                                                         │
                                              [3d CSS] ──┘
                                                         │
                                              [3e 部署前端]
                                                         │
                                              [4 验收 AC 1-10]
```

**并行点**：
- Phase 0 三项完全并行
- Phase 2 的 2a + 2b 可并行（同一次部署）
- Phase 3 的 3a、3b 可并行（无依赖）；3c/3d 依赖 3a/3b

**串行点**：
- Phase 1 必须先于 Phase 2（数据库没字段，模型定义无法生效）
- Phase 2 必须先于 Phase 3（前端调用后端 API 需要新字段存在）

---

## 3. 潜在风险

### 3.1 遗漏的边界情况（PRD 未覆盖） 🔴 重要

| # | 边界情况 | 当前 PRD 覆盖？ | 建议 |
|---|----------|----------------|------|
| 1 | **用户提交了 4 维评分但未填 content？** | ❌ 未覆盖 | 当前代码 `content.trim().length === 0 → 400`。PROPOSED FIX：如果 content 非空但 rating 和 4 维全部未填，应警告？当前 PRD 说「至少需要 rating」，但没说 content 空+有维度评分是否合法。**建议**：维持现有逻辑（content 必填），4 维评分是调味料不是主菜 |
| 2 | **用户提交了 rating=0 但 4 维全填？** | ❌ 未覆盖 | 当前代码 `rating: rating \|\| undefined` — rating=0 会被转为 undefined。如果用户 intentionally 给 0（表示不想给综合分但愿意给维度分），这种行为被静默丢掉。PRD 说「至少需要一个综合 rating」，所以应**拒绝 rating 为空/0** |
| 3 | **老评论的 4 维字段在 `toJSON()` 后是 null 还是不存在？** | 部分覆盖 | Sequelize 模型定义了 `allowNull: true` 的字段，`findAll()` 返回的对象会包含该字段且值为 `null`。PRD AC-8 对此正确处理，但建议在 PRD 中明确说明「必须是 null 而非字段缺失」 |
| 4 | **stats 端点某维度全 NULL → 返回 average: 0, count: 0** | ✅ 已覆盖 | PRD 伪代码已处理 |
| 5 | **并发提交评论时 stats 乐观更新** | ❌ 未覆盖 | 当前 `handleSubmit` 中乐观更新仅针对综合 rating（见 `CommentSection.tsx:147-155`）。维度评分提交后，不进行维度平均的乐观更新（因为太复杂）。**建议**：维度评分提交后直接 `fetchData()` 刷新，不做乐观更新 |
| 6 | **用户在已提交的评论中编辑维度评分？** | N/A | 系统不支持编辑评论（无 PUT endpoint），删除后重发即可 |

### 3.2 数据库迁移注意事项 🟡

| 风险 | 等级 | 说明 |
|------|------|------|
| **MariaDB 版本** | 🟡 | `ALTER TABLE ADD COLUMN` 多列语法需要 MariaDB 10.2+。**实施前必须确认生产环境版本**。如 < 10.2，需拆为 4 条独立 ALTER（每条约 0.1s，总耗时可接受） |
| **锁表时间** | 🟢 | 当前 ~200 条数据，即使使用 ALGORITHM=COPY 也瞬时完成 |
| **字段类型选择** | 🟢 | `INT NULL` 正确；无需 `TINYINT` 优化（4 列 × 4 bytes × 200 行 = 可忽略） |
| **回滚方案** | 🟢 | `ALTER TABLE comments DROP COLUMN taste, DROP COLUMN difficulty, DROP COLUMN presentation, DROP COLUMN value;` |

### 3.3 前端兼容性问题 🟡

| 风险 | 等级 | 说明 |
|------|------|------|
| **stats.dimensionAverages 为 undefined 时前端报错** | 🟡 | 新前端连旧 API 时，`stats.dimensionAverages` 不存在。`DimensionRadar` 组件必须做 `if (!data)` 判空守卫。当前 PRD AC-6 提到了此点，但组件代码中需落地 |
| **Comment 接口 TypeScript 编译** | 🟢 | 新增 4 个 nullable 字段后，老代码中访问 `comment.taste` 不会报错（`number \| null` 类型），但需确保 `api.ts` 中接口同步更新 |
| **CSS 溢出** | 🟡 | 表单区增加 4 行 StarRating 后，移动端可能溢出。建议 `.comment-form` 设置 `overflow-y: auto` 或确认 flex 布局自适应 |
| **雷达图包含 `count: 0` 的维度** | 🟡 | 如果某维度 `count: 0`，雷达图该维度显示在原点 (0,0)。PRD AC-6 说「不展示或显示暂无数据」，**建议统一为「不展示该维度」**，避免雷达图出现一条 0 线 |
| **Recharts RadarChart 无障碍** | 🟢 | Recharts 雷达图对屏幕阅读器支持有限，但这不是本次范围 |

### 3.4 安全风险 🔴

| 风险 | 等级 | 说明 |
|------|------|------|
| **输入校验** | 🔴 **Critical** | 当前 POST handler 仅校验 `rating`（`routes/comments.js:241`），4 个新维度字段需在路由层同样做 `1-5 整数` 校验。⚠️ Sequelize 模型的 `validate` 在 `create()` 时生效，但**最佳实践是路由层 + 模型层双重校验**。PRD 已提到此要求，实施时务必落地 |
| **XSS** | 🟢 | 4 维评分均为整数，不存在 XSS 风险（直接渲染为数字或 `<StarRating>` 组件） |
| **SQL 注入** | 🟢 | Sequelize ORM 参数化查询，无此风险 |
| **越权** | 🟢 | 维度评分随 comment 一起创建，auth 中间件已处理用户认证 |
| **敏感信息泄露** | 🟢 | 评分数据不包含个人信息 |

### 3.5 架构一致性风险 🟡

| 风险 | 等级 | 说明 |
|------|------|------|
| **后端 stats 端点 attributes 硬编码** | 🟡 | 当前 `attributes: ['rating']`（`routes/comments.js:151`），实施时必须改为 `attributes: ['rating', 'taste', 'difficulty', 'presentation', 'value']`。如果只加字段定义不改这行，维度数据不会被查出 |
| **onRatingUpdate 回调语义** | 🟡 | `handleRatingUpdate(newAvg, newCount)` 仅针对综合评分。PRD 未明确：维度评分提交后，是否也要乐观更新 recipe 上的 `avgRating`？当前设计下，推荐维持现状：维度评分不触发 optimistic update，仅综合评分触发 |
| **GET /comments 的 reply 聚合** | 🟢 | 回复（reply）不涉及评分维度，无需特殊处理 |
| **likesCount 排序** | 🟢 | hot 排序基于 `likesCount`，不受维度评分影响 |

---

## 4. 实施前检查清单

### 必须确认的事项

- [ ] **确认生产 MariaDB 版本**：执行 `SELECT VERSION();` 确认 ≥ 10.2。如果 < 10.2，将 ALTER TABLE 拆为 4 条独立语句
- [ ] **确认生产 comments 表结构**：执行 `SHOW CREATE TABLE comments;` 获取确切字段顺序，确认迁移 SQL 的 `AFTER rating` 语句正确
- [ ] **确认 Recharts 版本**：已确认 `recharts@^3.8.1`（`package.json:22`），RadarChart 组件在 2.x 中已成熟
- [ ] **跑通现有测试套件**：`cd frontend && npm test` + backend 测试，记录基线，实施后对比
- [ ] **确认 stats 端点 attributes**：`routes/comments.js` 第 151 行的 `attributes: ['rating']` 必须改为包含 4 个新字段
- [ ] **确认前端 Comment/CommentStats 类型文件**：`api.ts` 第 463-483 行，确保接口定义与实际 API 响应一致
- [ ] **确认无其他页面依赖 Comment 接口**：搜索 `frontend/src` 中所有引用 `Comment` 类型的地方，确保它们也能正确渲染新字段或忽略之
- [ ] **确认数据库备份**：迁移前执行 `mysqldump` 或确认最近的自动备份可用

### 建议确认的事项

- [ ] **确认 CommentSection.tsx 行数接近 400**：评估是否需要在本次拆分子组件（`CommentForm`、`CommentStats`），避免文件过长
- [ ] **确认 StarRating 组件的 `size="sm"` 在 5 行并列时不会导致移动端溢出**
- [ ] **确认 DimensionRadar 组件的空态设计**：`data` 为空对象或所有 `count: 0` 时的降级展示
- [ ] **确认用户到底想要什么**：维度评分是「可选项」还是「期望填写」？如果是后者，前端应给提示（如「为帮助社区，建议填写维度评分」）

---

## 5. 总结

### 整体评价

PRD 质量**良好**，边界情况考虑周到，向后兼容设计合理。主要问题集中在 3 个实施细节上，已在上述 checklist 中标注。

### 通过条件

| # | 条件 | 优先级 |
|---|------|--------|
| 1 | stats 端点 `attributes: ['rating']` 必须扩展包含 4 个新字段 | **P0 阻塞** |
| 2 | POST handler 必须对 4 个新字段做 `1-5 整数` 校验 | **P0 阻塞** |
| 3 | `DimensionRadar` 组件必须处理 `dimensionAverages` 为 undefined/null 的情况 | **P0 阻塞** |
| 4 | 确认生产 MariaDB 版本 + 表结构后再执行迁移 | **P1** |
| 5 | 明确：维度评分提交后不触发 `onRatingUpdate` 乐观更新，直接 `fetchData()` | **P1** |

### 风险矩阵

| 风险 | 等级 | 缓解 |
|------|------|------|
| 输入校验缺失 | 🔴 Critical | 双重校验（路由 + 模型） |
| stats attributes 遗漏 | 🔴 Critical | 实施时醒目标注 |
| 前端空值守卫缺失 | 🟡 Medium | Code review 检查 |
| MariaDB 版本不兼容 | 🟡 Medium | 部署前确认 |
| 移动端表单溢出 | 🟡 Medium | 响应式测试 |

---

**结论**：PRD 通过评审，实施时严格遵循上述 5 项条件即可。建议将本报告中的 Checklist 转换为实施任务清单，逐项跟踪完成。
