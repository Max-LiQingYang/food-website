# Plan Review: Iter #134 用户个人评分历史可视化

**评审员**: Reviewer Agent
**评审时间**: 2026-06-12
**评审材料**:
- PRD v1.0 (`PRD-rating-history.md`)
- ARCH v1.0 (`ARCH-rating-history.md`)

---

## 1. 总体评级

**PASS-WITH-COMMENTS** — PRD/ARCH 整体质量高，技术决策清晰，7 项字段偏差已被 ARCH §0 显式捕获并有处置方案；可在 PM 同步修订 PRD 字段名/规则措辞（不阻塞）的并行下进入编码阶段。

---

## 2. 一句话总结

PRD 完整、ARCH 技术决策稳健（LRU + 4 端点并发 + 3 索引），7 项字段偏差已识别，仅需 PM 同步修订 PRD 措辞以与代码对齐，可并行进入编码。

---

## 3. 评审矩阵

| 维度 | 评级 | 关键发现 |
|---|---|---|
| **A. PRD 完整性** | PASS | 8 个用户故事覆盖普通/少数据/隐私三类核心场景；P0/P1/P2 分级合理（21 项功能、11 项 P0 + 5 项 P1 + 5 项 P2）；10 条 AC 可测试（AC-01~AC-10 含明确数值/状态/路径断言）；业务规则覆盖未登录/少数据/删除/隐私/同食谱多次评分五大边界。**小问题**：AC-01 写 `WHERE tasteRating > 0` 与代码不符（实际为 `IS NOT NULL`），已在偏差清单中。 |
| **B. PRD↔代码一致性** | NEEDS-MINOR-REVISION（不阻塞） | ARCH §0 准确识别 7 处偏差：①字段名(taste/difficulty/presentation/value/rating)、②"全 0"实为"全 NULL"、③UUID 而非 int、④软删除未启用、⑤isAnonymous 字段不存在、⑥全站 API 不存在、⑦User.preferences JSON 风格。**处置建议**：PM 在 PR 描述中以 "PRD 字段名为概念示意，以 ARCH 实际字段为准" 声明即可，无需逐处改 PRD 文字（避免文档漂移），但 AC-01 验证脚本必须用真实 SQL。 |
| **C. ARCH 技术决策** | PASS | ①LRU 缓存合理（无 Redis 依赖、单实例、5min TTL + 主动失效）；②4 端点 + Promise.all 并发粒度细、独立缓存；③索引 2 新增 + 1 确认（去重场景必须用复合索引 `(userId, recipeId, createdAt)`，方案正确）；④部署顺序 DB→后端→前端→灰度 4 步可独立回滚（关键：索引先于代码，避免上线后性能塌方）；⑤去重策略 `MAX(createdAt)` + 应用层兜底是 MVP 合理选择，窗口函数作为后续升级路径。 |
| **D. 数据一致性边界** | PASS | ①同食谱多次评分取最新（§3.1，SQL 模式清晰，应用层兜底可接受）；②4 维全 NULL 过滤（§3.2，ARCH 已澄清 PRD 措辞问题）；③删除评论缓存失效（路由层 hook 而非 Sequelize hook，理由充分——能拿到 auth context + 避免全局副作用）。**P1 建议**：删除 hook 需注意同时失效 `site:dimAverages`（ARCH §1.7.3 已涵盖，确认）。 |
| **E. 性能可行性** | PASS | 5min TTL + 主动失效组合保证 30s 内一致性（AC-03 满足）；趋势图按月聚合 + `points ≤ 60` 上限（5 年 × 12 月）合理；分布 5 行无大数据问题；1000+ 评分用户走"缓存兜底 + 时间窗分桶 + pageSize ≤ 20"三道防线。**P2 提示**：第 1000+ 评分用户的"趋势图"在 1y 范围内仍是 12 个点，5y 范围 60 个点，性能问题主要在 SQL 聚合而非渲染。 |
| **F. 风险与权衡** | PASS | ARCH §7 覆盖 7 类风险（缓存不共享/hook 漏挂/字段不符/索引空间/CDN/lru 版本/雷达图扩展/全站 API baseline）；4 项关键权衡（LRU vs Redis / 4 端点 vs 1 聚合 / 子查询 vs 窗口 / 隐私字段复用）均给出对比表和决策依据，质量高。**唯一遗漏**：未提"前端 `?from=profile` 参数对 SEO/分享的影响"——可作 P2 备注。 |
| **G. 可执行性** | PASS | §8 移交清单分 4 类角色（PM/后端/前端/QA/DevOps），每项 actionable；依赖项清晰（`lru-cache@^10` 唯一新增 npm 包，前端零新增依赖）；无隐含 blocker。**确认点**：8.5 已要求 DevOps 先 DB 索引后 deploy；migration 脚本 `add-rating-history-indexes.js` 需幂等。 |

