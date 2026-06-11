# migrate-comment-dimensions.js — 四维评分存量数据回填

## 背景

功能代码（路由 `/api/recipes/:recipeId/comments/stats` 和聚合 `dimensionAverages`）已在迭代 #130/#132 上线，但 `comments` 表里 4 维评分字段（`taste` / `difficulty` / `presentation` / `value`）对于存量评论全部为 `NULL`，导致 DimensionRadar 雷达图显示空数据。

## 作用

为所有存量评论生成 4 维评分数据，基于每条评论的 `rating` (1-5) 综合分作为基准，加确定性伪随机扰动。

## 运行方式

```bash
cd backend
node scripts/migrate-comment-dimensions.js
```

### 先决条件

- 数据库服务可用（MariaDB/MySQL）
- `.env` 文件已配置数据库连接信息
- Node.js >= 18

## 数据策略

| 策略项 | 说明 |
|--------|------|
| 基准 | 各评论的 `rating` 字段 (1-5) |
| taste 偏离 | ±0.3 ~ ±0.5（最小，口味最直接） |
| presentation 偏离 | ±0.4 ~ ±0.7（中等，卖相主观） |
| value 偏离 | ±0.4 ~ ±0.7（中等，性价比主观） |
| difficulty 偏离 | ±0.5 ~ ±1.0（最大，难度主观） |
| 取值 | 扰动后 clamp [1,5] → 四舍五入取整 |
| 填充率 | ≥90% 评论四维全填，10% 部分 NULL |
| 无 rating 评论 | 跳过不处理 |

## 幂等性

脚本使用基于 `comment.id` 的确定性伪随机数生成器（mulberry32）。**重新执行会覆盖原值，但统计输出完全一致**，不会改变扰动结果。

这是故意的设计——当需要重新计算（如调整扰动参数）时，直接改代码重跑即可获得新值。

## 输出示例

```
🔄 migrate-comment-dimensions: 开始回填四维评分数据

📊 共 156 条评论
  #1   rating=4 → taste=4 difficulty=5 presentation=3 value=4
  #2   rating=5 → taste=4 difficulty=5 presentation=5 value=5
  ...

═══════════════════════════════════
📈 迁移统计
═══════════════════════════════════
  评论总数:            156
  有 overall rating:   150
  无 overall rating:   6
  实际更新:            150
  四维全填:            135 (90.0%)
  部分填充:            15 (10.0%)
  填充率:              90.0% ≥ 90%? ✅

  四维平均分:
    口味(taste): 3.45 (count=148)
    难度(difficulty): 3.52 (count=148)
    卖相(presentation): 3.41 (count=148)
    性价比(value): 3.48 (count=148)
  平均分 ∈ [3.0, 4.5]: ✅

✅ 迁移完成！
```

## 离线验证

无需数据库即可验证逻辑正确性：

```bash
cd backend && node scripts/migrate-comment-dimensions.verify.js
```

该脚本使用 SQLite 内存数据库模拟 50 条评论，验证：
- 评分分布合理（1-5 全覆盖）
- 填充率 ≥90%
- 四维平均分 ∈ [3.0, 4.5]
- 所有值 ∈ [1, 5] 且为整数
- 幂等性（重新计算结果一致）

## 文件列表

| 文件 | 作用 |
|------|------|
| `migrate-comment-dimensions.js` | 主迁移脚本（连接真实 DB） |
| `migrate-comment-dimensions.verify.js` | 离线验证脚本（SQLite 内存，不依赖 DB） |
| `migrate-comment-dimensions.README.md` | 本文件 |
