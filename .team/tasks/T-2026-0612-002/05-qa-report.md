# T-2026-0612-002 QA Report

> **TaskID:** T-2026-0612-002  
> **Author:** tester (subagent)  
> **Created:** 2026-06-12 14:36  
> **Baseline:** 371ab33 → impl at e6112a0 (R2 fix: f3a3f90, status: e6112a0)  
> **Code Review R2:** PASS overall=8.33 / 0 blocker  
> **Security Audit:** PASS overall=9.5 / 0 high / 1 low (F-1 UUID 格式校验)  
> **Local Code Verdict:** **GREEN** ✅  
> **Production Deploy Verdict:** **RED** ❌ (公网后端 + 公网前端 chunk 均未含 `dimensionAverages`)  
> **Final Verdict:** **RED**（生产门未通过，需先完成 deploy 闭环）

---

## §1 8 AC 逐条 PASS/FAIL

| AC | 描述 | 状态 | 证据 |
|----|------|------|------|
| **AC-1** | compare 返回的 recipes[].dimensionAverages 4 维字段，结构 `{taste/difficulty/presentation/value: {average, count}}`；无评分 `{0, 0}` | ✅ PASS (本地) / ❌ FAIL (公网) | 本地 curl 命中 4 维 key；公网 prod 返回 keys 不含 dimensionAverages |
| **AC-2** | 单次 Comment.findAll 批量聚合，无 N+1 | ✅ PASS | `backend/routes/compare.js` L52-55 `Comment.findAll({ where: { recipeId: recipeIds } })`（Sequelize IN 子句）+ L188-198 `aggregateDimensionAverages` 纯函数单次 reduce |
| **AC-3** | compare.test.js 覆盖新增字段（≥1 case 验证存在+结构，≥1 case 验证无评分 `{0,0}`） | ✅ PASS | jest 8/8 通过（"无评分时返回 {average:0, count:0}" 等 5 个新 case） |
| **AC-4** | ComparePage 新增 4 维评分对比 section（每菜 1 雷达图 multiColor，2-3 列网格 + 数值摘要） | ✅ PASS (本地) / ❌ FAIL (公网) | `frontend/src/pages/ComparePage.tsx` L162-194 实现；公网 chunk 不含 cmp-radar-section/4 维评分对比字符串 |
| **AC-5** | 对比表格新增 4 行维度数值（口味/难度/卖相/性价比，格式 `X.X 分 (N人评)`） | ✅ PASS (本地) / ❌ FAIL (公网) | `frontend/src/pages/ComparePage.tsx` L86-89 `dimensions` 4 行；前端 vitest "对比表格显示维度数值行" case 通过 |
| **AC-6** | 暗色模式 body.dark 下雷达图颜色自动切换 + 卡片背景变深 | ✅ PASS (本地) | `frontend/src/pages/ComparePage.css` L520-535 `body.dark .cmp-radar-*` 系列；DimensionRadar 内置 MutationObserver 监听 body.dark |
| **AC-7** | 移动端 ≤600px 雷达图网格单列堆叠，size="sm" | ✅ PASS (本地) | `frontend/src/pages/ComparePage.tsx` L30-39 isMobile state + L47-50 resize listener；ComparePage.css L366-373 `@media (max-width: 600px)` 单列 |
| **AC-8** | ComparePage.test.tsx 扩展：mock 含 dimensionAverages，验证雷达图区域 + 维度标签出现在 DOM | ✅ PASS | vitest 8/8 通过，含 "渲染 4 维雷达图区域"（验证 4 维标签 + DimensionRadar 数量 = 2）/"无维度数据时不渲染"/"对比表格显示维度数值行" 3 个新 case |

**AC 8/8 PASS（代码层）** — 全部 AC 在 e6112a0 提交点已实现并通过单测。

---

## §2 自动化测试输出

### 2.1 后端 jest `npx jest tests/compare.test.js`

```
PASS tests/compare.test.js
  Compare Route Module
    ✓ 导出 router 对象 (1 ms)
    ✓ router 有 post 处理函数 (1 ms)
    ✓ 导出 aggregateDimensionAverages 纯函数
  aggregateDimensionAverages
    ✓ 正确聚合多个食谱的维度评分
    ✓ 无评分时返回 {average:0, count:0} (1 ms)
    ✓ 部分维度为 NULL 时仅计算非 NULL 维度
    ✓ 忽略不在 recipeIds 列表中的评论
    ✓ 保留 1 位小数精度

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        0.312 s
```

