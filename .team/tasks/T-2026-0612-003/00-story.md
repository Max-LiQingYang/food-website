# T-2026-0612-003: 4 维评分闭环后首次内容质量巡检

> **Type:** Story  
> **Status:** Draft  
> **Parent:** #137（ComparePage 4 维对比可视化已上线）  
> **Created:** 2026-06-12  
> **Author:** product (coordinator subagent)  
> **Direction:** C（内容质量）

---

## 1. 业务背景

4 维评分闭环已上线（#130/#132/#133/#134/#137）：用户可对每道食谱打分 taste/difficulty/presentation/value，ComparePage 用 4 维雷达图做对比决策。但**任何 1 个维度 count=0 都会破坏对比效果**——用户看到「口味 4.2 vs 难度无数据」无法理性决策。

当前 94 道食谱经过 #124（重复清理）和 #127（categoryTags 归一化）两轮 C 方向治理，但从未做 4 维视角的质量巡检：有多少食谱某维度评分缺失？qualityScore 是否与 4 维平均分一致？排行榜数据是否完整？season=all 占比是否超标？

本 Story 是 4 维闭环后第一次系统性巡检，目标是建立**可复用的 4 维覆盖巡检脚本**并修复系统性问题。

---

## 2. 验收标准 (AC)

### A. 数据完整性 — 4 维评分覆盖（至少 3 条）

- **AC-1** 全站 94 道食谱中，每道食谱在 taste/difficulty/presentation/value 4 个维度上至少 1 个维度有评分数据（count ≥ 1），杜绝「全 0 孤儿」食谱。若存在全 0 食谱，输出清单并标注是否为主推/排行榜食谱。
- **AC-2** 生成 4 维覆盖率统计报告（JSON + 终端摘要），单独展示每维度有评分（count ≥ 1）的食谱数量和占比：taste / difficulty / presentation / value 各多少道。
- **AC-3** 排行榜 Top 20 食谱的 4 维评分（用 `GET /api/recipes/:id/comments/stats` 的 dimensionAverages 字段验证）：全部 4 个维度 count ≥ 1 且 average ≥ 1.0。任意一条不满足 → AC 失败。
- **AC-4** 至少修复 1 类系统性问题：若存在「全 0 孤儿」食谱，使用与 #133 同源的维度回填策略补齐（基于 comments 表的 taste/difficulty/presentation/value 历史数据重算），确保修复后每道食谱至少 1 维有评分。

### B. 字段格式一致性（至少 2 条）

- **AC-5** categoryTags 在 DB 中已统一为 JSON 数组格式：巡检脚本扫描全表，发现任何 categoryTags 值为字符串（非 JSON parse 后为 object）的记录 → 输出告警清单。若存在，引用 #127 normalize-category-tags.js 策略（先 JSON.parse 再归一化）输出修复建议。
- **AC-6** season 字段值域合规：巡检确认所有食谱的 season ∈ {spring, summer, autumn, winter, all}，tags 字段为有效 JSON 数组（或有 null/空值标记 → 告警）。

### C. 质量评分校准（至少 2 条）

- **AC-7** qualityScore DB 静态值与动态计算值（4 维平均分映射到 0-100：`(avg4dim * 20)`）偏差校准：巡检脚本计算每道食谱的 `dynamicScore = (tasteAvg + difficultyAvg + presentationAvg + valueAvg) / 4 * 20`（无评分维度视为 0），与 DB 的 qualityScore 值比较，偏差 > 5 分的食谱输出校准清单。
- **AC-8** 校准清单按偏差降序排列，附带每道食谱的 4 维平均分明细，供人工判断是否需重跑 sync-quality-score.js（参考 #124 公式：views×0.3+fav×2+rating×5+com×1.5）或改用 4 维均值公式。

### D. 重复数据清理（至少 1 条）

- **AC-9** 扫描 #124 之后是否有新重复食谱（按 title+author 模糊匹配，相似度 ≥ 0.85）：输出重复组清单，每组附带 title、id、createdAt、viewCount、commentCount、favoriteCount，推荐保留互动数据最高的条目。

