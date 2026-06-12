# T-2026-0612-003 FIX_R3 修复摘要

## 修复范围

| # | 文件 | 问题 | 类别 |
|---|------|------|------|
| Bug-1 | `backend/scripts/dimension-coverage-check.js` | T3 EXPLAIN 前缀重复 | QA FAIL |
| Bug-2 | `backend/scripts/quality-check.js` | T4 `ratingCount` 列不存在 | QA FAIL |
| S5-M1 | `backend/scripts/fix-dimension-orphans.js` | 默认 DB 密码 fallback | Security Medium |

## Bug-1: EXPLAIN 前缀重复（dimension-coverage-check.js L504-529）

**问题**：`explainSql` 变量（L504）已含 `EXPLAIN SELECT...` 前缀；L529 又拼 `EXPLAIN QUERY PLAN ${explainSql}` → 最终 SQL 为 `EXPLAIN QUERY PLAN EXPLAIN SELECT...` → SQLite 语法错误。

**修复方案 A**：
1. 删除 `explainSql` 中的 `EXPLAIN` 前缀（L504）
2. SQLite 分支保持 `EXPLAIN QUERY PLAN ${explainSql}` 不变
3. MySQL 分支：`seq.query(explainSql, ...)` → `seq.query(\`EXPLAIN ${explainSql}\`, ...)`（原来直接传不带前缀的 explainSql 给 MySQL 也是漏了 EXPLAIN 关键字）

**验证**：`node backend/scripts/dimension-coverage-check.js --local --explain` 正常输出 EXPLAIN QUERY PLAN，无 SQL 错误。

## Bug-2: ratingCount 列不存在（quality-check.js L47）

**问题**：原 SQL `SELECT ... ratingCount FROM recipes` 中 `ratingCount` 不在 recipes 表 schema（实际列：`favoriteCount` / `commentCount` / `viewCount`）。**这是原版 quality-check.js 已有 bug**。

**修复**：`ratingCount` → `commentCount`（最接近业务语义，`commentCount` 在 schema 中直接用于 commentCount 字段的评分计算）。

**验证**：`node backend/scripts/quality-check.js --local` 原 7 项检查 + 新 4D 段落全部正常输出。

## S5-M1: 默认 DB 密码 fallback（fix-dimension-orphans.js L84）

**问题**：MariaDB 连接配置中 `password: process.env.DB_PASS || process.env.DB_PASSWORD || 'food_password'` 含硬编码默认密码。

**修复**：移除 `'food_password'` fallback → `password: process.env.DB_PASS || process.env.DB_PASSWORD || ''`。密码为空时 Sequelize 会拒绝连接并给出明确错误。

**验证**：`node backend/scripts/fix-dimension-orphans.js` 仍默认只读预览模式，行为不变。

## 验证结果

| 脚本 | 命令 | 结果 |
|------|------|------|
| dimension-coverage-check.js | `--local` | ✅ 6 子分析全跑通 |
| dimension-coverage-check.js | `--local --explain` | ✅ EXPLAIN QUERY PLAN 正常，无 SQL 错误 |
| quality-check.js | `--local` | ✅ 7 项 + 4D 段落正常输出 |
| fix-dimension-orphans.js | 无参 | ✅ 默认只读模式，行为不变 |

## 建议下一阶段

→ **re-test（QA R4）**，然后 devops 部署。