✅ **8/8 PASS**

### 2.2 前端 vitest `npx vitest run pages/ComparePage.test.tsx`

```
RUN  v2.1.9 /Users/max_yang/Projects/food-website/frontend

stderr | src/pages/ComparePage.test.tsx > ComparePage > 渲染输入框和对比按钮
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7.

 ✓ src/pages/ComparePage.test.tsx (8 tests) 81ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  14:35:17
   Duration  727ms
```

✅ **8/8 PASS**（React Router v7 future flag warning 来自测试运行时，非产品代码 warning）

### 2.3 前端 build `npm run build`

```
dist/assets/ComparePage-DfKEWcCt.js                  6.43 kB │ gzip:   2.52 kB
dist/assets/RecipeDetailPage-Cl9_mlzq.js            62.72 kB │ gzip:  20.02 kB
...
dist/assets/vendor-charts-CyIM1rO2.js              433.03 kB │ gzip: 123.92 kB
✓ built in 1.67s
```

**warning/error grep 结果**：`npm run build 2>&1 | grep -iE "warn|error"` → **无输出**（0 warning / 0 error）

**`grep -l 'dimensionAverages' dist/assets/*.js`** → 命中 3 个 chunk：
- `dist/assets/ComparePage-DfKEWcCt.js` ← ComparePage 独立 chunk ✅
- `dist/assets/RecipeDetailPage-Cl9_mlzq.js`（既有 4 维字段，与本任务无关）
- `dist/assets/UserProfilePage-ByPeymIC.js`（既有 4 维字段，与本任务无关）

✅ **build 0w 0e + ComparePage 独立 chunk 命中**

---

## §3 端到端契约验证（本地 backend + curl）

### 3.1 后端启动

```bash
cd /Users/max_yang/Projects/food-website/backend
DB_DIALECT=sqlite PORT=3001 nohup node server.js > /tmp/be.log 2>&1 &
# [db] Models synced successfully.
# Backend running on port 3001
# lsof → node 76005 LISTEN *:3001
```

### 3.2 Test 1: 2 个 recipeId（1 有评论 + 1 无评论）

```bash
curl -s -X POST http://localhost:3001/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["10000000-0000-0000-0000-000000000010","f88473e1-d0a4-42d8-aa6a-953b0296750a"]}'
```

**r1（有评论）dimensionAverages**：
```json
{
  "taste":        { "average": 5, "count": 1 },
  "difficulty":   { "average": 2, "count": 1 },
  "presentation": { "average": 4, "count": 1 },
  "value":        { "average": 3, "count": 1 }
}
```
- 与 sqlite 中 `comments.recipeId=10000000...010, taste=5, difficulty=2, presentation=4, value=3` 完全对应 ✅
- 4 维 key 完整；结构 `{average: number, count: number}` ✅

**r2（无评论）dimensionAverages**：
```json
{
  "taste":        { "average": 0, "count": 0 },
  "difficulty":   { "average": 0, "count": 0 },
  "presentation": { "average": 0, "count": 0 },
  "value":        { "average": 0, "count": 0 }
}
```
- 4 维全 `{0, 0}` 兜底 ✅（非 null/undefined）

### 3.3 Test 2: 3 个 recipeId（1 有评论 + 2 无评论）

```bash
curl -s -X POST http://localhost:3001/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["10000000-0000-0000-0000-000000000010","f88473e1-d0a4-42d8-aa6a-953b0296750a","7328f1fa-5df9-4732-9dd6-828969deeb89"]}'
```

| recipe | hasDim | dimAvg |
|--------|--------|--------|
| 番茄炒蛋 | True | `{taste:5/1, difficulty:2/1, presentation:4/1, value:3/1}` ✅ |
| 番茄炒蛋（改编） | True | `{0,0,0,0}` ✅ |
| 番茄炒蛋（改编）（改编） | True | `{0,0,0,0}` ✅ |

3 道菜都返回完整 dimensionAverages，无任何缺失。

### 3.4 Test 3 & 4: 边界（应 400）