### E. 排行榜与发现页数据（至少 2 条）

- **AC-10** 排行榜 Top 10 食谱的 coverImage / title / category / qualityScore / 4 维评分数据 / favoriteCount 全部非空。巡检脚本逐条检查，任一字段空 → 输出具体食谱和缺失字段。
- **AC-11** 季节标签分布巡检：season=all 的食谱占比 ≤ 80%（#108 经验阈值）。若超标，输出分季节统计 + 建议将部分「四季皆宜」食谱重新归类到具体季节。

### F. 巡检脚本可复用（至少 2 条）

- **AC-12** 新增 `backend/scripts/dimension-coverage-check.js`：独立可执行 (`node scripts/dimension-coverage-check.js`)，支持 `--local` 参数切换本地 SQLite / 生产 MariaDB。输出终端摘要（覆盖率矩阵 + 异常清单）+ JSON 报告写入 `backend/scripts/reports/` 目录。
- **AC-13** 增强 `backend/scripts/quality-check.js`：在现有检查项（story / culturalBackground / video / nutrition / categoryTags / steps / ingredients / ratingCount）之后新增「4 维评分覆盖」统计段落，**不修改或破坏**现有检查逻辑。新增段落仅做统计输出（4 维覆盖率 + 全 0 孤儿数量），不影响 exit code。

---

## 3. 范围之外 (Out of Scope)

| # | 内容 | 原因 |
|---|------|------|
| O1 | 修改 ComparePage UI | #137 已 done，不动前端 |
| O2 | 调整 4 维评分模型定义 | taste/difficulty/presentation/value 定义和 1-5 量级不变 |
| O3 | 动用户隐私字段 | email/password/hashed 数据不涉及 |
| O4 | 引入新 npm 依赖 | 巡检脚本仅用 Sequelize + mysql2（已有依赖） |
| O5 | 修改数据库 schema | 不 ALTER TABLE，不新增列，不删列 |
| O6 | 部署模板升级（deploy-template） | 那是另一条 Story，不在本次 scope |
| O7 | 排行榜排序算法调整 | 排行榜 Top N 查询逻辑不动 |

---

## 4. 风险与依赖

| # | 风险 | 影响 | 缓解措施 |
|---|------|------|----------|
| R1 | 94 道食谱的扫描 SQL 可能超时（生产 MariaDB 限 < 5s） | 巡检脚本卡死 | 使用单次 `LEFT JOIN` 批量查询 comments 聚合维度（4 条 AVG+COUNT 子查询），不走 N+1 逐条请求 |
| R2 | DB 写入（如修复全 0 孤儿）须走迁移脚本 | 直接 UPDATE 可能覆盖人工修正的数据 | 修复逻辑封装为独立迁移脚本 `fix-dimension-orphans.js`，只读巡检 + 可选修复分离（`--fix` flag） |
| R3 | qualityScore 动态计算 vs 静态值偏差可能很大（#124 sync 用的是旧公式） | 大量食谱被标记为「偏差超标」，无法行动 | AC-7 仅输出报告，不自动改写；人工确认后再决定是否重跑 sync-quality-score.js |
| R4 | 后端 API `/api/recipes/:id/comments/stats` 依赖 Comment 表的 4 维字段存在 | 巡检 curl 验证可能假阳性（API 内存计算 ≠ DB 存储） | AC-3 用 API 验证排行榜；覆盖率巡检用 DB 直查（ground truth），双路径交叉验证 |
| R5 | season=all 占比超 80% 需要重新归类 | 改 season 可能影响按季节筛选的功能 | 仅输出统计和建议，不改 DB |

---

## 5. 完成定义 (DoD)