---

## 4. P0 阻塞项（必须先解决才能进入编码）

**0 项** — 无阻塞。

ARCH §0 已将所有 7 处偏差转化为可操作的处置方案（编码按 ARCH 实际字段名执行），不构成阻塞。PM 同步修订 PRD 是 nice-to-have，不是 must。

---

## 5. P1 强烈建议（编码前最好解决）

1. **PRD §6.1 API 响应结构同步修正字段名**：API-1/2/3 的 response JSON 中 `tasteRating`/`rating`/`coverImageUrl` 等字段名应与实际代码对齐。**理由**：前端实现时若按 PRD 字段名解析会 runtime 报错；越早统一越好。**不构成阻塞的原因**：ARCH §0 的"处置"列已明确说"API 用真实字段名"，但 PRD 文档的示例 JSON 不改会误导后续维护者。
2. **Q-02 决策确认（高/低分 TOP 5 按 `rating` 还是按单维度？）**：ARCH §8.1 已建议按 `rating`（实现简单、用户直觉），但 PRD §10 Q-02 仍标"待定"。**建议 PM 在评审会上口头/邮件确认**，编码时按 `rating` 走。
3. **`DimensionRadar` 扩展方案确认**：ARCH §7 风险表第 7 条提到需扩展该组件的 hover tooltip。**建议在 PR 描述中明确"本次会同步改 DimensionRadar"，避免 PR 跨组件被卡 review**。

---

## 6. P2 提示（编码中注意）

1. **cache 进程内 LRU 在 PM2 cluster 模式下不共享**：当前若用 cluster 启动多 worker，每个 worker 独立 cache——命中率会下降、失效 hook 也会漏。**建议 DevOps 确认启动方式**（`fork` 模式 vs `cluster` 模式），单实例下用 `fork`。
2. **趋势图 `points` 中 `count < 3` 的 period 返回但前端决定是否展示**（ARCH §6.1 API-1 注意）：前端在数据点 < 3 时给"样本不足"小角标，避免画锯齿。
3. **删除评论时同步失效 `site:dimAverages` 缓存**：ARCH §1.7.3 已写，但"评论总数变化"判定未实现——简单方案是"任何 delete 都失效"，成本可接受。
4. **前端 `?from=profile` 参数对路由分析有侵入**：建议用 `?ref=profile` 风格或 React Router 的 `state`，避免污染 URL 历史。**ARCH 提示而非强制**。
5. **大数据量 seed 测试**：QA §8.4 提到 5000 评分用户，但当前生产最大用户多少？**建议在编码前先查 DB 确认**（避免 seed 与实际差距过大）。
6. **TypeScript 接口与 ARCH §2.3 描述的 5 个 API 方法一一对应**：建议在 `src/api.ts` 中抽 `types/rating-history.ts` 单文件，避免 `api.ts` 膨胀。

---

## 7. 编码阶段决策

**YES-AFTER-MINOR-FIX** — 可以进入编码阶段。

PM 同步修订 PRD 字段名（P1-1）和 Q-02 决策（P1-2）可在编码首日并行进行，不阻塞后端/前端开工。后端可先按 ARCH §8.2 清单启动 `lru-cache` 安装 + `utils/cache.js` 框架，前端可先按 §2.3 启动 9 个组件的脚手架。

**期望状态机推进**：
1. NOW: 启动 coding (8.x 移交清单启动)
2. +1d: PM 修订 PRD 字段名（merge 到 main 后通知编码者）
3. ~7d: 进入 code review 门
4. ~9d: 进入 QA + 安全门
5. ~10d: 灰度上线

---

## 8. 评审签字

| 项 | 状态 |
|---|---|
| A. PRD 完整性 | ✅ PASS |
| B. PRD↔代码一致性 | ⚠️ NEEDS-MINOR-REVISION（不阻塞） |
| C. ARCH 技术决策 | ✅ PASS |
| D. 数据一致性边界 | ✅ PASS |
| E. 性能可行性 | ✅ PASS |
| F. 风险与权衡 | ✅ PASS |
| G. 可执行性 | ✅ PASS |
| P0 阻塞项 | 0 |
| 总体评级 | **PASS-WITH-COMMENTS** |
| 进入编码 | **YES-AFTER-MINOR-FIX** |

---

*评审结束*
