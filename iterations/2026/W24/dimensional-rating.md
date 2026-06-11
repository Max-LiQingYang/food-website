# 迭代 #130 — 食谱评分维度细化

**日期**: 2026-06-11
**状态**: ✅ 已上线
**提交链**: 3a8bce2 → 8b09187 → 6f47781 → 559b2da

## 目标
将评论的单一 rating（1-5）拆分为 4 维评分：taste 口味 / difficulty 难度 / presentation 卖相 / value 性价比。详情页用 Recharts 雷达图展示 4 维平均分。

## 实施流程

| Step | 角色 | 模型 | 产出 | 状态 |
|---|---|---|---|---|
| 1. PRD | coordinator | deepseek-v4-pro | PRD-dimensional-rating.md (456 行) | ✅ |
| 2. Plan Review | coordinator | deepseek-v4-pro | PRD-review-dimensional-rating.md (3 P0) | ✅ |
| 3. UI Design | ui-designer | doubao-seed-2.0-pro | UI-dimensional-rating.md (13.6KB) | ✅ |
| 4. Fullstack | coordinator | deepseek-v4-pro | 5 created + 6 modified, 1980+ 行 | ✅ |
| 5. Code Review | coordinator | deepseek-v4-pro | REVIEW-dimensional-rating.md (1 P0) | ✅ |
| 6. Test + Security | data-validator | minimax-M3 | TEST-dimensional-rating.md (22/22 pass) | ✅ |
| 7. Deploy | 管家 | — | DEPLOY-dimensional-rating.md | ✅ |

## 核心变更

### 后端
- `models/comment.js` — 新增 4 字段 taste/difficulty/presentation/value（INT NULL）
- `routes/comments.js` — `DIMENSION_FIELDS` 常量、`validateDimensionRating` 校验、`stats` 端点 `dimensionAverages` 计算
- `scripts/migrate-dimensional-rating.js` — 幂等迁移（检查 `taste` 列存在则跳过）
- `package.json` — 新增 `migrate:dimensional-rating` npm script

### 前端
- `components/DimensionRadar.tsx` — 新建，Recharts 雷达图 + 空值守卫 + 暗色模式监测（双 selector）
- `components/CommentSection.tsx` — 折叠面板"展开详细评分"+ 评论卡片 4 维迷你徽章 + 统计区雷达图
- `components/CommentSection.css` — ~500 行：4 维配色（红/橙/紫/绿）、雷达图容器、暗色模式、响应式
- `api.ts` — `Comment`/`CommentStats` 接口扩展 + `DimensionAverage` 类型

### 测试
- `backend/tests/dimensional_rating.test.js` — 22 用例：POST 校验 / NULL 兼容 / 1-5 边界 / 越界拒绝 / 字符串拒绝 / 布尔拒绝 / 聚合空表 / 聚合单维 / 幂等检查
- 基线 337/339 → 完整 359/339 (测试文件 22 新增)

## 4 维配色系统

| 维度 | 颜色 | Hex | 语义 |
|---|---|---|---|
| 口味 (taste) | 🔴 红 | #ef4444 | 刺激、味道 |
| 难度 (difficulty) | 🟠 橙 | #f97316 | 警示、需注意 |
| 卖相 (presentation) | 🟣 紫 | #8b5cf6 | 美观、艺术 |
| 性价比 (value) | 🟢 绿 | #22c55e | 实惠、推荐 |

## 关键决策

1. **NULL 兼容**：老评论 4 维全 NULL，新评论可选（但至少需有 rating）— 不强制回填
2. **API 向后兼容**：扩展 `dimensionAverages` 字段，旧 `averageRating` 保留
3. **手动管 schema**：项目规范，ALTER TABLE 幂等脚本而非 Sequelize sync
4. **MariaDB `AFTER rating`**：保持列顺序符合逻辑（rating → taste/difficulty/presentation/value）
5. **暗色模式双 selector**：同时监测 `body.classList='dark'` 和 `documentElement[data-theme='dark']`，避免遗漏

## 部署验证

```bash
curl http://39.103.68.205/api/recipes/1/comments/stats
# {"code":0,"message":"ok","data":{...,"dimensionAverages":{...}}}
```

✅ `dimensionAverages` 字段已上线，4 维结构到位。

## 已知 P1（下一迭代）

- `/stats` 端点全量拉评论到 JS 聚合而非 SQL AVG() — 性能优化
- Recharts 未 lazy load — 首屏体积
- CSS 变量两套命名体系（`body.dark` + `[data-theme='dark']`）— 统一收敛

## 产出清单

- `PRD-dimensional-rating.md` (12.5KB)
- `PRD-review-dimensional-rating.md`
- `UI-dimensional-rating.md` (13.6KB)
- `REVIEW-dimensional-rating.md`
- `TEST-dimensional-rating.md`
- `DEPLOY-dimensional-rating.md`
- `backend/tests/dimensional_rating.test.js` (22 tests)
- `backend/scripts/migrate-dimensional-rating.js`
- `frontend/src/components/DimensionRadar.tsx`

## 用户可见效果

访问 http://39.103.68.205/recipes/1（或任意食谱详情页）：
- 评分统计区出现雷达图（4 边形，每个顶点代表一个维度）
- 评论提交表单有"展开详细评分"折叠面板（不展开就只填总体 rating）
- 已评论列表的评论卡片右下角显示 4 维迷你徽章
- 暗色模式下雷达图自适应配色

**无评论的食谱**：雷达图显示 0 值多边形（不会显示 null 错误），徽章为"暂无详细评分"占位。