- [ ] 巡检报告输出到 `backend/scripts/reports/T-2026-0612-003-coverage.json`（含覆盖率矩阵 + 异常清单 + 校准偏差清单 + 重复组清单 + 排行榜空字段清单 + 季节分布统计）
- [ ] 至少修复 1 类系统性问题（优先处理「全 0 孤儿」→ 回填 4 维评分，或 categoryTags 归一 → 跑 normalize 脚本，或 season 超标 → 人工归类后批量 UPDATE）
- [ ] 部署后公网 `curl http://39.103.68.205/api/recipes/<id>/comments/stats` 返回 dimensionAverages 字段真实有数据（验证修复生效）
- [ ] `dimension-coverage-check.js` 在服务器上可直接执行并输出报告（`docker exec food-backend node scripts/dimension-coverage-check.js`）
- [ ] `quality-check.js` 增强后仍全部现有检查项 PASS（新增 4 维段落仅输出统计，不引入新 FAIL）
- [ ] 巡检 JSON 报告提交到 git（纳入 `.team/tasks/T-2026-0612-003/` 目录）

---

## 6. 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/scripts/dimension-coverage-check.js` | **新增** | 4 维覆盖巡检脚本（主产出） |
| `backend/scripts/quality-check.js` | **修改** | 末尾追加 4 维统计段落 |
| `backend/scripts/reports/T-2026-0612-003-coverage.json` | **新增** | 巡检输出报告 |
| `backend/scripts/fix-dimension-orphans.js` | **可能新增** | 全 0 孤儿修复脚本（如有需要） |
| `backend/models/comment.js` | **只读** | 确认 DIMENSION_FIELDS 定义 |
| `backend/models/recipe.js` | **只读** | 确认 qualityScore/season/categoryTags 字段定义 |

---

## 7. 后续阶段派发顺序

```
story (本阶段) → architect → reviewer(Plan) → fullstack → reviewer(Code) → tester → security → devops
```

| 阶段 | 角色 | 产出物 | 预计耗时 |
|------|------|--------|----------|
| Story | product ✅ | 00-story.md（本文档） | — |
| Design | architect | 01-design.md（巡检脚本架构 + 数据流 + 表关联设计） | 5-8 min |
| Plan Review | reviewer | 02-plan-review-r1.json（6 维评审） | 3-5 min |
| Impl | fullstack | 03-impl.diff（脚本代码 + 报告输出） | 8-12 min |
| Code Review | reviewer | 04-code-review-r1.json（6 维评审） | 3-5 min |
| QA | tester | 05-qa-report.md（AC 验证 + 报告格式校验） | 5-8 min |
| Security | security | 06-security-audit.json（DB 连接安全 + 注入防护） | 3-5 min |
| Deploy | devops | DEPLOY-report.md（服务器部署 + curl 验证） | 8-15 min |

> **注意：** 本次仅后端脚本任务，前端不动 → 无 ui-designer 阶段，全栈专家负责脚本编写。部署阶段如需后端容器重建，参考 #132/#134 的 ghcr.io 镜像 push/pull 流程。

---

```yaml
# metadata — 供 main agent 解析
taskId: T-2026-0612-003
title: "4 维评分闭环后首次内容质量巡检"
direction: C
parentTask: T-2026-0612-002
baselineCommit: e6112a0
acCount: 13
priorityBreakdown:
  P0_data_integrity: [AC-1, AC-2, AC-3, AC-4]
  P1_field_format: [AC-5, AC-6]
  P1_quality_calibration: [AC-7, AC-8]
  P2_duplicate: [AC-9]
  P1_leaderboard: [AC-10, AC-11]
  P1_script_reusability: [AC-12, AC-13]
estimatedRounds: 1
  # 如果全 0 孤儿 > 0，可能需要 R2 修复 round
riskLevel: medium
  # 风险 1: DB 扫描性能 (≤5s)
  # 风险 2: qualityScore 校准偏差可能很大 → 仅报告不动 DB
scope:
  filesChanged: 3-5
  newFiles: 2
  frontendTouched: false
  backendTouched: true
  dbMigration: optional
  dependenciesAdded: 0
deployRequirement:
  backendRestart: false
  frontendRebuild: false
  dockerCp: true  # 仅脚本文件 cp 进容器
  verification: "curl /api/recipes/<id>/comments/stats | jq .data.dimensionAverages"
```
