# 巡检修复任务 T-2026-0613-001

## 任务概述

**任务类型**：dev-pipeline 立项  
**优先级**：P0  🔴  
**触发来源**：2026-06-13 每日巡检发现 3 项严重问题  
**验收结论**：不通过，必须先修复后重新验收  

## 背景

2026-06-13 每日巡检发现网站 http://39.103.68.205/ 存在 **1 项真实严重问题** + 1 项待 UI 验证 + 1 项误报：

| # | 现象 | 实际状态 | 处理 |
|---|------|---------|------|
| 1 | `POST /api/auth/login` 持续 429 | ⚠️ **误报** — 2026-06-13 04:23 GMT+8 实测 5 次连测全 HTTP 200，token 正常签发，认证链路正常 | 关闭，无需修复 |
| 2 | `GET /api/users/me` 404 | 🔴 **真实** — 后端 grep 确认 `users/me` 路由完全未注册，token 鉴权下应返回当前用户信息 | **必修** |
| 3 | `/challenges` 页面"暂无挑战活动" | ⏳ **待 UI 验证** — API `GET /api/challenges` 实测返回 5 条数据；前端是 React SPA（HTML 仅含 `<div id="root">`），需 tester 端到端截图 + DOM 检查确认是否真不渲染 | **需验证** |

详细巡检报告与验收报告见：
- `/Users/max_yang/.qclaw/workspace/reports/巡检报告-2026-06-13.md`
- `/Users/max_yang/.qclaw/workspace/reports/验收报告-2026-06-13.md`

## 修复范围

### 后端
- [ ] 补齐 `/api/users/me` 接口：需 token 鉴权，返回当前登录用户信息（id/username/email/role/avatar 等）— grep 确认当前 backend 完全没有 `users/me` 路由注册
- [ ] 注册到后端路由入口（app.js / index.js，按现有项目约定）
- [ ] 添加 jest 测试覆盖：未带 token 401、带有效 token 200、带过期 token 401

### 前端
- [ ] tester 用 Playwright 访问 `/challenges` 端到端验证：等待 React hydrate 完成后查看实际 DOM 是否渲染挑战卡；若仍显示"暂无挑战活动"，定位是状态过滤/数据键名不匹配还是 API 调用失败，并修复

## 验收标准

- [ ] `GET /api/users/me` 带有效 token → HTTP 200 + 返回用户 JSON
- [ ] `GET /api/users/me` 不带 token → HTTP 401
- [ ] `/challenges` 页面（Playwright 截图）能看到挑战赛卡片，含 title/description/theme
- [ ] 后端测试全绿（`npm test -- --runInBand`）
- [ ] 前端构建 0 errors 0 warnings
- [ ] devops 部署后 curl 验证 3 项：① /api/health 200 ② /api/users/me 401 ③ /api/challenges 200

## 执行链

按 QClaw dev-pipeline 标准链路执行：

```
story → design → plan-review → impl → code-review → qa ∥ security → deploy → done
```

- 指派 architect 或 fullstack 进行技术方案设计
- 指派 reviewer 进行计划评审
- 指派 fullstack 进行实现
- 指派 reviewer 进行代码审查
- 指派 tester 进行 QA 回归测试
- 指派 security 进行安全审查（如限流策略涉及安全）
- 指派 devops 进行部署
- main 负责整体编排和闭环确认

## 验收标准

- [ ] `POST /api/auth/login` 使用测试账号 `test@test.com` / `123456` 返回 200 并返回有效 token
- [ ] 登录后 `GET /api/users/me` 返回 200 和当前用户信息
- [ ] `/challenges` 页面正确渲染 API 返回的挑战赛数据，不再显示“暂无挑战活动”
- [ ] 登录态相关接口（`/api/achievements`、收藏、评论等）可正常验证
- [ ] tester 重新截图确认首页、详情页、挑战赛、用户中心页面正常
- [ ] 后端测试全绿（`npm test -- --runInBand`）
- [ ] 前端构建 0 errors 0 warnings

## 注意事项

- 禁止绕过 main 直接派给 fullstack/devops
- 限流修复需考虑生产环境安全性，避免过度放宽导致暴力破解风险
- 部署时参考 #138 教训：注意 compose service 名 vs container_name、baked-in image 的 chown、macOS xattr 清理
- 修复完成后更新 iteration-tracker.md 和 iteration-lessons.md
