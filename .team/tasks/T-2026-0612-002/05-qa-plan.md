# T-2026-0612-002 QA Plan

> **TaskID:** T-2026-0612-002  
> **Author:** tester (subagent)  
> **Created:** 2026-06-12 14:35  
> **Scope:** Verify 8 AC (per 00-story.md §2) + e2e contract + 3 viewport smoke  
> **Baseline:** 371ab33 → impl at e6112a0  
> **Code Review:** R2 PASS overall=8.33 (B1=8 B2=8 B3=9 B4=9 B5=8 B6=8) / 0 blocker / 2 suggestion  
> **Security Audit:** PASS overall=9.5 / 0 high / 1 low (F-1 recipeIds 元素类型校验缺失, 不阻塞)

---

## §0 测试矩阵速览

| 层 | 测试项 | 命令 / 工具 | 预期 | 严重度 |
|---|--------|-------------|------|--------|
| L1 后端 | jest compare.test.js 全 8 case | `npx jest tests/compare.test.js` | 8/8 PASS | 阻断 |
| L2 前端 | vitest ComparePage.test.tsx 全 8 case | `npx vitest run pages/ComparePage.test.tsx` | 8/8 PASS | 阻断 |
| L3 前端 | production build | `npm run build` | 0 warn 0 error | 阻断 |
| L4 后端契约 | 本地后端 POST /compare 真实 recipeIds | curl + jq | `dimensionAverages` 4 维字段 | 阻断 (AC-1) |
| L5 后端契约 | 无评分兜底 | curl (无评论 recipeId) | `{average:0, count:0}` 4 维 | 阻断 (AC-1 兜底) |
| L6 前端产物 | Vite 编译后产物含 `dimensionAverages` | `grep -l 'dimensionAverages' dist/assets/*.js` | ≥1 个 chunk | 阻断 (AC-4 落地) |
| L7 公网契约 | PROD /compare 含新字段 | `curl -X POST http://39.103.68.205/api/recipes/compare` | `dimensionAverages` 存在 | 阻断 (生产落地) |
| L8 公网产物 | PROD 入口 chunk 含 `dimensionAverages` | `curl dist/assets/ComparePage-*.js \| grep -c` | ≥1 次 | 阻断 (生产落地) |
| L9 视觉 | 桌面 1440×900 渲染 | 浏览器 + 移动模拟 | 雷达图 + 2 列网格 | 阻塞 AC-4 验收 |
| L10 视觉 | 移动 375×812 单列 | 浏览器移动 | 单列 + sm 尺寸 | 阻塞 AC-7 验收 |
| L11 视觉 | 暗色模式 | body.dark | 颜色翻转 | 阻塞 AC-6 验收 |

---

## §1 L1-L3 自动化测试

### 1.1 后端 jest
```bash
cd /Users/max_yang/Projects/food-website/backend
npx jest tests/compare.test.js
```
- 期望：8 passed / 8 total
- 覆盖：3 个 module export case + 5 个 aggregateDimensionAverages 纯函数 case
- 通过条件：所有 ✓

### 1.2 前端 vitest
```bash
cd /Users/max_yang/Projects/food-website/frontend
npx vitest run pages/ComparePage.test.tsx
```
- 期望：8 passed / 8 total
- 覆盖：3 个新增 case（雷达图渲染、空态隐藏、表格数值行）+ 5 个既有 case
- React Router v7 future flag warning：可忽略，不影响测试通过

### 1.3 前端 build
```bash
cd /Users/max_yang/Projects/food-website/frontend
npm run build
```
- 期望：exit 0，0 warning 0 error
- 必须产物：`dist/assets/ComparePage-*.js`（独立 chunk）

---

## §2 L4-L8 端到端契约验证

### 2.1 本地后端启动
```bash
cd /Users/max_yang/Projects/food-website/backend
DB_DIALECT=sqlite PORT=3001 nohup node server.js > /tmp/be.log 2>&1 &
sleep 6
curl -s http://localhost:3001/health  # → 200
```

### 2.2 L4 正常路径（AC-1）
```bash
curl -s -X POST http://localhost:3001/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["<r-with-comments>","<r2>"]}' \
  | jq '.data.recipes[0].dimensionAverages'
```
- 期望：
  ```json
  {
    "taste":        {"average": 4.2, "count": 5},
    "difficulty":   {"average": 2.8, "count": 5},
    "presentation": {"average": 3.5, "count": 4},
    "value":        {"average": 4.0, "count": 3}
  }
  ```
- 4 维 key 完整，结构为 `{average, count}`

### 2.3 L5 无评分兜底（AC-1 兜底 / R1）
```bash
curl -s -X POST http://localhost:3001/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["<r-no-comments>","<r2>"]}' \
  | jq '.data.recipes[0].dimensionAverages'
```
- 期望：
  ```json
  {
    "taste":        {"average": 0, "count": 0},
    "difficulty":   {"average": 0, "count": 0},
    "presentation": {"average": 0, "count": 0},
    "value":        {"average": 0, "count": 0}
  }
  ```
