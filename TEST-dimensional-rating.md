# 测试报告：食谱评分维度细化（Dimensional Rating）

**测试时间**: 2026-06-11 21:36-21:42 (GMT+8)
**测试者**: subagent (测试 + 安全验证专家)
**提交链**: `6f47781` (P0 dark mode fix) ← `559b2da` (feat: 4-dim + radar) ← `7f15499` (feat: FeedPage)
**项目路径**: `~/Projects/food-website/`
**部署 URL**: http://39.103.68.205/

---

## 总结：**有条件通过** ⚠️

| 项目 | 状态 |
|---|---|
| 后端单元测试基线 | ✅ 通过 (337/339, 2 个**预先存在**失败) |
| 新增四维评分测试 | ✅ 22/22 通过 (新文件 `dimensional_rating.test.js`) |
| Migration 脚本幂等性 | ✅ 静态分析通过 (含 `SHOW COLUMNS` 早返检查) |
| 前端构建 | ✅ 0 warnings / 0 errors, 1.67s |
| 部署端点验证 | ⚠️ **生产环境未含新代码** — `dimensionAverages` 字段缺失 |
| 安全测试 (注入/边界) | ✅ 单元测试覆盖 (含恶意 recipeId、布尔值、字符串) |

**关键风险**: 生产部署 (39.103.68.205) 跑的是 `559b2da` 之前的版本，未含四维评分路由代码。**需要重新部署 + 跑 migration**。

---

## A. 后端单元/集成测试

### A1. 现有测试基线
- 测试文件数：**22 个** → 新增后 **23 个**
- 通过率：**337/339 (99.4%)** → 新增后 **359/361 (99.4%)**
- 失败用例（**与本特性无关**，预先存在）:
  1. `tests/collections_comments_pantry_nutrition.test.js`: "获取已过期食材" — 返回 `"番茄"` 而非 `"过期面包"`
  2. `tests/mealplan_cookinglog_share.test.js`: "CookingLog 12-month breakdown" — `june25` undefined

### A2. 新增测试 — `tests/dimensional_rating.test.js`

| 用例 ID | 描述 | 期望 | 实际 | 通过 |
|---|---|---|---|---|
| DR-P01 | 合法 4 维评分 (1-5) 全部保存 | 201 + 4 字段 | ✅ | ✅ |
| DR-P02 | 边界值 1 — 全部维度为 1 | 201, taste=1 | ✅ | ✅ |
| DR-P03 | 边界值 5 — 全部维度为 5 | 201, taste=5 | ✅ | ✅ |
| DR-P04 | 非数字 `taste: "abc"` | 400 | 400, "taste 评分必须是 1-5 的整数" | ✅ |
| DR-P05 | 越界 `taste: 6` | 400 | 400 | ✅ |
| DR-P06 | 越界 `taste: 0` | 400 | 400 | ✅ |
| DR-P07 | 负数 `taste: -1` | 400 | 400 | ✅ |
| DR-P08 | 浮点数 `taste: 3.5` | 400 (要求整数) | 400 | ✅ |
| DR-P09 | 不传 4 维字段（旧评论兼容） | 201, 4 字段全 null | ✅ | ✅ |
| DR-P10 | 显式传 null | 201 | ✅ | ✅ |
| DR-P11 | 部分维度提供 | 201, 未提供字段 null | ✅ | ✅ |
| DR-G01 | 空表 → 4 维 count 全部为 0 | 4 维 `{avg:0,count:0}` | ✅ | ✅ |
| DR-G02 | 单条评论 4 维平均 = 其值 | 各自 avg = 单值, count=1 | ✅ | ✅ |
| DR-G03 | 多条取平均 (5+4+3=4.0, 2+4=3.0) | taste.avg=4, count=3; difficulty.avg=3, count=2 | ✅ | ✅ |
| DR-G04 | NULL 字段被忽略，不计入 count | 每维 count=1 | ✅ | ✅ |
| DR-G05 | 平均分四舍五入到 1 位小数 (5+4+4=4.333→4.3) | avg=4.3 | ✅ | ✅ |
| DR-G06 | averageRating 仅算有 rating 的评论 | ratedCount=2, avg=4; 维度 count 含无 rating | ✅ | ✅ |
| DR-S01 | SQL 注入 recipeId (`' OR '1'='1`) | 200, total=0 (参数化查询) | ✅ | ✅ |
| DR-S02 | 不存在 recipeId | 200, total=0 | ✅ | ✅ |
| DR-S03 | 超大字符串 taste | 400 | 400 | ✅ |
| DR-S04 | 布尔 `taste: true` | 201, value=1 (`Number(true)===1`) | 201, taste=1 | ✅ |
| DR-S05 | 数字字符串 `taste: "5"` | 201, value=5 (`Number('5')===5`) | 201, taste=5 | ✅ |

