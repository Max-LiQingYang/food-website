# T-2026-0612-003: 4 维评分闭环后首次内容质量巡检 — 设计文档

> **Phase:** DESIGN (architect)  
> **Author:** coordinator-architect  
> **Created:** 2026-06-12  
> **Revised:** 2026-06-12 (R2，plan-review r1 反馈修订)  
> **Input:** 00-story.md（13 AC，6 方向，94 道食谱）  

## R2 修订（plan-review r1 后）

- **FIX-1（CP3 模糊匹配）** — §2.2 duplicateScan：中英文双轨匹配，中文 bigram Jaccard ≥ 0.7 / 英文 Dice ≥ 0.85，长度 < 3 标题跳过，新增 chineseSimilarity 伪代码
- **FIX-2（CP4 修复隔离）** — §1.2 / §4.1 / §5 R2：修复走独立脚本 `fix-dimension-orphans.js`（dimension-coverage-check.js 永远只读），事务包装 + 并发锁 `/tmp/fix-dim-orphans.lock`
- **FIX-3（CP5 Exit Code 隔离）** — §1.3 / §6.2：check4DimensionalCoverage 全量 try-catch，失败返回 `{ skipped: true, reason }` 不 throw，caller 判 skipped 后输出
- **FIX-4（HIGH）** — 同 FIX-3 的 try-catch 边界规则，§1.3 + §6.2 同步覆盖
- **FIX-5（MEDIUM 部署保护）** — §8：引用 #137 关键教训（compose 名/container_name/baked-in/xattr/lazy chunk），`--fix` 在 production 默认拒绝
- **FIX-6（MEDIUM 代码复用）** — §1.3 / §6.2 / §4.2：quality-check.js 通过 `require('./dimension-coverage-check.js')` 取 `check4DimensionalCoverage`，失败 graceful degrade
- **FIX-7（LOW）** — §3 JSON meta 段新增 `dbName: string` 字段
- **FIX-8（LOW）** — §2.2 dynamicVsStaticScore：`Math.round(... * 100) / 100` 防浮点尾巴，`Math.abs()` 显式标注
- **FIX-9（MEDIUM 部署验证）** — §8.2「部署验证 4 件套」：① chown 验证 ② compose ps ③ curl dimensionAverages ④ chunk hash 提取

---

## 1. 实现策略

### 1.1 单次 LEFT JOIN 聚合，杜绝 N+1

巡检脚本 `dimension-coverage-check.js` 的核心查询用 **1 条 SQL 完成** 94 道食谱 × 4 维的覆盖扫描——`recipes LEFT JOIN comments` + `GROUP BY r.id` + 每维度 `COALESCE(SUM(CASE WHEN ...))`/`COALESCE(AVG(CASE WHEN ...))` 聚合（共 8 个 COALESCE 聚合表达式）。单次往返 MariaDB，4 个 COUNT 聚合在同一行内避免 94 次子查询。94 道食谱 × ~696 条评论规模下，单次 LEFT JOIN 预计 < 500ms（idx_comment_recipeId 索引已存在）。

所有子分析（orphan、偏差、duplicate scan、season 分布、TopN）均从同一次结果集派生，不额外打 DB。

### 1.2 只读默认 + 独立修复脚本 `fix-dimension-orphans.js`（R2 修订）

> **原方案**：`dimension-coverage-check.js` 内置 `--fix` flag 做修复。  
> **R2 修订**：修复逻辑从巡检脚本中剥离——`dimension-coverage-check.js` **永远只读**，不提供 `--fix` 入口。所有修复走独立脚本 `fix-dimension-orphans.js`。

**规则：**

- `dimension-coverage-check.js`：无任何 flag 可触发写操作。仅输出终端摘要 + JSON 报告到 `reports/` 目录。
- `fix-dimension-orphans.js`：**唯一修复入口**。从 `reports/T-2026-0612-003-coverage.json` 读取 `orphanList`，对全 0 孤儿食谱执行 `comments` 表维度回填 → `UPDATE recipes SET qualityScore = ...`（调用 #133 同源策略）。

**事务包装（R2 新增）：**

所有 UPDATE 包裹在单个 Sequelize transaction 中：

```javascript
// fix-dimension-orphans.js 核心片段
const seq = new Sequelize(/* config */);
await seq.transaction(async (t) => {
  for (const orphan of orphanList) {
    const dims = await computeDimensions(orphan.id, t);
    await Recipe.update(
      { qualityScore: calcScore(dims) },
      { where: { id: orphan.id }, transaction: t }
    );
  }
  // 任一步骤失败 → 自动 ROLLBACK，0 条脏数据残留
});
```

**并发锁（R2 新增）：**

脚本启动时检测 `/tmp/fix-dim-orphans.lock` 文件（存 PID），拒绝并发实例：

```javascript
// fix-dimension-orphans.js 启动时
const LOCK_PATH = '/tmp/fix-dim-orphans.lock';
const fs = require('fs');

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const pid = parseInt(fs.readFileSync(LOCK_PATH, 'utf-8'));
    try {
      process.kill(pid, 0); // 进程仍存活
      console.error(`❌ 已有修复实例运行中 (PID: ${pid})，拒绝并发执行`);
      process.exit(1);
    } catch {
      fs.unlinkSync(LOCK_PATH); // 进程已死，清理过期锁
    }
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid));
}

// ...修复逻辑完成后...
function releaseLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
}
```

**写入安全性（R1 原保护，R2 保留）：**

1. 修复前自动备份：`SELECT * FROM recipes WHERE id IN (...)` 输出到 `reports/pre-fix-backup-{timestamp}.json`。
2. 修复后二次扫描验证：跑完整 coverage 查询确认无全 0 孤儿残留。
3. 所有 UPDATE 记录写入修复日志 `reports/fix-log-{timestamp}.json`（含 old/new qualityScore）。
4. `reports/` 目录不存在时脚本自动 `mkdir -p`（实现级保证）。

**生产环境保护（R2 新增）：**