- 兜底值非 null/undefined（前端可安全 `?.`）

### 2.4 L6 前端 Vite 编译产物
```bash
cd /Users/max_yang/Projects/food-website/frontend
grep -l 'dimensionAverages' dist/assets/*.js
```
- 期望：≥ 1 个 chunk
- 关键产物：`dist/assets/ComparePage-*.js`（独立 chunk）

### 2.5 L7 公网生产契约
```bash
curl -s -X POST http://39.103.68.205/api/recipes/compare \
  -H 'Content-Type: application/json' \
  -d '{"recipeIds":["<prod-r1>","<prod-r2>"]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); r=d['data']['recipes'][0]; print('dimensionAverages' in r, r.get('dimensionAverages'))"
```
- 期望：`True` + 4 维结构
- **此项为 production gate**：失败 → 阻断发布

### 2.6 L8 公网生产产物
```bash
# 从 index 找 ComparePage chunk 名
INDEX=$(curl -s http://39.103.68.205/ | grep -oE '/assets/index-[^"]+\.js' | head -1)
COMP=$(curl -s "http://39.103.68.205${INDEX}" | grep -oE 'ComparePage-[^"]+\.js' | head -1)
curl -s "http://39.103.68.205/assets/${COMP}" | grep -c "dimensionAverages"
```
- 期望：≥ 1 次匹配
- **此项为 production gate**：失败 → 阻断发布

---

## §3 L9-L11 视觉冒烟

### 3.1 桌面 1440×900（AC-4 / AC-6 暗色）
- 浏览器 viewport = 1440×900
- 访问 `http://39.103.68.205/compare?ids=<r1>,<r2>`
- 验证：
  - 「4 维评分对比」section 出现（h2 标题）
  - 2 列网格（`.cmp-radar-grid--2`）
  - 每个雷达图卡片含：食谱名链接 + DimensionRadar + 4 维数值摘要
  - 数值格式 `4.2 分 (5人评)`（表格内）
  - 雷达图 SVG 渲染（recharts PolarGrid/Radar 可视）

### 3.2 移动 375×812（AC-7）
- DevTools 切到 iPhone X 模拟
- 验证：
  - `.cmp-radar-grid--2` / `.cmp-radar-grid--3` 降为单列
  - DimensionRadar `size="sm"`（160px）渲染，不溢出
  - 4 维数值摘要 2 列布局 max-width=160px

### 3.3 暗色模式（AC-6）
- DevTools console: `document.body.classList.add('dark')`
- 验证：
  - 雷达图卡片背景由 `#fff8f5` `#f5faf5` `#f5f8ff` → `#2a1a14` `#142a14` `#141e2a`
  - 雷达图 SVG 颜色翻转（DimensionRadar 内置 `MutationObserver` 监听 body.dark）
  - 文字颜色 `#1a1a1a` → `#e0e0ee`
  - 表格行 `body.dark .cmp-td-label` 背景 `#1e1812`

---

## §4 通过/失败判定

| 层 | 通过条件 |
|---|---------|
| L1 | 8/8 jest PASS |
| L2 | 8/8 vitest PASS |
| L3 | build 0w 0e，独立 chunk |
| L4 | curl 返回 `dimensionAverages` 4 维 key |
| L5 | 无评分返回 `{average:0, count:0}` |
| L6 | 产物 grep 命中 ≥ 1 chunk |
| L7 | **公网 API 含新字段**（生产 gate） |
| L8 | **公网 chunk 含新字符串**（生产 gate） |
| L9-L11 | 视觉无明显错位（雷达图渲染、单列、暗色） |

### Verdict 规则
- 8 AC + L1-L6 + 视觉 3 项 **全部 PASS** → **GREEN**
- 任何 1 项 FAIL（特别是 L7/L8 公网生产未更新）→ **RED**
- 公网生产未更新但本地 PASS → 标记 **RED with deploy-mismatch follow-up**

---

## §5 Lessons 应用

注入 `/Users/max_yang/.qclaw/evolution/lessons/tester.md`：
- **semantic**（无沉淀规则）
- **episodic 最近 1 条**：
  - [T-2026-0612-001] **不只信源码层 grep，验证 Vite 编译后真实落地** — 直接套用到 L6/L8

---

## §6 风险预案

| 风险 | 检测方式 | 缓解 |
|------|---------|------|
| 公网部署未更新 | L7/L8 | 在本任务中**先验**；若 RED 即时反馈 main，要求触发 deploy 闭环 |
| SQLite/MariaDB 行为差异 | 本地 L4-L5 用 sqlite，prod 用 MariaDB | 验证 `Comment.findAll` 与 `aggregateDimensionAverages` 均不依赖方言特性；null 处理为 JS 层 |
| 浏览器工具不可用 | 启动 L9 之前先 `browser status` | 若不可用则改用 CSS 静态审查 + prod curl 间接验证 |
| 雷达图实际渲染 | DevTools 无环境 | 改用 prod `/compare?ids=...` HTML + chunk 验证，并要求 main 在部署报告里截图 |

---

*Plan complete. Begin execution.*
