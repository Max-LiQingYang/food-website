# T-2026-0616-002-push-subscribe-fix 终态

**状态**: ✅ done (2026-06-16 02:24 CST)
**实际严重度**: P0（部署漂移）
**总时长**: 1h29m

## 任务

prod Web Push 端到端可用性 — 后端 `pushSubscription` 路由 + 前端 `SettingsPage/PushSubscriptionPrompt` UI 都在 prod 可用。

## 关键发现

巡检报告 404 误报是**三重**误报：
1. 路径错（`/api/push/subscribe` 应是 `/api/push/subscription`）
2. 方法错（GET 探 POST 端点）
3. **没查 frontend bundle**（实际是 prod 部署漂移：28 vs 109 assets）

## 处置流程

| 阶段 | 执行者 | 关键产物 | 结论 |
|------|--------|---------|------|
| story | product | 00-story.md (7 ACs) | 接受 |
| impl | fullstack | 03-impl.diff (空 diff) | not-a-bug ⚠️ 误判 |
| code-review | reviewer | 04-code-review-r1.json (8.2/10) | PASS 但 evidence=7 |
| qa | tester | 05-qa-report.md (7/7) | AC5 简化为路由 200 |
| **re-investigate** | **main** | **01-reinvestigation.md** | **发现 P0 部署漂移** |
| deploy | devops | 07-deploy.md (28→109) | 5 关验证 PASS |
| verify | main | 5 关 + 端到端 POST/GET/DELETE | 全 PASS |

## 端到端验证

```
POST   /api/push/subscription           → 201
GET    /api/push/subscription/my        → 200
DELETE /api/push/subscription/:id       → 200
GET    /api/vapid-public-key            → 200
GET    /settings (SPA 路由)             → 200
```

prod frontend dist：28 → 109 assets，与本地完全一致。

## 5 条新教训（已写入 iteration-lessons.md）

1. **API 验通 ≠ 端到端 OK**（bugfix 调查必须前后端同时扫）
2. **prod bundle 静态扫描是 E2E 必要步骤**（tester 必加 docker exec + grep）
3. **巡检误报是三重的**（路径+方法+frontend，下次从 api.ts 提取 endpoint 清单）
4. **假完成三层防御 1（时长）保命**（90s 阈值有效，1m48s 时 main 独立验证）
5. **subagent 越权写黑板状态是反模式**（仅 main 拥有 99-status.yaml 写权限）

## 文件清单

- `00-story.md` 7 ACs
- `01-reinvestigation.md` P0 升级依据
- `03-impl.diff` not-a-bug 误判（留作教训）
- `04-code-review-r1.json` 8.2/10
- `05-qa-report.md` 7/7 + AC5 红旗
- `07-deploy.md` 5 关验证
- `99-status.yaml` 完整轨迹
- `task-summary.md` 本文件