`fix-dimension-orphans.js` 检测到非 `--local` 模式时，默认拒绝执行。需显式传入确认标志：

```bash
# 生产环境执行（需双重确认）
node fix-dimension-orphans.js --fix --i-know-what-im-doing
```

无此标志时输出红色警告并 exit(0)，防止误操作。

### 1.3 quality-check.js 追加 4 维统计段落（不改现有逻辑，R2 修订）

`quality-check.js` 现有 7 项检查保持**完全不动**。在其末尾、`allPass` 判断和 `process.exit` 之前，新增 **4 维评分覆盖统计段落**。

> **R2 修订**：明确异常隔离边界——`check4DimensionalCoverage(seq)` 内部全量 try-catch，任何 DB 异常均返回 `{ skipped: true, reason }` 而不 throw，caller 判 `skipped` 后决定是否输出，完全不影响 quality-check.js 的 exit code。

实现为独立函数 `check4DimensionalCoverage(seq)`，通过 `require('./dimension-coverage-check.js')` 导入：

```javascript
// quality-check.js 新增段（allPass 判断之前）
const { check4DimensionalCoverage } = require('./dimension-coverage-check.js');

// ...现有 7 项检查逻辑不变...

// 4 维统计（独立段落，不影响 exit code）
try {
  const r4d = await check4DimensionalCoverage(seq);
  if (!r4d?.skipped) {
    console.log('\n📊 4 维评分覆盖');
    console.log(`  口味: ${r4d.coverage.taste.covered}/${r4d.coverage.taste.total}`);
    console.log(`  难度: ${r4d.coverage.difficulty.covered}/${r4d.coverage.difficulty.total}`);
    console.log(`  外观: ${r4d.coverage.presentation.covered}/${r4d.coverage.presentation.total}`);
    console.log(`  性价比: ${r4d.coverage.value.covered}/${r4d.coverage.value.total}`);
    console.log(`  全 0 孤儿: ${r4d.orphanCount}`);
  } else {
    console.warn(`⚠ 4 维评分覆盖统计跳过（${r4d.reason}）`);
  }
} catch {
  // 防御性外层 catch：即使 require/import 失败也继续
  console.warn('⚠ 4 维评分覆盖统计跳过（模块加载失败）');
}
// 注意：不修改 allPass，不改变 exit code
```

**异常隔离规则（R2 新增，FIX-3 / FIX-4）：**

- `check4DimensionalCoverage(seq)` 内部 **所有 DB 操作**（查询、connect、disconnect）包裹在 try-catch 中。
- catch 块 **只 log 告警 + return `{ skipped: true, reason: string }`**，**绝不 throw**。
- caller 侧：先判 `!r4d?.skipped` 再 `output(r4d)`，DB 故障时静默跳过。
- 最外层额外 `try {} catch {}` 防御 require 失败（如文件不存在）。

### 1.4 不触碰前端 / schema / 依赖

- **ComparePage** 前端不动（#137 已 done）。
- **comments 表**不加列、不改索引——所有 4 维度数据已存在于 `taste/difficulty/presentation/value` 列。
- **recipes 表**不加列——`qualityScore` 列已存在。
- **不引入新 npm 依赖**——全部基于 Sequelize + mysql2（已有依赖），duplicate 模糊匹配用 JS 侧算法（94 食谱 O(n²) ≈ 4371 对，< 0.1s），不走 MySQL UDF。

---

## 2. 数据流与 SQL 设计（核心）

### 2.1 整体数据流

```
┌──────────┐    1 条 LEFT JOIN     ┌──────────────────┐
│ recipes  │◄─────────────────────►│ comments         │
│ (94行)   │  GROUP BY r.id        │ (696行, idx存在) │
└────┬─────┘                       └──────────────────┘
     │ 单次查询结果集（94行 × 9列）
     ▼
┌──────────────────────────────────────────────────────┐
│              内存中 JS 处理 (dimension-coverage-check)│
│                                                      │
│  ① coverageMatrix   → 终端矩阵 + JSON                │
│  ② orphanDetection  → 全 0 孤儿识别                  │
│  ③ dynamicVsStatic  → qualityScore 偏差              │
│  ④ duplicateScan    → 中英文双轨模糊匹配 [R2]        │
│  ⑤ seasonDistribution → season=all 占比              │
│  ⑥ topNHealthCheck  → Top 20 4维完整性               │
│  ⑦ categoryTagsScan → 格式合规扫描                    │
│  ⑧ seasonScan       → 值域合规扫描                    │
│                                                      │
│  ⑨ 汇总 → 终端摘要 + JSON 报告（只读，不写 DB）      │
│  ⑩ fix-dimension-orphans.js → 从 JSON 读 orphanList  │
│      独立修复（事务 + 并发锁） [R2]                   │
└──────────────────────────────────────────────────────┘
```

### 2.2 关键 SQL 草图

#### coverageMatrix — 核心聚合查询（1 条 SQL，预期 < 500ms）

```sql
SELECT
  r.id,
  r.title,
  r.qualityScore,
  r.favoriteCount,
  r.viewCount,
  r.commentCount,
  r.coverImage,
  r.category,
  r.season,
  r.categoryTags,
  r.author,
  r.createdAt,
  r.isFeatured,
  -- 4 维 COUNT（每个维度有评分的评论数）
  COALESCE(SUM(CASE WHEN c.taste IS NOT NULL THEN 1 ELSE 0 END), 0) AS taste_cnt,
  COALESCE(ROUND(AVG(c.taste), 2), 0) AS taste_avg,
  COALESCE(SUM(CASE WHEN c.difficulty IS NOT NULL THEN 1 ELSE 0 END), 0) AS difficulty_cnt,
  COALESCE(ROUND(AVG(c.difficulty), 2), 0) AS difficulty_avg,
  COALESCE(SUM(CASE WHEN c.presentation IS NOT NULL THEN 1 ELSE 0 END), 0) AS presentation_cnt,
  COALESCE(ROUND(AVG(c.presentation), 2), 0) AS presentation_avg,
  COALESCE(SUM(CASE WHEN c.value IS NOT NULL THEN 1 ELSE 0 END), 0) AS value_cnt,
  COALESCE(ROUND(AVG(c.value), 2), 0) AS value_avg
FROM recipes r
LEFT JOIN comments c ON c.recipeId = r.id
GROUP BY r.id
ORDER BY r.title
```

