# 美食食谱网站 — 项目规范

> 本文件是项目的活文档，所有协作者（包括 AI Agent）必须遵守。
> 发现问题立刻更新，每 3 个月审查一次，删除过时内容。

## 项目概览

- **部署地址**: http://39.103.68.205/
- **GitHub**: git@github.com:Max-LiQingYang/food-website.git
- **本地路径**: `~/Projects/food-website/`
- **服务器路径**: `/root/food-website/`（⚠️ 不是 `/root/apps/food-website/`）

## 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| 前端 | React + React Router + Vite | React 18, Router 6.4 |
| 后端 | Express + Sequelize | Express 4, Sequelize 6 |
| 数据库 | MySQL（生产）/ SQLite（测试） | MariaDB 10.x |
| 认证 | JWT + bcrypt | 7 天过期 |
| 部署 | Docker + GitHub Actions CI/CD | ghcr.io 镜像仓库 |

## 架构

```
系统 Nginx (80)
  ├── /           → frontend 容器 (8081:80) → Nginx SPA
  └── /api/*      → backend 容器 (3000:3001) → Express API
                                      ↓
                              宿主机 MariaDB (172.17.0.1:3306)
```

## 铁律（不可违反）

### 1. 部署闭环铁律
```
git push ≠ 部署完成
```
完整闭环：代码修改 → 格式化检查 → 代码提交 → 构建 → 数据库迁移 → 种子脚本 → 重启容器 → 健康检查验证

### 2. 健康检查铁律
```
健康检查 URL 必须用 http://127.0.0.1/health
不能用 localhost（BusyBox wget 优先解析 IPv6，Nginx 仅监听 IPv4）
```

### 3. 项目位置铁律
```
所有项目代码在 ~/Projects/ 下
不在任何 app 的 workspace 中
```

### 4. 代码修改后格式化铁律
```
修改代码后必须运行格式化检查（替代 PostToolUse Hook）：
- 前端: cd frontend && npm run lint --fix
- 后端: cd backend && npm run lint --fix
- 格式化失败必须修复后才能 git commit
- 避免 CI 因格式问题挂掉
```

## 数据库 Schema

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | STRING | 唯一 |
| email | STRING | 唯一 |
| password | STRING | bcrypt 加密 |
| nickname | STRING | 可空 |
| role | STRING | admin / user（默认 user） |
| createdAt | DATE | 自动 |

### Recipe
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | STRING | 必填 |
| description | TEXT | 可空 |
| category | STRING | chinese/western/dessert/japanese/korean |
| ingredients | JSON | 食材列表 |
| steps | JSON | 步骤列表 |
| servings | INTEGER | 份数 |
| difficulty | STRING | easy/medium/hard |
| image | STRING | 封面图 URL |
| userId | UUID | 外键 → User |
| createdAt/updatedAt | DATE | 自动 |

### Favorite
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID | 外键 → User |
| recipeId | UUID | 外键 → Recipe |
| createdAt | DATE | 自动（paranoid 软删除） |

## API 端点

### 认证
- `POST /api/auth/register` — 注册（支持 nickname）
- `POST /api/auth/login` — 登录（自动检测 @ = 邮箱登录）
- `GET /api/auth/me` — 获取当前用户（需认证）

### 食谱
- `GET /api/recipes` — 列表（?page=1&pageSize=12&category=xxx）
- `GET /api/recipes/search?q=` — 搜索
- `GET /api/recipes/:id` — 详情
- `POST /api/recipes` — 创建（需认证）
- `PUT /api/recipes/:id` — 编辑（需认证+所有者）
- `DELETE /api/recipes/:id` — 删除（需认证+所有者）

### 收藏
- `GET /api/favorites` — 收藏列表（需认证）
- `GET /api/favorites/:recipeId/status` — 收藏状态
- `POST /api/favorites` — 添加收藏
- `DELETE /api/favorites/:recipeId` — 取消收藏

## AI 模型配置

- **Provider**: 火山引擎 Ark
- **Base URL**: `https://ark.cn-beijing.volces.com/api/coding/v3`
- **API Key**: `c5163514-30fb-45b5-8fff-0bf0e76e11c4`
- **模型**: `deepseek-v3.2`
- **环境变量**: `AI_API_BASE_URL` / `AI_API_KEY` / `AI_MODEL`

## CI/CD 流程

1. **代码修改后先格式化**: `npm run lint --fix`（前端和后端都要跑）
2. push 到 main/develop 分支触发
3. Lint → Test → Build Docker Image → Push to ghcr.io
4. SSH 到服务器：`git pull` → `docker pull` → `docker-compose up -d`
5. 健康检查验证

## 已知陷阱

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 健康检查失败 | BusyBox wget IPv6 优先 | 用 `127.0.0.1` 替代 `localhost` |
| BrowserRouter 与 RouterProvider 冲突 | React Router 6.4 不兼容 | 只用 `createBrowserRouter` + `RouterProvider` |
| 前端 502 | 容器未启动或镜像未更新 | 检查 `docker compose ps` 和镜像时间 |
| 服务器路径错误 | deploy.yml 用 `/root/apps/` | 实际路径是 `/root/food-website/` |

## 迭代方向

当前按 A → B → C 轮换：
- **A: UI/UX** — 配色、动画、骨架屏、响应式
- **B: 功能** — 社区、AI、用户系统、内容增强
- **C: 质量** — 种子数据、性能、测试、安全

---

*最后更新: 2026-05-22*
