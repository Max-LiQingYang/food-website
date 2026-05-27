# Iteration Lessons — food-website

## Iter #80 — 推荐系统优化

### 决策
| 决策 | 依据 |
|------|------|
| `enhancedRecommendSort` 仅应用于 `/recommend` 端点，非 `seasonalRoute` | seasonal 有独立路由，其 tab 上下文已传达季节信息 |
| 多样性控制：编辑精选不受限 → 其余每类 max 3 | 编辑精选是人工策略，应优先展示 |
| 推荐理由 6 色标签（featured/seasonal/popular/new/match/taste） | 视觉区分度 + 用户直观理解推荐原因 |
| 相似食谱新增五维覆盖度评分（0.3 权重） | 维度覆盖越多 = 相关性更高，补充 Jaccard 纯交并比 |
| 同 category 限制 2 条（相似端点） | 避免同菜系堆叠 |

### 技术要点
- `docker exec -i --user root` 可解决非 root 容器写权限问题
- `/api/recipes/seasonal` 和 `/api/recipes/recommend` 是两个独立路由，seasonal 走 `routes/seasonal.js`
- 前端后打包 `docker cp` 前需 `rm -rf /usr/share/nginx/html/*` 避免旧 chunk 残留