> **R2 补充**：#127 经验——MySQL raw query 返回 `COUNT` 为字符串，所有 cnt 字段需在 JS 侧显式 `parseInt()` 转换，避免字符串拼接 bug。

> **EXPLAIN 预检要点**：确认 `type=ALL` on recipes + `type=ref` on comments（idx_comment_recipeId），`Extra: Using temporary; Using filesort` 仅 94 行可接受。

#### orphanDetection — 从 coverageMatrix 结果集派生（内存过滤）

```javascript
// JS 侧，不上 DB
const orphans = coverageRows.filter(r =>
  r.taste_cnt === 0 &&
  r.difficulty_cnt === 0 &&
  r.presentation_cnt === 0 &&
  r.value_cnt === 0
)
```

#### dynamicVsStaticScore — 从 coverageMatrix 结果集派生（内存计算，R2 精度修订）

```javascript
// JS 侧，不上 DB
const deviations = coverageRows
  .map(r => {
    const dimsWithData = [r.taste_avg, r.difficulty_avg, r.presentation_avg, r.value_avg]
      .filter(v => v > 0)
    // 动态分公式：4 维均值 × 20 = 0-100 映射
    // R2: Math.round(... * 100) / 100 保留 2 位小数，防浮点尾巴
    const dynamicScore = dimsWithData.length > 0
      ? Math.round((r.taste_avg + r.difficulty_avg + r.presentation_avg + r.value_avg) / 4 * 20 * 100) / 100
      : 0
    // R2: 显式 Math.abs() 比较静态 vs 动态偏差
    const delta = Math.abs(dynamicScore - (r.qualityScore || 0))
    return { ...r, dynamicScore, delta }
  })
  .filter(r => r.delta > 5)
  .sort((a, b) => b.delta - a.delta)
```

> **公式说明**：taste/difficulty/presentation/value 各 1-5 分，4 维均值 × 20 映射到 0-100（#137 的 4 维闭环设计）。无评分维度视为 0（参与均值分母仍为 4），与 DB 静态 `qualityScore`（#124 sync 公式：views×0.3+fav×2+rating×5+com×1.5）对比，偏差 > 5 标记。`Math.round(... * 100) / 100` 保留 2 位小数，与 qualityScore 精度对齐。`Math.abs()` 显式确保正偏差值。

> **注**：taste/difficulty/presentation/value 业务上 0 与 NULL 同义（用户主动选 0 等同未评分），故 SQL 聚合用 `> 0` 而非 `IS NOT NULL`。`fix-dimension-orphans.js` 用 `NULLIF(taste, 0)` 验证此语义。

#### duplicateScan — 中英文双轨模糊匹配（R2 修订，FIX-1）

> **原方案**：Dice Coefficient + 中文 bigram + 阈值 0.85 → **过严**（toLowerCase 对中文无效，短标题 near-duplicate 漏检）。  
> **R2 修订**：中英文分开处理，中文用 bigram Jaccard，英文/混合用 Dice Coefficient，阈值分两档。

**预处理**：去除全角/半角标点符号（括号、书名号、逗号、句号、空格），保留有效字符。

**分轨策略**：

1. 统计标题中中文字符（Unicode CJK Unified Ideographs: `\u4e00-\u9fff`）数量
2. 中文字符 ≥ 3 → **bigram Jaccard**，阈值 ≥ 0.7
3. 英文 / 混合标题 → **Dice Coefficient**，阈值 ≥ 0.85
4. 标题长度 < 3 个字符 → **跳过**，避免超短标题误报

**中文 bigram Jaccard 伪代码（R2 新增）：**

```javascript
/**
 * 中文标题相似度（bigram Jaccard）
 * 将字符串切分为字符 2-gram 集合，计算 Jaccard 系数
 */
function chineseSimilarity(a, b) {
  const bigrams = s => {
    const chars = [...s];  // 正确处理 Unicode（含中文）
    const set = new Set();
    for (let i = 0; i < chars.length - 1; i++) {
      set.add(chars.slice(i, i + 2).join(''));
    }
    return set;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  // Jaccard = |A ∩ B| / |A ∪ B| = intersection / (|A| + |B| - intersection)
  return intersection / (setA.size + setB.size - intersection);
}
```

**英文/混合 Dice Coefficient（保留，阈值上调到 0.85）：**

```javascript
/**
 * 英文/混合标题相似度（Dice Coefficient）
 */
function diceSimilarity(a, b) {
  const bigrams = s => {
    const g = new Set();
    const normalized = s.toLowerCase().replace(/[^\w]/g, ''); // 去标点 + lowercase
    for (let i = 0; i < normalized.length - 1; i++) {
      g.add(normalized.slice(i, i + 2));
    }
    return g;
  };
  const ga = bigrams(a);
  const gb = bigrams(b);
  const intersection = new Set([...ga].filter(x => gb.has(x)));
  return (2 * intersection.size) / (ga.size + gb.size);
}
```

**综合伪代码：**

```javascript
function titleSimilarity(a, b) {
  // 预处理：去除全角/半角标点
  const clean = s => s
    .replace(/[\s\u3000「」『』《》（）【】""''、，。：；？！—…·]/g, '')

  const ca = clean(a), cb = clean(b);
  if (ca.length < 3 || cb.length < 3) return 0; // 跳过超短标题

  const cjkCount = s => [...s].filter(c =>
    c.charCodeAt(0) >= 0x4e00 && c.charCodeAt(0) <= 0x9fff
  ).length;

  // 中文字符 ≥ 3：bigram Jaccard ≥ 0.7
  if (cjkCount(ca) >= 3 && cjkCount(cb) >= 3) {
    return chineseSimilarity(ca, cb) >= 0.7 ? chineseSimilarity(ca, cb) : 0;
  }
  // 英文/混合：Dice ≥ 0.85
  return diceSimilarity(ca, cb) >= 0.85 ? diceSimilarity(ca, cb) : 0;
}

// title 相似度 ≥ 阈值 AND author 相似度 (Dice) ≥ 0.8
const groups = findDuplicateGroups(coverageRows, {
  titleSimilarityFn: titleSimilarity,
  authorThreshold: 0.8
});
```

