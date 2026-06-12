# 05-qa-plan.md — T-2026-0612-003 QA 测试计划

> **Phase:** QA (tester)  
> **Created:** 2026-06-12 17:07 GMT+8  
> **Predecessor:** CODE_REVIEW_R2 (APPROVE)  

## 测试环境

| 项目 | 值 |
|------|-----|
| 项目路径 | `/Users/max_yang/Projects/food-website` |
| 数据库 | 本地 SQLite (`backend/database.sqlite`, 3 recipes, 1 comment) |
| 生产部署 | http://39.103.68.205/ (MariaDB) |
| Commit | e6112a0 |

## 测试用例

### T1: `--local` 模式跑通 dimension-coverage-check.js

**目的**: 验证 6 子分析输出格式完整  
**命令**: `node backend/scripts/dimension-coverage-check.js --local`  
**期望**:
- 输出 header "4 维评分覆盖巡检 [本地 SQLite]"
- 6 个子分析段落：📊 4 维覆盖率、🔍 全 0 孤儿食谱、📈 qualityScore 偏差、🔄 疑似重复组、🌤 季节分布、🏆 Top 20 排行榜
- 额外：🏷 categoryTags 格式告警、📅 season 值域告警
- 综合判定（PASS/WARN/FAIL）
- JSON 报告写入 `reports/T-2026-0612-003-coverage.json`

### T2: `--json` 模式仅输出 JSON 到 stdout

**目的**: 验证纯 JSON 输出，无终端装饰  
**命令**: `node backend/scripts/dimension-coverage-check.js --local --json | jq .`  
**期望**:
- stdout 仅含合法 JSON（jq 可解析）
- 顶层 key 包含: meta, coverageMatrix, orphanList, dynamicVsStatic, duplicateGroups, seasonDistribution, topNHealth, categoryTagsAlerts, seasonAlerts, summary

### T3: `--explain` 模式输出 EXPLAIN FORMAT=JSON

**目的**: 验证 SQLite EXPLAIN QUERY PLAN 输出  
**命令**: `node backend/scripts/dimension-coverage-check.js --local --explain`  
**期望**:
- 输出 `--- EXPLAIN QUERY PLAN (SQLite) ---` 标题
- 输出查询计划行（id|parent|detail 格式）

### T4: quality-check.js 跑通（原 7 项 + 新 4D 段落）

**目的**: 验证原 7 项检查 + 4 维覆盖段落  
**命令**: `node backend/scripts/quality-check.js --local`  
**期望**:
- 输出: story 覆盖、culturalBackground 覆盖、视频覆盖、nutrition 完整性、categoryTags 完整性、steps 完整性、ingredients 完整性、评分覆盖
- 末尾输出 📊 4 维评分覆盖段落（4 维度 + 孤儿数）
- 4D 段落失败不影响 exit code

### T5: fix-dimension-orphans.js 无 `--fix` 拒绝

**目的**: 验证只读预览模式  
**命令**: `node backend/scripts/fix-dimension-orphans.js`  
**期望**:
- 输出 "🔒 修复脚本已启动（只读预览模式）"
- 提示添加 `--fix` 标志
- exit code = 0

### T6: fix-dimension-orphans.js --fix + ALLOW_FIX=1 真修复

**目的**: 验证完整修复流程（备份→事务→修复→日志→二次验证）  
**命令**: `ALLOW_FIX=1 node backend/scripts/fix-dimension-orphans.js --local --fix`  
**期望**:
- 读取 orphanList 从 coverage JSON
- 输出孤儿清单
- 修复前备份 → `reports/pre-fix-backup-*.json`
- 事务内 UPDATE qualityScore
- 修复日志 → `reports/fix-log-*.json`
- 二次验证：修复前后孤儿数对比
- 0 条可修复时事务回滚，exit 0

### T7: 并发锁

**目的**: 验证 `/tmp/fix-dim-orphans.lock` 并发互斥  
**命令**: 同时启动两个 fix 实例  
**期望**:
- 第一个实例获取锁，正常执行
- 第二个实例检测到锁文件 + 存活 PID → 输出 "已有修复实例运行中" → exit 1

### T8: 事务回滚

**目的**: 验证 DB 异常时无脏数据写入  
**方法**: 在 `seq.transaction()` 回调内注入 `throw new Error('simulate')`  
**期望**:
- 脚本输出 "修复失败: T8_SIMULATED_DB_ERROR"
- exit code = 1
- DB 中 qualityScore 值不变（与修复前备份一致）

### T9: 报告 JSON schema 字段完整性

**目的**: 验证 coverage JSON 所有必需字段存在  
**命令**: `jq` 检查 JSON 结构  
**期望**:
- `meta`: taskId, generatedAt, recipeCount, totalComments, dbDialect, dbName, fixMode
- `coverageMatrix`: array
- `orphanList`: array
- `dynamicVsStatic`: array
- `duplicateGroups`: array
- `seasonDistribution`: spring/summer/autumn/winter/all/nullSeason/total/threshold/allRatioExceedsThreshold
- `topNHealth`: array
- `summary`: coverageByDimension, orphanCount, deviationCount, duplicateGroupCount, topNHealthFailCount, categoryTagsAlertCount, seasonAlertCount, overallStatus
