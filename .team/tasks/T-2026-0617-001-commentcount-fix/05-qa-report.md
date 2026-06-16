# QA Report — T-2026-0617-001 (r1)

> **Date**: 2026-06-17
> **Tester**: tester
> **Commit**: be685d6
> **Deploy status**: pending (runtime AC not verified)

## 1. AC 验证

| AC | Status | Evidence |
|---|---|---|
| AC-1.1 | PENDING_DEPLOY | 代码实现位于 `backend/routes/recipes.js:2144-2163`。Safety net 逻辑：当 `data.commentCount === 0` 时，通过 `Comment.count` 兜底查询实际数量并回填。公网 `GET /api/recipes/e6c16baf` 返回 404（食谱不存在），runtime 无法验证。 |
| AC-1.2 | PASS (static) | 代码实现位于 `frontend/src/pages/RecipeDetailPage.tsx:840-844`。条件渲染 `{recipe.commentCount != null && recipe.commentCount > 0 && (...)}` 正确显示 "💬 {count} 条评论" tag。 |
| AC-1.3 | PASS (static) | 代码实现位于 `frontend/src/pages/RecipeDetailPage.tsx:854-856`。原三元 `recipe.avgRating != null ? ... : null` 已改为 `else` 分支兜底显示 "⭐ 暂无评分"，杜绝了空白/null 字面量。 |
| AC-2.3 | PASS (static) | Increment 调用点：`backend/routes/comments.js:344-345` (`recipe.increment('commentCount', { by: 1 })`)。Decrement 调用点：`backend/routes/comments.js:546-547` (`recipe.decrement('commentCount', { by: 1 })`，带 `recipe.commentCount > 0` 保护)。两端均存在。 |

## 2. 静态验证

- **backend syntax**: ok (`node -c backend/routes/recipes.js` 通过，0 错)
- **TS errors**: 新增 0 个 / 复用 ~305 个 pre-existing (`npx tsc --noEmit` 中 grep `RecipeDetailPage|recipes.js` 的结果全部为 pre-existing，与本次改动无关的未使用变量、类型不匹配等)
- **字段命名一致性**: ok (`frontend/src/api.ts` 中 Recipe interface 字段名为 `commentCount`，与前后端使用一致；无 `commentsCount`/`comment_count` 混用)

## 3. 发现的问题

- **SUGGEST — safety net 未覆盖 `null` 场景**：`backend/routes/recipes.js:2145` 的条件为 `data.commentCount === 0`，若数据库中该字段值为 `null`，safety net 不会触发。建议改为 `data.commentCount == null || data.commentCount === 0` 以覆盖冷启动/历史数据场景。
- **INFO — 公网测试数据缺失**：`e6c16baf` 在服务器返回 404，说明该 recipe 在部署环境不存在。如需 runtime 验证，需确认有效 recipe ID 或先在环境准备测试数据。

## 4. 总结

本次 commit `be685d6` 的代码改动在静态层面全部符合预期：
- 后端 safety net 逻辑语法正确，兜底与异步回填机制完备；
- 前端 UI fallback 与条件标签渲染逻辑正确；
- 增/删评论的 materialized 字段同步调用点已存在；
- 无新增编译错误，字段命名一致。

**建议**：当前 deploy 尚未完成且测试数据缺失，runtime AC 无法验证。待部署完成后补充 runtime 验证即可推进至下一阶段。如仅评估代码质量，可视为 **phase=test → phase=deploy（main 推进）**。