**阈值校准说明：**

| 标题对 | 中文 bigram Jaccard | 英文 Dice | 是否重复 |
|--------|---------------------|-----------|---------|
| `红烧排骨` vs `红烧排骨面` | `{红烧,烧排,排骨}` ∩ `{红烧,烧排,排骨,骨面}` → 3/(3+4-3)=0.75 ✅ | — | 是（3 字 vs 4 字，后缀差异小） |
| `西红柿炒鸡蛋` vs `番茄炒蛋` | `{西红,红柿,柿炒,炒鸡,鸡蛋}` ∩ `{番茄,茄炒,炒蛋}` → 0/(5+3-0)=0 ❌ | — | 否（不同称呼） |
| `麻婆豆腐` vs `麻婆豆花` | `{麻婆,婆豆,豆腐}` ∩ `{麻婆,婆豆,豆花}` → 2/(3+3-2)=0.5 ❌ | — | 否（尾部不同，0.5 在阈值 0.7 以下） |
| `Chicken Curry` vs `Chicken Curry Rice` | — | bigrams 交集 9/并集 16 → dice=0.89 ✅ | 是 |
| `Spaghetti Bolognese` vs `Spaghetti Carbonara` | — | bigrams 交集 6/并集 18 → dice=0.54 ❌ | 否 |

> **为什么不走 MySQL**：MySQL 8.0 无内置 Levenshtein/Jaccard，UDF 引入运维复杂度。94 食谱 JS 侧 O(n²) 远低于 1s。

#### seasonDistribution — 简单聚合（SQL 或 JS 计数）

```sql
SELECT season, COUNT(*) AS cnt
FROM recipes
GROUP BY season
ORDER BY cnt DESC
```

JS 侧计算 `allRatio = allCnt / totalCount`，与阈值 80%（#108 经验值）比较。

#### topNHealthCheck — 排行榜 Top 20 4 维完整性

从 coverageMatrix 结果集中按 `qualityScore DESC` 取 Top 20，逐条检查：

- 4 维全有数据（cnt ≥ 1 且 avg ≥ 1.0）→ PASS
- 任一维度缺失 → 输出缺失维度和当前值

附加检查（AC-10）：coverImage/title/category/qualityScore/favoriteCount 非空。

#### categoryTags 格式扫描 — 独立 SQL + JS 验证

```sql
SELECT id, title, categoryTags FROM recipes
```

JS 侧逐条 `JSON.parse`，检查 `typeof parsed !== 'object'` → 告警。参考 #127 经验：`typeof row.categoryTags === 'string'` 需先 parse。

#### season 值域合规扫描 — 独立 SQL

```sql
SELECT id, title, season FROM recipes
WHERE season NOT IN ('spring', 'summer', 'autumn', 'winter', 'all')
   OR season IS NULL
```

---

## 3. JSON 报告 Schema（R2 修订：meta.dbName）

路径：`backend/scripts/reports/T-2026-0612-003-coverage.json`

```typescript
// TypeScript 风格 schema 定义
interface CoverageReport {
  meta: {
    taskId: "T-2026-0612-003"
    generatedAt: string          // ISO 8601, e.g. "2026-06-12T16:30:00+08:00"
    recipeCount: number          // 94
    totalComments: number        // ~696
    dbDialect: "mysql" | "sqlite"
    dbName: string               // [R2新增] "MariaDB (172.17.0.1)" 或 "本地 SQLite"
    fixMode: boolean             // false（dimension-coverage-check 永远只读）
  }

  // AC-1/AC-2: 覆盖矩阵
  coverageMatrix: Array<{
    id: string                   // UUID
    title: string
    taste:       { count: number; avg: number }   // count≥1 才算有覆盖
    difficulty:  { count: number; avg: number }
    presentation:{ count: number; avg: number }
    value:       { count: number; avg: number }
    dimensionsWithData: number   // 0-4，几个维度 count≥1
  }>

  // AC-1: 全 0 孤儿
  orphanList: Array<{
    id: string
    title: string
    isFeatured: boolean
    isTop20: boolean             // 是否在 qualityScore 前 20
    qualityScore: number
    viewCount: number
    favoriteCount: number
    commentCount: number
  }>

  // AC-7/AC-8: qualityScore 动态 vs 静态偏差（仅偏差 > 5 的条目）
  dynamicVsStatic: Array<{
    id: string
    title: string
    dbQualityScore: number       // DB 静态值
    dynamicScore: number         // avg4dim × 20，Math.round(...*100)/100
    delta: number                // Math.abs(dbScore - dynamicScore)
    taste_avg: number
    difficulty_avg: number
    presentation_avg: number
    value_avg: number
  }>

  // AC-9: 重复组
  duplicateGroups: Array<{
    similarity: number           // 中文 bigram Jaccard / 英文 Dice [R2]
    algorithm: "bigramJaccard" | "diceCoefficient"  // [R2新增] 使用的算法
    recipes: Array<{
      id: string
      title: string
      author: string
      createdAt: string
      viewCount: number
      commentCount: number
      favoriteCount: number
      recommended: boolean       // 互动数据最高的为 true（建议保留）
    }>
  }>

  // AC-11: 季节分布
  seasonDistribution: {
    spring:     { count: number; ratio: number }
    summer:     { count: number; ratio: number }
    autumn:     { count: number; ratio: number }
    winter:     { count: number; ratio: number }
    all:        { count: number; ratio: number }
    nullSeason: { count: number; ratio: number }
    total: number
    allRatioExceedsThreshold: boolean   // all.ratio > 0.80 → true
    threshold: number                   // 0.80
  }

  // AC-3/AC-10: 排行榜 Top 20 完整性
  topNHealth: Array<{
    rank: number                 // 1-20
    id: string
    title: string
    qualityScore: number
    missingFields: string[]      // e.g. ["coverImage", "taste(avg<1.0)", "difficulty(count=0)"]
    allDimensionsOk: boolean     // 4维全有数据→true
  }>

  // AC-5: categoryTags 格式告警
  categoryTagsAlerts: Array<{
    id: string
    title: string
    issue: "NOT_OBJECT" | "PARSE_ERROR" | "MISSING_KEY" | "EMPTY_OBJECT"
    detail: string
  }>

  // AC-6: season 值域告警
  seasonAlerts: Array<{
    id: string
    title: string
    season: string | null
    issue: "INVALID_VALUE" | "NULL"
  }>

  // 终端摘要文本（报告内嵌一份便于查看）
  summary: {
    coverageByDimension: {
      taste:         { covered: number; total: number; ratio: number }
      difficulty:    { covered: number; total: number; ratio: number }
      presentation:  { covered: number; total: number; ratio: number }
      value:         { covered: number; total: number; ratio: number }
    }
    orphanCount: number
    deviationCount: number        // delta > 5
    duplicateGroupCount: number
    topNHealthFailCount: number
    categoryTagsAlertCount: number
    seasonAlertCount: number
    overallStatus: "PASS" | "WARN" | "FAIL"
    // PASS: orphan=0 AND topNHealthFail=0
    // WARN: orphan=0 but 其他告警
    // FAIL: orphan>0 OR topNHealthFail>0
  }
}
```