| 用例 | code | message |
|------|------|---------|
| `recipeIds: ["1"]` (单食谱) | 400 | 请提供至少 2 个食谱 ID 进行对比 ✅ |
| `recipeIds: []` (空数组) | 400 | 请提供至少 2 个食谱 ID 进行对比 ✅ |

### 3.5 L6 前端 Vite 编译产物 grep

```bash
cd /Users/max_yang/Projects/food-website/frontend
grep -l 'dimensionAverages' dist/assets/*.js
# → dist/assets/ComparePage-DfKEWcCt.js   ← 独立 chunk 命中 ✅
# → dist/assets/RecipeDetailPage-Cl9_mlzq.js   (既有，与本任务无关)
# → dist/assets/UserProfilePage-ByPeymIC.js   (既有，与本任务无关)
```

✅ **ComparePage 独立 chunk 命中**（Vite 编译后真实落地，遵循 tester lesson T-2026-0612-001）

---

## §4 公网生产环境契约验证

### 4.1 L7 公网 API 含 `dimensionAverages`

```bash
curl -s -X POST http://39.103.68.205/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["09dbb410-3205-4f07-b418-bb6c1b4f7533","14302720-58e3-4308-bd6a-e513d901e2a9"]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); r=d['data']['recipes'][0]; print('keys:', list(r.keys()))"
```

**结果**：
```
keys: ['id', 'title', 'description', 'category', 'difficulty', 'servings', 'cookTime',
       'coverImage', 'nutrition', 'ingredients', 'steps', 'season',
       'favoriteCount', 'commentCount', 'viewCount']
```

❌ **公网 prod 不含 `dimensionAverages` 字段** — `avgRating`/`qualityScore` 等字段也未在 keys 中（既有 T-001 行为），但本任务的 `dimensionAverages` 完全没有出现在响应里。

### 4.2 L8 公网前端 chunk 含 `dimensionAverages`

```bash
INDEX=/assets/index-CIztshG9.js
curl -s "http://39.103.68.205${INDEX}" | grep -oE 'ComparePage-[^"]+\.js' | head -1
# → ComparePage-YDm1gDdC.js

curl -s "http://39.103.68.205/assets/ComparePage-YDm1gDdC.js" | grep -c "dimensionAverages"
# → 0
```

**公网 ComparePage chunk 关键标识符命中**：
| 标识符 | 本地 dist（e6112a0 build） | 公网 prod |
|--------|---------------------------|-----------|
| `dimensionAverages` 字面量 | ≥1 | **0** ❌ |
| `cmp-radar-section` CSS class | ≥1 | **0** ❌ |
| `4 维评分对比` 中文 | ≥1 | **0** ❌ |
| `formatDimValue` 函数名 | ≥1 | **0** ❌ |

❌ **公网前端是旧版（`ComparePage-YDm1gDdC.js` = b735a6f 时期的产物）**，本任务的 e6112a0 前端 build 产物为 `ComparePage-DfKEWcCt.js`，**两者 chunk hash 完全不同**，说明 prod 部署没有拉取最新代码。

### 4.3 公网 HTTP 200

`/compare?ids=...` 仍返回 200，页面 shell 正常（无 5xx），SPA 在客户端按旧代码渲染。

### 4.4 结论

**生产环境（39.103.68.205）**：
- ❌ 后端 `POST /api/recipes/compare` 未返回 `dimensionAverages` 字段
- ❌ 前端 `dist/assets/ComparePage-*.js` chunk 未含新代码字面量
- ✅ `/compare` 页面 HTTP 200 正常加载（旧版 UI）

**根因推断**：code review R2 在 e6112a0 完成，但 **deploy 闭环（iter#137 部署报告）尚未触发**。仓库中 `00-story.md`/`01-design.md`/`02-plan-review-r1.json` 都到位，但公网服务运行的是上一个迭代（b735a6f = iter#136 / T-2026-0612-001 完成时点）的代码。

---

## §5 视觉冒烟（桌面 / 移动 / 暗色）

> **注**：本环境无浏览器自动化工具，浏览器状态显示 `cdpReady=false`，公网部署也未更新。视觉冒烟以**代码静态审查 + prod HTTP 间接验证**为依据，**实际渲染需 main 在部署后用真实浏览器截图补全**。

### 5.1 桌面 1440×900（AC-4）