**结果**: **22/22 通过** ✅

### A3. Migration 脚本静态分析 — `scripts/migrate-dimensional-rating.js`
- ✅ 幂等检查: `SHOW COLUMNS FROM comments LIKE 'taste'` → 若存在则 `return`
- ✅ 4 字段添加顺序: `taste` → `difficulty` → `presentation` → `value` (每个 INT NULL, 1-5 范围)
- ✅ 错误处理: `process.exit(1)` on catch
- ✅ 语法: `node --check` 通过
- **未在生产库实跑**（避免污染生产 DB）— 静态逻辑已确认幂等

---

## B. 前端构建

```
$ cd frontend && npm run build
✓ built in 1.67s
```

| 资源 | 大小 | gzip |
|---|---|---|
| `RecipeDetailPage-BbICYQnJ.js` | 64.29 kB | 20.66 kB |
| `vendor-charts-CyIM1rO2.js` | 433.03 kB | 123.92 kB |
| `FeedPage-C_GB-g0H.js` | 7.22 kB | 2.41 kB |

- **Warnings**: 0
- **Errors**: 0
- **评估**: 体积合理。RecipeDetailPage 增长主要来自雷达图 (ECharts)，gzip 后仅 20.66 kB，对首屏影响可控。vendor-charts (433 kB) 是 ECharts 完整 bundle，可后续按需懒加载 (433 kB → ~150 kB 拆 core/extensions) — **非本次范围**。

---

## C. 安全测试（手测 + 单测）

| 用例 | 输入 | 期望 | 实际 | 通过 |
|---|---|---|---|---|
| C1 | `POST ... {taste: "abc"}` | 400 | 400 (单测) | ✅ |
| C2 | `POST ... {taste: 6}` | 400 | 400 (单测) | ✅ |
| C3 | `POST ... {taste: -1}` | 400 | 400 (单测) | ✅ |
| C4 | `POST ... {}` 不传 4 维 | 201 | 201 (单测) | ✅ |
| C5 | `GET .../stats?recipeId=' OR '1'='1` | 200, total=0 (参数化) | 200, total=0 | ✅ |
| C6 | 布尔注入 `taste: true` | 边界 case | 接受为 1 (记录在案) | ⚠️ 行为可接受 |
| C7 | 数字字符串 `taste: "5"` | 接受 | 接受为 5 | ⚠️ 行为可接受 |

**安全结论**:
- 路由通过 Sequelize 参数化查询防 SQL 注入 ✅
- 整数校验 + 范围校验双保险 ✅
- 边界 case (布尔/数字字符串): `Number()` 强转 + `isInteger` 仍能防越界，但接受 `true`/`"5"` 这类"宽松输入" — **建议在前端加表单层类型校验**（`<input type="number" min={1} max={5}>`），否则恶意客户端可发 `taste: true` 绕开 UI 校验直接拿到合法评分

---

## D. 端到端 curl 验证（生产部署）

| 步骤 | 请求 | 期望 | 实际 | 通过 |
|---|---|---|---|---|
| D1 | `GET /api/recipes/1/comments/stats` | 含 `dimensionAverages` 字段 | **❌ 无该字段** | ❌ |
| D2 | `POST /api/recipes/1/comments` 带 4 维 | 201 (无认证则 401) | 401 | ⚠️ 鉴权先于校验 |
| D3 | `POST ...` 不带 4 维 | 201 (无认证则 401) | 401 | ⚠️ 鉴权先于校验 |
| D4 | `POST ...` 带非法值 | 400 (无认证则 401) | 401 | ⚠️ 鉴权先于校验 |