### Example（截取）：

```json
{
  "meta": {
    "taskId": "T-2026-0612-003",
    "generatedAt": "2026-06-12T16:30:00+08:00",
    "recipeCount": 94,
    "totalComments": 696,
    "dbDialect": "mysql",
    "dbName": "MariaDB (172.17.0.1)",
    "fixMode": false
  },
  "coverageMatrix": [
    {
      "id": "09dbb410-...",
      "title": "冬阴功汤",
      "taste": { "count": 12, "avg": 4.2 },
      "difficulty": { "count": 12, "avg": 3.8 },
      "presentation": { "count": 12, "avg": 4.1 },
      "value": { "count": 11, "avg": 3.9 },
      "dimensionsWithData": 4
    }
  ],
  "orphanList": [],
  "dynamicVsStatic": [
    {
      "id": "xxx",
      "title": "某食谱",
      "dbQualityScore": 45.2,
      "dynamicScore": 68.0,
      "delta": 22.8,
      "taste_avg": 4.0,
      "difficulty_avg": 3.5,
      "presentation_avg": 3.0,
      "value_avg": 3.1
    }
  ],
  "duplicateGroups": [],
  "seasonDistribution": {
    "spring": { "count": 12, "ratio": 0.128 },
    "summer": { "count": 8, "ratio": 0.085 },
    "autumn": { "count": 10, "ratio": 0.106 },
    "winter": { "count": 6, "ratio": 0.064 },
    "all": { "count": 55, "ratio": 0.585 },
    "nullSeason": { "count": 3, "ratio": 0.032 },
    "total": 94,
    "allRatioExceedsThreshold": false,
    "threshold": 0.80
  },
  "topNHealth": [
    {
      "rank": 1,
      "id": "xxx",
      "title": "某热门食谱",
      "qualityScore": 92.5,
      "missingFields": [],
      "allDimensionsOk": true
    }
  ],
  "categoryTagsAlerts": [],
  "seasonAlerts": [],
  "summary": {
    "coverageByDimension": {
      "taste": { "covered": 92, "total": 94, "ratio": 0.979 },
      "difficulty": { "covered": 90, "total": 94, "ratio": 0.957 },
      "presentation": { "covered": 88, "total": 94, "ratio": 0.936 },
      "value": { "covered": 85, "total": 94, "ratio": 0.904 }
    },
    "orphanCount": 0,
    "deviationCount": 12,
    "duplicateGroupCount": 0,
    "topNHealthFailCount": 0,
    "categoryTagsAlertCount": 0,
    "seasonAlertCount": 3,
    "overallStatus": "PASS"
  }
}
```

---

## 4. 文件变更清单（R2 修订）

### 4.1 新建文件

| # | 文件路径 | 说明 | 关键依赖 |
|---|---------|------|---------|
| 1 | `backend/scripts/dimension-coverage-check.js` | **主巡检脚本**（~350 行），覆盖 AC-1~AC-11 全部检查项，**永远只读**（R2 确认：无 `--fix` 入口）。export `check4DimensionalCoverage` 函数供 quality-check.js require | Sequelize, mysql2 |
| 2 | `backend/scripts/reports/` | **新建目录**，存放巡检 JSON 报告 + 修复日志 | — |
| 3 | `backend/scripts/reports/T-2026-0612-003-coverage.json` | **首次巡检输出报告**（由脚本 ① 生成） | — |
| 4 | `backend/scripts/fix-dimension-orphans.js` | **唯一修复入口**（R2 确认）：从 coverage JSON 读 orphanList，事务包装 UPDATE + 并发锁保护。需要 `--fix --i-know-what-im-doing` 标志（生产环境强制确认） | Sequelize, mysql2 |

### 4.2 修改文件

| # | 文件路径 | 修改内容 | 风险等级 |
|---|---------|---------|---------|
| 5 | `backend/scripts/quality-check.js` | 末尾追加 4 维统计段落：`require('./dimension-coverage-check.js')` 取 `check4DimensionalCoverage` 函数（R2），**不改现有逻辑、不改变 exit code**。失败时 graceful degrade（warning 而非 throw） | 极低 |

### 4.3 只读依赖（不改动）

| # | 文件路径 | 用途 |
|---|---------|------|
| 6 | `backend/models/comment.js` | 确认 taste/difficulty/presentation/value 列定义（已存在，无需改） |
| 7 | `backend/models/recipe.js` | 确认 qualityScore/season/categoryTags 字段（已存在，无需改） |
| 8 | `backend/scripts/sync-quality-score.js` | AC-8 偏差过大时供人工参考重跑，不改 |