- 静态代码审查通过（`frontend/src/pages/ComparePage.tsx` L162-194）：
  - `<h2 className="cmp-radar-title">📊 4 维评分对比</h2>` ✅
  - `<div className="cmp-radar-grid cmp-radar-grid--${result.recipes.length}">` 动态 2/3 列 ✅
  - 每张卡内：h3 食谱名 + Link + `<DimensionRadar multiColor size={isMobile ? 'sm' : 'md'} />` + 4 维数值摘要 ✅
  - CSS `.cmp-radar-grid--2 { grid-template-columns: 1fr 1fr }` ✅
- 公网 `/compare?ids=...` HTTP 200 ✅（SPA shell 可加载）
- **实际雷达图渲染**：❌ 因 prod 旧版未渲染新 section（待 deploy 闭环后回测）

### 5.2 移动 375×812（AC-7）

- 静态代码审查通过：
  - `useState + resize` 监听 `window.innerWidth <= 600` → `setIsMobile(true)` ✅
  - `<DimensionRadar size={isMobile ? 'sm' : 'md'} />` → 移动端 160px ✅
  - CSS `@media (max-width: 600px)` 内 `.cmp-radar-grid--2, .cmp-radar-grid--3 { grid-template-columns: 1fr }` ✅
  - `.cmp-radar-card { padding: 12px }` + `.cmp-dim-summary { max-width: 160px }` ✅
- **实际单列降级**：❌ 因 prod 旧版 chunk 不含新 CSS（待 deploy 闭环后回测）

### 5.3 暗色模式（AC-6）

- 静态代码审查通过：
  - DimensionRadar 内置 `MutationObserver` 监听 `body.dark` class，**SVG grid/tick/fill 颜色自动切换** ✅（既有 T-001 行为）
  - CSS `body.dark .cmp-radar-section { background: var(--color-card, #1e1e32) }` ✅（L520）
  - CSS `body.dark .cmp-radar-card--0 { background: #2a1a14 }` `--1 { #142a14 }` `--2 { #141e2a }` ✅
  - CSS `body.dark .cmp-radar-title / .cmp-dim-label / .cmp-dim-value` 文字色翻转 ✅
  - 表格行 `body.dark .cmp-row-even td { background: #1a1815 }` `.cmp-td-label { background: #1e1812 }` ✅
- **实际颜色翻转**：❌ 因 prod 旧版 chunk 不含新 CSS（待 deploy 闭环后回测）

---

## §6 整体 Verdict

### 6.1 评分

| 维度 | 评分 | 备注 |
|------|------|------|
| L1 后端 jest | 8/8 PASS ✅ | |
| L2 前端 vitest | 8/8 PASS ✅ | |
| L3 前端 build | 0w 0e + 独立 chunk ✅ | |
| L4 本地 API 正常路径 | 4 维字段完整 ✅ | |
| L5 本地 API 兜底 | `{0,0}` × 4 ✅ | |
| L6 本地前端产物 | 独立 chunk 命中 ✅ | |
| L7 公网后端契约 | **❌ FAIL** | prod 响应 keys 不含 `dimensionAverages` |
| L8 公网前端 chunk | **❌ FAIL** | prod chunk 不含 `dimensionAverages`/`cmp-radar-section`/`4 维评分对比` |
| L9 桌面视觉 | 静态审查通过；实际渲染未验 | 需 deploy 后回测 |
| L10 移动视觉 | 静态审查通过；实际渲染未验 | 需 deploy 后回测 |
| L11 暗色视觉 | 静态审查通过；实际渲染未验 | 需 deploy 后回测 |

### 6.2 整体判定

## 🔴 **VERDICT: RED**

**根因**：仓库代码 e6112a0 全部正确（**8/8 AC 在代码层 PASS**），但**生产环境（39.103.68.205）尚未部署本任务**：
- 公网后端仍跑旧版 `compare.js`，响应不含 `dimensionAverages`
- 公网前端 dist 仍为旧版（`ComparePage-YDm1gDdC.js` ≠ e6112a0 产物 `ComparePage-DfKEWcCt.js`）

**不可接受原因**：
1. **AC-1 8 项中的 1 项（公网后端契约）FAIL** — 这是 T-001 后端契约的扩展，回归降级
2. **AC-4 8 项中的 1 项（公网前端 chunk）FAIL** — 用户访问 `/compare?ids=...` 不会看到新功能
3. **dev-pipeline 部署门**：task owner 应负责到 `iter#137 部署报告 = SUCCESS` 才算 PASS