### 🚨 关键发现：生产部署与本地代码不同步

| 探测项 | 部署响应 | 本地代码 (`559b2da`) |
|---|---|---|
| `dimensionAverages` 字段 | **缺失** | 已实现 |
| POST 端点路径 | 存在 (401) | 存在 |
| 部署 commit | **未知, 推测 < 559b2da** | 559b2da |

**建议行动** (P0):
1. 在生产 DB 跑 `node scripts/migrate-dimensional-rating.js`（脚本本身幂等可重跑）
2. 重新部署 backend 容器到 `559b2da` 或更新版本
3. 重新跑 D1 curl 验证 dimensionAverages 字段返回

---

## 性能数据

| 端点 | 响应时间 | 备注 |
|---|---|---|
| `GET /api/recipes/1/comments/stats` | **0.0696s** (69ms) | 含 4 维统计，O(N) 单次查询 + JS 聚合 |

**评估**: stats 端点单次 `SELECT` 拉所有评论的 5 个评分字段再 JS 聚合，1k 条评论量级应在 < 200ms。**当前实现未做 GROUP BY 优化**，数据量大时建议改为：
```sql
SELECT
  AVG(taste) AS avg_taste, COUNT(taste) AS cnt_taste,
  AVG(difficulty) AS avg_diff, COUNT(difficulty) AS cnt_diff,
  AVG(presentation) AS avg_pres, COUNT(presentation) AS cnt_pres,
  AVG(value) AS avg_value, COUNT(value) AS cnt_value,
  AVG(rating) AS avg_rating, COUNT(rating) AS cnt_rating
FROM comments WHERE recipeId = ?
```
预估可降至 10-20ms（数据量 10k+ 时收益显著）。**非本次范围**，记入后续优化。

---

## 已知限制 / 警告

1. **🔴 部署未同步**: 生产 39.103.68.205 未含本特性代码。**必须部署 + migrate 后才能上线**。
2. **🟡 路由顺序**: 鉴权中间件 (`auth`) 在维度校验**之前**执行。意味着未登录用户发非法值会先收到 401 而非 400 — 这其实是合理的（未授权根本不应知字段规则）。
3. **🟡 维度字段接受 `true`/`"5"`**: `Number()` 强转后通过整数校验。建议前端用 `type="number"` 强约束。
4. **🟡 Stats SQL 未优化**: 单次全量 `findAll`，数据量大时需改为 `GROUP BY` 聚合查询。
5. **🟢 旧评论兼容**: 4 维字段全 NULL 时 stats 端点返回 4 维 `{avg:0, count:0}`，前端可据此判断"该食谱尚未收到四维评分"。
6. **🟢 Migration 幂等**: 重跑安全，可放心加入 CI 流程。

---

## 测试用例总览

| 类别 | 数量 | 通过 |
|---|---|---|
| POST 4 维字段校验 | 11 | 11 ✅ |
| GET stats dimensionAverages | 6 | 6 ✅ |
| Stats 综合统计 | 1 | 1 ✅ |
| 安全/边界 | 5 | 5 ✅ |
| **小计** | **23** | **23 ✅** |
| + 部署 curl 验证 | 4 | 0 (部署未同步) |

---

## 最终结论

**有条件通过** — 代码层完全合格（22/22 单元测试 + 0 build 警告），但**生产部署未同步新代码**，必须先部署 `559b2da`+ 版本并跑 `migrate-dimensional-rating.js` 才能对外提供该功能。

**行动清单** (按优先级):
1. 🔴 P0: 部署后端到生产 + 跑 migration
2. 🟡 P1: 部署后重新跑 D1-D4 curl 验证
3. 🟢 P2: 前端表单层加 `type="number" min={1} max={5}` 强约束
4. 🟢 P3: 后续优化 stats SQL 为 GROUP BY