---

## 5. 风险点对应方案（R2 修订）

### R1 — 性能（≤ 5s）

- **策略**：单次 LEFT JOIN + GROUP BY，MySQL 引擎一次扫描 recipes（94 行）+ ref 访问 comments（idx_comment_recipeId），预期 < 500ms。
- **预检**：实现在 `dimension-coverage-check.js` 的 `--explain` flag，启动前输出 `EXPLAIN FORMAT=JSON <核心SQL>` 到终端。
- **回退**：如果生产 MariaDB 版本不支持 CASE WHEN 聚合（极低概率），回退为 4 条独立 LEFT JOIN 子查询 `(SELECT COUNT(*) FROM comments WHERE recipeId=r.id AND taste IS NOT NULL)`——每条仍是 index ref，总耗时可控在 2s 内。
- **#127 经验复用**：MySQL raw query 返回 `COUNT` 为字符串 → 显式 `parseInt` 转换所有 cnt 字段（R2 补充标注）。
- **#134 经验复用**：DB_PASS vs DB_PASSWORD 命名不一致 → 连接配置兼容两种环境变量名。

### R2 — 修复隔离（独立脚本 + 事务 + 并发锁，R2 修订）

> **原方案**：dimension-coverage-check.js 内置 `--fix` flag + 三层保护（只读→dry-run→fix+备份）。  
> **R2 修订**：修复完全剥离到独立脚本，新增事务包装和并发锁（详见 §1.2）。

- **独立脚本**：`fix-dimension-orphans.js` 是唯一修复入口。`dimension-coverage-check.js` 永远只读，不导出任何写 DB 函数。修复脚本从 JSON 报告读 orphanList 而非直查 DB（断开写链路）。
- **事务保护**：所有 UPDATE 包裹在 `await seq.transaction()` 内，任一步骤失败 → 自动 ROLLBACK，0 条脏数据残留。
- **并发锁**：`/tmp/fix-dim-orphans.lock` 存 PID，启动时检测 → 进程存活拒并发 → 进程已死清理过期锁。
- **备份策略**：修复前 `SELECT * FROM recipes WHERE id IN (...)` 写入 `reports/pre-fix-backup-{timestamp}.json`。
- **幂等性**：修复前先检查当前是否已是全 0 孤儿（二次确认），避免重复 UPDATE。
- **生产环境保护**：非 `--local` 模式必须显式 `--fix --i-know-what-im-doing` 才执行（§1.2）。
- **#124 经验复用**：数据迁移脚本必须先在测试环境验证。

### R3 — qualityScore 偏差（仅报告，不自动改写）

- AC-7/AC-8 校准清单仅输出到 JSON 报告 + 终端摘要，**不**自动调用 `sync-quality-score.js`，**不**自动 UPDATE。
- 偏差 > 5 的食谱按 delta 降序排列，附带 4 维平均分明细，供人工判断：
  - 若动态分更合理（4 维评分有 ≥ 3 个维度），建议手动重跑 `sync-quality-score.js` 但换用 4 维公式。
  - 若静态分更合理（4 维评分数据稀疏，仅 1-2 维有评分），建议保留 `qualityScore` 不动。
- **#124 经验复用**：qualityScore=0 ≠ 没计算（API 运行时 computeQuality() 动态计算），报告注明 dbValue 可能为 0 但 API 返回非 0 的情况。

### R4 — API vs DB 交叉验证（AC-3）

- DB 直查为 ground truth（coverageMatrix）。
- API 验证分两层：
  1. **脚本自动**：`dimension-coverage-check.js` 通过 `http.get('http://localhost:3000/api/recipes/{id}/comments/stats')`（`--api-verify` flag）逐条验证 Top 20，对比 API 返回的 `dimensionAverages` 与 DB 直查结果。
  2. **人工兜底**：产出 `reports/api-verify.sh` 脚本（含 Top 20 的 curl 命令），部署后可直接在服务器上执行验证。
- **#133 经验复用**：生产 API 验证是 ground truth，不信任 subagent 自报 → `--api-verify` 的输出明确区分「DB 值」和「API 值」两列。

### R5 — season 重分类（仅建议，不改 DB）

- season=all 占比统计 → terminal + JSON 输出。
- 若 > 80%：输出「建议将部分『四季皆宜』食谱重新归类到具体季节」+ 分季节统计。
- **不改 DB**：无自动 UPDATE season 的逻辑。人工确认后另开 Story 处理。

### R6 — 部署兼容性（R2 新增，FIX-5 + FIX-9）

部署时必须注意 #137 关键教训（详见 §8）：

1. **compose service 名 ≠ container_name**：`docker compose` 用 service 名 `backend`，`docker exec`/`docker cp`/`docker ps` 用 container_name `food-backend`。混用 → "No such container"。
2. **baked-in image 文件属主**：Dockerfile 中 `COPY --chown=nodeapp:nodejs . .`，容器内进程用户 `nodeapp:nodejs`（1001:1001）。`docker cp` 进容器后文件属主为 `root:root`，必须 `chown -R nodeapp:nodejs` 否则进程无权读写。
3. **macOS xattr 污染**：macOS `tar` 默认带 `com.apple.provenance` xattr，`docker cp` 会报 `lsetxattr ... operation not supported`。传输前必须 `xattr -cr dist/` 或 `COPYFILE_DISABLE=1 tar --no-xattrs`。
4. **React lazy chunk 不在 index.html**：React Router `lazy()` 产生的 chunk 路径只出现在 router 配置中，不在 `index.html` 的 `<script>` 列表。验证需用 `docker exec ls /usr/share/nginx/html/assets/ | grep <chunk>` 而非 `curl + grep index.html`。
5. **`--fix` 生产环境保护**：`fix-dimension-orphans.js` 在生产环境默认拒绝，需显式 `--fix --i-know-what-im-doing` 确认。

