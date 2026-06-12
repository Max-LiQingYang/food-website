# T-2026-0612-003 IMPL Summary

> **Phase:** IMPL (fullstack)  
> **Author:** coordinator-fullstack-#138  
> **Date:** 2026-06-12 16:55 GMT+8  

## 文件变更

| # | 文件 | 行数 | 操作 | 说明 |
|---|------|------|------|------|
| 1 | `backend/scripts/dimension-coverage-check.js` | 703 | **新增** | 主巡检脚本，永远只读 |
| 2 | `backend/scripts/fix-dimension-orphans.js` | 321 | **新增** | 独立修复脚本，事务+锁保护 |
| 3 | `backend/scripts/quality-check.js` | 109 (原86+23新增) | **修改** | 末尾追加4D覆盖统计段落 |
| 4 | `backend/scripts/reports/.gitkeep` | 0 | **新增** | 空目录 git 占位 |
| **合计** | | **1133 行**（1024新增+23修改） | | |

## 关键决策

### 1. 单 SQL 聚合模式
完全按 design §2.2 实现：`recipes LEFT JOIN comments` + `GROUP BY r.id` + 8 个 `COALESCE` 聚合表达式，单次 DB 往返。所有子分析（coverageMatrix/orphan/dynamicVsStatic/duplicateScan/topNHealth）均从同一 result set 内存派生，不重复打 DB。

### 2. `require.main === module` 守卫
`dimension-coverage-check.js` 和 `fix-dimension-orphans.js` 均使用 `require.main === module` 守卫，确保 `require()` 导入时不会执行 `main()`。quality-check.js 通过 `require('./dimension-coverage-check.js')` 取 `check4DimensionalCoverage` 函数，避免重复执行。

### 3. 中英文双轨去重
按 design FIX-1 实现：标题预处理去除全角/半角标点，中文字符 ≥3 用 bigram Jaccard（阈值 0.7），英文/混合用 Dice Coefficient（阈值 0.85），长度 <3 标题跳过。author 相似度仍用 Dice（阈值 0.8）。

### 4. 修复脚本安全机制
按 design §1.2 R2 实现三层保护：
- 无 `--fix` → 只读预览退出
- 生产环境需 `ALLOW_FIX=1` 环境变量（否则拒绝）
- `/tmp/fix-dim-orphans.lock` 文件锁防并发
- Sequelize `transaction()` 包裹所有 UPDATE
- 修复前备份 + 修复日志 + 二次验证

### 5. quality-check.js 异常隔离
按 design FIX-3/FIX-4 实现：`check4DimensionalCoverage(seq)` 内部全量 try-catch，catch 返回 `{ skipped: true, reason }` 不 throw。caller 先判 `!r4d?.skipped` 再输出，外层额外 try-catch 防御 require 失败。不修改 `allPass`，不改变 exit code。

## 与 design 的偏差

| # | 偏差项 | 原因 |
|---|--------|------|
| 1 | `dimension-coverage-check.js` 703 行（design 预估 ~350 行） | 完整实现了全部 6 子分析 + categoryTags/season 扫描 + 终端输出 + JSON 报告 + check4DimensionalCoverage 导出 + CLI flags，实际复杂度高于预估 |
| 2 | `fix-dimension-orphans.js` 生产保护：用 `ALLOW_FIX=1` 而非 `--i-know-what-im-doing` | 任务 spec 明确要求 `process.env.ALLOW_FIX=1`，与 design 的 `--fix --i-know-what-im-doing` 略有差异，但安全性等价 |
| 3 | 修复策略：无 4D 数据的孤儿标记为 unfixable + 事务回滚 | design 未明确"无数据怎么办"，实现按安全优先原则：无数据 → 标记 unfixable → 若 0 条成功则事务回滚 |

## 本地验证结果

| 验证项 | 结果 | 备注 |
|--------|------|------|
| `dimension-coverage-check.js --local` | ✅ PASS | 6 子分析全部输出：coverageMatrix(6/9)、3 orphans、6 deviations、1 dup group、season 分布、Top 20 健康检查 |
| `quality-check.js --local` | ✅ PASS | 原 7 项检查 + 新 4D 段落均正常运行，无重复输出 |
| `fix-dimension-orphans.js`（无 --fix） | ✅ 拒绝 | 输出"只读预览模式"提示并 exit(0) |
| `fix-dimension-orphans.js --local --fix` | ✅ PASS | 正确识别 orphan、修复有数据者(法式洋葱汤 QS 56.7→83.33)、标记 unfixable、事务回滚(0条时)、二次验证、备份+日志全部写入 |
| JSON 报告写入 | ✅ PASS | `reports/T-2026-0612-003-coverage.json` 10KB，schema 完整 |
| `reports/` 目录 + `.gitkeep` | ✅ PASS | 目录创建，`.gitkeep` 已提交 |

## 给 code-review 的关注点

1. **SQL 聚合正确性**：确认 `CASE WHEN c.taste IS NOT NULL AND c.taste > 0` 条件中 `> 0` 是否合理（0 分是有意评 0 还是缺数据？当前按 design 的 "有评分数据" 条件，`> 0` 排除 NULL 和 0 分）
2. **#127 parseInt 覆盖**：所有 `toInt()` 调用是否覆盖了 MySQL raw query 返回字符串的情况（已用 `typeof v === 'string'` 判断）
3. **中英文双轨阈值**：Jaccard 0.7 / Dice 0.85 是否合理？测试数据中「Chicken Curry」vs「Chicken Curry Rice」Dice=0.88 通过了阈值，确认业务上是否视为重复
4. **`require.main === module` 守卫**：确认两个新脚本的 `require()` 导入不会副作用执行 `main()`（已验证 quality-check.js 不再输出重复 header）
5. **修复脚本生产保护**：确认 `ALLOW_FIX=1` 环境变量检查在生产部署时有效——脚本检测 `!isLocal && process.env.ALLOW_FIX !== '1'` 时拒绝执行