**好消息**：本地所有自动化测试均通过，**不存在代码 bug**。问题纯粹是部署未触发。

---

## §7 Follow-up（最多 3 条）

1. **[BLOCKER] 触发 deploy 闭环**：main 应立即 spawn deployer 跑 `iter#137`，将 e6112a0 的 backend + frontend 部署到 39.103.68.205；deploy 报告需含 `/api/recipes/compare` 返回 `dimensionAverages` 的 curl 证据 + `dist/assets/ComparePage-*.js` 包含 `dimensionAverages`/`4 维评分对比` 字面量的 grep 证据。deploy 完成后需重新跑 L7/L8/L9-L11 验证。
2. **[NICE-TO-HAVE] 表格行 label 统一**：code review R2 提到表格行 label "难度评分" 与 story AC-5 描述 "难度" 不完全一致（虽然 vitest 用 'getByText("4.2 分 (5人评)")' 不受影响）。建议改为 "难度" 与 "口味/卖相/性价比" 风格统一。
3. **[SECURITY LOW] recipeIds 元素 UUID 格式校验**：security 报告 F-1 建议在 `compare.js` L21-31 的 400 校验后追加 `recipeIds.every(id => typeof id === 'string' && /^[0-9a-fA-F-]{1,36}$/.test(id))`；当前实现已用 `String(c.recipeId)` 兜底，无安全风险但缺乏输入一致性。

---

## §8 Tester Lessons 应用

读 `/Users/max_yang/.qclaw/evolution/lessons/tester.md`：
- **semantic**（无沉淀规则）
- **episodic 最近 1 条** → **直接套用**：
  - [T-2026-0612-001] "**不只信源码层 grep，验证 Vite 编译后真实落地**" → L6 验证 `dist/assets/ComparePage-*.js` 命中、`npm run build` 0w 0e ✅
  - **本任务扩展**：除本地外，**也验证公网 Vite 编译后产物**（L8）—— 此项直接捕获了"代码 PASS 但 prod 旧版"的部署 gap，避免只发 GREEN 误报。

建议将本任务教训晋升为 semantic 规则：
> **「涉及前后端双改的功能任务，QA 必须区分 (1) 本地代码 + (2) 公网部署两层验证，缺一不可；公网 curl + 公网 chunk grep 缺位 → 视为 RED。」**

---

## §9 证据清单（可重放）

```bash
# L1 后端
cd /Users/max_yang/Projects/food-website/backend
npx jest tests/compare.test.js
# → 8 passed, 8 total

# L2 前端
cd /Users/max_yang/Projects/food-website/frontend
npx vitest run pages/ComparePage.test.tsx
# → 8 passed, 8 total

# L3 前端 build
cd /Users/max_yang/Projects/food-website/frontend
npm run build
npm run build 2>&1 | grep -iE "warn|error"   # → (无输出)

# L4-L5 本地后端契约
cd /Users/max_yang/Projects/food-website/backend
DB_DIALECT=sqlite PORT=3001 nohup node server.js > /tmp/be.log 2>&1 &
curl -s -X POST http://localhost:3001/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["10000000-0000-0000-0000-000000000010","f88473e1-d0a4-42d8-aa6a-953b0296750a"]}' \
  | python3 -m json.tool

# L6 本地前端产物
cd /Users/max_yang/Projects/food-website/frontend
grep -l 'dimensionAverages' dist/assets/*.js
# → dist/assets/ComparePage-DfKEWcCt.js  (本地 ✅)

# L7 公网后端契约
curl -s -X POST http://39.103.68.205/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["09dbb410-3205-4f07-b418-bb6c1b4f7533","14302720-58e3-4308-bd6a-e513d901e2a9"]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); r=d['data']['recipes'][0]; print('dimensionAverages' in r)"
# → False  (公网 ❌)

# L8 公网前端 chunk
curl -s "http://39.103.68.205/assets/ComparePage-YDm1gDdC.js" | grep -c "dimensionAverages"
# → 0  (公网 ❌)
```

---

*Report complete. Verdict RED with deploy-mismatch as the sole blocker.*