---

## 6. 复用与扩展（R2 修订）

### 6.1 CI 集成（GitHub Actions 周巡检）

```yaml
# .github/workflows/weekly-coverage-check.yml（建议，不在本次 scope）
on:
  schedule:
    - cron: '0 6 * * 1'   # 每周一 06:00 UTC
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run coverage check
        run: |
          cd backend
          node scripts/dimension-coverage-check.js --ci
          # --ci flag: 跳过 API verify，JSON 极小化
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/scripts/reports/T-*-coverage.json
```

> **本次 scope**：仅保证脚本支持 `--ci` flag（去颜色输出 + 不调用 API 验证），workflow 文件由后续 CI Story 创建。

### 6.2 quality-check.js 增强段独立函数（R2 修订，FIX-3 / FIX-4 / FIX-6）

```javascript
/**
 * 4 维评分覆盖统计函数（R2 修订：全量 try-catch 异常隔离）
 * 导出此函数供 quality-check.js require 使用
 * 位于 dimension-coverage-check.js 中
 */
async function check4DimensionalCoverage(seq) {
  try {
    // 核心 SQL（与 dimension-coverage-check 共享同一查询）
    const rows = await seq.query(`
      SELECT
        r.id, r.title,
        COALESCE(SUM(CASE WHEN c.taste IS NOT NULL THEN 1 ELSE 0 END), 0) AS taste_cnt,
        COALESCE(SUM(CASE WHEN c.difficulty IS NOT NULL THEN 1 ELSE 0 END), 0) AS difficulty_cnt,
        COALESCE(SUM(CASE WHEN c.presentation IS NOT NULL THEN 1 ELSE 0 END), 0) AS presentation_cnt,
        COALESCE(SUM(CASE WHEN c.value IS NOT NULL THEN 1 ELSE 0 END), 0) AS value_cnt
      FROM recipes r
      LEFT JOIN comments c ON c.recipeId = r.id
      GROUP BY r.id
    `, { type: seq.QueryTypes.SELECT });

    // 计数
    const total = rows.length;
    const tasteCov = rows.filter(r => r.taste_cnt > 0).length;
    const difficultyCov = rows.filter(r => r.difficulty_cnt > 0).length;
    const presentationCov = rows.filter(r => r.presentation_cnt > 0).length;
    const valueCov = rows.filter(r => r.value_cnt > 0).length;
    const orphanCount = rows.filter(r =>
      r.taste_cnt === 0 && r.difficulty_cnt === 0 &&
      r.presentation_cnt === 0 && r.value_cnt === 0
    ).length;

    return {
      skipped: false,
      coverage: {
        taste:         { covered: tasteCov, total },
        difficulty:    { covered: difficultyCov, total },
        presentation:  { covered: presentationCov, total },
        value:         { covered: valueCov, total },
      },
      orphanCount
    };
  } catch (err) {
    // 捕获所有异常：DB 连接超时、查询失败等
    // 不 throw！仅返回 skipped 标记
    console.warn(`⚠ 4 维评分覆盖统计跳过（DB 错误）: ${err.message}`);
    return { skipped: true, reason: err.message };
  }
}

// 导出（dimension-coverage-check.js）
module.exports = { check4DimensionalCoverage };
```

**quality-check.js 侧调用（R2 修订）：**

```javascript
// quality-check.js 末尾（allPass 判断前）
// R2: 通过 require 取 dimension-coverage-check.js 导出的 check4DimensionalCoverage
// 外层 try-catch 防御 require 失败、函数不存在等异常
try {
  const { check4DimensionalCoverage } = require('./dimension-coverage-check.js');
  const r4d = await check4DimensionalCoverage(seq);
  if (!r4d?.skipped) {
    const cov = r4d.coverage;
    console.log('\n📊 4 维评分覆盖');
    console.log(`  口味:     ${cov.taste.covered}/${cov.taste.total}`);
    console.log(`  难度:     ${cov.difficulty.covered}/${cov.difficulty.total}`);
    console.log(`  外观:     ${cov.presentation.covered}/${cov.presentation.total}`);
    console.log(`  性价比:   ${cov.value.covered}/${cov.value.total}`);
    console.log(`  全 0 孤儿: ${r4d.orphanCount}`);
  } else {
    // 4 维覆盖检查因 DB 故障跳过，graceful degrade
    // quality-check.js 主流程完全不受影响
    console.warn(`⚠ 4 维评分覆盖统计跳过（${r4d.reason}）`);
  }
} catch (err) {
  // require 失败 / 函数签名错误等极低概率异常
  console.warn(`⚠ 4 维评分覆盖统计跳过（模块加载失败: ${err.message}）`);
}
// 不修改 allPass，不改变 exit code
```

**用途：**

1. 嵌入 `quality-check.js`（本次 AC-13）。
2. 作为独立模块被外部 require 复用。

### 6.3 脚本扩展预留

- **新维度加入**：如在 taste/difficulty/presentation/value 外新增第 5 维，只需修改 `DIMENSION_FIELDS` 常量数组 + SQL 中追加 2 个 CASE WHEN。
- **阈值参数化**：`JACCARD_THRESHOLD`（中文）/ `DICE_THRESHOLD`（英文）/ `DELTA_THRESHOLD`（偏差）/ `SEASON_ALL_MAX_RATIO` 均为脚本顶部常量，无需改逻辑即可调整。
- **输出格式扩展**：JSON 报告 schema 的 `summary` 段可独立消费，后续可接 Slack/钉钉 webhook 推送（另行开发）。

---

## 7. 派发 plan-review 的检查点（R2 修订）

以下 6 条是 reviewer 必审的关键决策点（R2 增加 CP6）：

1. **SQL 聚合方案是否正确？** 单次 LEFT JOIN + 8 个 COALESCE 聚合表达式在 recipes 94 行规模下是否确实 ≤ 5s？`EXPLAIN` 预期是否合理？所有 cnt 字段在 JS 侧是否做了 `parseInt` 转换（#127 经验）？
2. **JSON 报告 schema 是否覆盖全部 13 条 AC？** 逐一对照 00-story.md AC-1~AC-13，确认每个 AC 在 report schema 中有对应字段或检查逻辑。R2 新增 `meta.dbName` 字段是否正确标注？
3. **中英文双轨模糊匹配是否合理？（R2）** bigram Jaccard（中文，≥ 0.7）+ Dice Coefficient（英文，≥ 0.85）双轨策略是否正确？长度 < 3 的标题跳过规则是否合适？标点预处理是否足够？阈值校准表中 5 对案例是否区分正确？
4. **修复隔离是否符合 R2 新方案？** `fix-dimension-orphans.js` 独立脚本是否与 `dimension-coverage-check.js` 完全解耦（巡检脚本永远只读）？事务 + 并发锁设计是否完备？生产环境保护（`--fix --i-know-what-im-doing`）是否有效？
5. **quality-check.js exit code 隔离是否经得住 DB 故障？（R2）** `check4DimensionalCoverage(seq)` 内部 try-catch 是否覆盖所有 DB 操作？`{ skipped: true, reason }` 返回是否保证 caller 判 `skipped` 后不走输出逻辑？外层 try-catch 是否防御 require 失败？
6. **部署注意事项是否覆盖 #137 全部坑？（R2 新增）** compose service 名/container_name 区分、baked-in file 属主、macOS xattr、React lazy chunk 验证、部署验证 4 件套是否完整列出？

---

## 8. 部署注意事项（#137 经验复用，R2 新增）

### 8.1 部署前检查清单

**本次部署涉及**：后端脚本新增（dimension-coverage-check.js / fix-dimension-orphans.js）+ quality-check.js 修改。**不涉及前端构建**。

| # | 检查项 | 命令 / 方法 | 要点 |
|---|--------|-------------|------|
| 1 | compose 名 vs container 名 | `docker compose ps` | service 名 = `backend`，container_name = `food-backend`。`docker compose` 用前者，`docker exec/cp` 用后者 |
| 2 | baked-in image 属主 | `docker exec food-backend ls -la /app/package.json` | 应显示 `nodeapp nodejs`（1001:1001）。如显示 `root root`，Dockerfile 的 `--chown` 未生效 |
| 3 | macOS xattr 清理 | `xattr -cr backend/scripts/` | 推送前清除 macOS 扩展属性，防 `lsetxattr com.apple.provenance ... operation not supported` |
| 4 | 代码已推送 | `git push && ssh root@39.103.68.205 'cd /root/food-website && git pull'` | 服务器同步最新 commit |
| 5 | DB 连接可用 | `docker exec food-backend node -e "require('./models').sequelize.authenticate()"` | 确认 Sequelize 能连 MariaDB |

### 8.2 部署验证 4 件套（FIX-9，继承 #137）

部署完成后必须逐条执行验证（优先级从高到低）：

```bash
# ① 修复 baked-in 属主（每次 docker cp 后必做）
docker exec food-backend chown -R nodeapp:nodejs /app
# 验证：docker exec food-backend ls -la /app/scripts/dimension-coverage-check.js
# 应显示 -rw-r--r-- nodeapp nodejs

# ② compose 服务健康
docker compose ps
# food-backend 容器 STATUS 应为 Up (healthy) 或 Up

# ③ API 返回 dimensionAverages（验证 4 维闭环工作正常）
curl -s http://localhost:3000/api/recipes/<任意ID>/comments/stats | jq '.data.dimensionAverages'
# 应包含 taste/difficulty/presentation/value 四个字段

# ④ 前端 chunk hash 验证（如有前端变更，本次无）
curl -s http://39.103.68.205/ | grep -o '[A-Za-z0-9_-]*\.js' | sort -u > /tmp/chunk.txt
# 注意：React lazy chunk 不在 index.html，需用 docker exec ls 确认：
# docker exec food-frontend ls /usr/share/nginx/html/assets/ | grep <chunk>
```

### 8.3 `fix-dimension-orphans.js` 部署特殊说明

`fix-dimension-orphans.js` 在生产环境**不自动执行**。部署后需人工确认 orphanList 内容后，显式运行：

```bash
# 生产环境执行（双重确认标志）
docker exec food-backend node scripts/fix-dimension-orphans.js --fix --i-know-what-im-doing
```

无 `--i-know-what-im-doing` 标志时，脚本输出红色警告并 `exit(0)`，不修改任何数据。

---

```yaml
# metadata
taskId: T-2026-0612-003
phase: DESIGN
revision: r2
fixCount: 9
author: coordinator-architect
filesPlanned:
  created:
    - backend/scripts/dimension-coverage-check.js
    - backend/scripts/reports/  # directory
    - backend/scripts/reports/T-2026-0612-003-coverage.json
    - backend/scripts/fix-dimension-orphans.js
  modified:
    - backend/scripts/quality-check.js
  readOnly:
    - backend/models/comment.js
    - backend/models/recipe.js
    - backend/scripts/sync-quality-score.js
estimatedImplRounds: 1
  # dimension-coverage-check.js: 1 round (~350+ lines, straightforward)
  # fix-dimension-orphans.js: 1 round (~100 lines, transaction + lock)
  # quality-check.js append: 1 round (~30 lines)
riskReminders:
  - "#127 MySQL raw query COUNT 返回字符串 → parseInt 所有 cnt 字段"
  - "#124 qualityScore=0 ≠ 没计算 → 报告注明 API 动态计算可能不同"
  - "#134 DB_PASS vs DB_PASSWORD 命名不一致 → 兼容两种"
  - "#137 compose service 名 backend ≠ container_name food-backend"
  - "#137 baked-in image 文件属主 nodeapp:nodejs，docker cp 后必须 chown"
  - "#137 macOS xattr 污染 → cp 前 xattr -cr"
  - "#137 React lazy chunk 不在 index.html → verify 用 docker exec ls"
nextPhase: plan-review (r2)
reviewerCheckpoints: 6  # §7 定义的（CP1-CP5 修订 + CP6 新增）
```
