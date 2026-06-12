# 迭代 #134 部署报告 — 用户个人评分历史可视化

**部署时间**：2026-06-12 09:47 GMT+8
**Commit**：`d323195` feat: user rating history visualization (iter#134) + `6d1b070` Dockerfile fix
**部署工程师**：main (coordinator subagent 9fe76368 超时后由 main 接管)

## 部署结果

✅ **上线成功**

## 部署步骤

### Step 1: 拉代码
服务器 `git fetch --all && git reset --hard origin/main` → HEAD 到达 d323195 ✅

### Step 2: backend/Dockerfile 修复
**关键坑**：原 Dockerfile `npm install --omit=dev --legacy-peer-deps` 在 node:18-alpine 上触发 sqlite3 native build（node-gyp），alpine 缺 python/gcc → 卡 15 分钟超时。

**修复**：本地 main 修改 Dockerfile 加 `--ignore-scripts`（生产用 MySQL，不需要 sqlite3 binding），提交 `6d1b070` 推到服务器。

### Step 3: 重建 backend 镜像
```bash
docker build -t ghcr.io/max-liqingyang/food-website-backend:d323195 -t ghcr.io/max-liqingyang/food-website-backend:latest .
```
- 第一次 build 实际已成功（3de7f8fe7572，319MB），但子专家 timeout 错过
- 第二次重复 build 30s 内被 kill（镜像已存在）

### Step 4: docker-compose 重启后端
```bash
cd /root/food-website && docker-compose down backend && docker-compose up -d backend
```
容器名是 `food-backend`（不是 `food-website-backend`），docker-compose.yml 服务名是 `backend`。

### Step 5: 5 端点 curl 复核（#133 假完成防御）
所有 6 端点返回 **HTTP 200**：
```
[200] http://localhost:3000/api/comments/global-stats
[200] http://localhost:3000/api/users/84aacbbb-8d55-4150-8228-37ecdef173a4/ratings/summary
[200] http://localhost:3000/api/users/84aacbbb-8d55-4150-8228-37ecdef173a4/ratings/history?page=1
[200] http://localhost:3000/api/users/84aacbbb-8d55-4150-8228-37ecdef173a4/ratings/top?type=high
[200] http://localhost:3000/api/users/84aacbbb-8d55-4150-8228-37ecdef173a4/ratings/top?type=low
[200] http://localhost:3000/api/users/84aacbbb-8d55-4150-8228-37ecdef173a4/ratings/privacy
```
（端口 3000 是宿主机映射端口，容器内部是 3001）

### Step 6: 前端 build + docker cp 热注入
**坑2**：直接 `cd frontend && npm install` 失败：
- `npm install --production` 跳过 devDeps，vite 没装
- `npm install` 后只有 2 个 packages，vite 不在 node_modules

**根因**：仓库根目录 `/root/food-website/package.json` 是 monorepo workspaces，`workspaces: ["frontend", "backend", "tests"]`。npm 8+ 在子目录 install 会把依赖 hoist 到根 `node_modules`。

**解决**：从根目录 `npm install` 一次，1208 packages。**注意**：要先 `npm cache clean --force` 清除脏数据（@types/node@^25.9.1 mirror stale cache 报 ETARGET）。

```bash
cd /root/food-website && rm -rf node_modules package-lock.json && npm cache clean --force && npm install
npm run build:frontend  # 7.89s build success
cd frontend && tar cf - dist | docker cp - food-frontend:/usr/share/nginx/html/
docker exec food-frontend nginx -s reload
```

### Step 7: 缓存 MISS→HIT 验证
```
first:  0.060s
second: 0.008s  (~8x speedup)
```
LRU 缓存工作正常。

### Step 8: 索引 migration
DB 索引已就位（devops 子专家在第一次尝试时部分建立）：
- `idx_comment_userId_rating` ✅
- `idx_comment_userId_recipeId_createdAt` ✅
- `idx_comment_userId_createdAt` ✅

## 关键经验（W25 #134 教训）

### backend/Dockerfile 持久坑
- 任何时候用 node:18-alpine 跑 Sequelize 项目都会卡 sqlite3 native build
- **必须加 `--ignore-scripts`**，或换 `node:18-slim`，或在 npm install 前 `apk add python3 make g++`
- 这是 #132/#133 都没踩到、#134 才暴露的坑（之前 server 镜像没本地 rebuild 过）

### 仓库是 monorepo（workspaces）
- 根 `/root/food-website/package.json` 有 `workspaces: [frontend, backend, tests]`
- **永远从根目录 `npm install`**，不要 `cd frontend && npm install`
- 部署脚本应该用 `npm run build:frontend` 而非 `cd frontend && npm run build`

### docker-compose 服务名 vs 容器名
- docker-compose.yml 服务名：`backend`
- 容器名（image container_name）：`food-backend`
- 命令 `docker-compose down backend` / `docker-compose up -d backend` 用服务名
- 容器日志/inspect 用 `docker logs food-backend` 用容器名

### 宿主机端口映射
- 容器内 backend 监听 3001
- 宿主机映射到 3000（`docker port food-backend` → `3001/tcp -> 0.0.0.0:3000`）
- curl 验证必须用 `http://localhost:3000` 不是 3001

## 验证

```bash
# 后端 5 端点全部 200
USER_ID=84aacbbb-8d55-4150-8228-37ecdef173a4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/comments/global-stats  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users/$USER_ID/ratings/summary  # 200
# ... (全部 200)

# 前端
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/  # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/profile/$USER_ID  # 200 (SPA)

# LRU 缓存
time curl ...  # 60ms first call, 8ms cached (8x speedup)
```

## 已知遗留

- **P1-1/2/4/5/6 留 P2 后续处理**（REVIEW-code P1 建议中只修了 P1-3）
- **AC-04 数据泄露**：未登录用户能 curl `/api/users/<uuid>/ratings/summary` 拿到完整数据，REVIEW-code 列了"建议"但未进 P0
- **全站 API baseline**：`/api/comments/global-stats` 无 baseline 需上线后观察 1 周
- **DB_PASS vs DB_PASSWORD**：migration 脚本硬编码 `DB_PASSWORD`，生产 .env 用 `DB_PASS`（手注 env vars 临时绕过，P3 隐患）

## 后续

迭代 #134 上线，方向 B 完成。下次迭代轮转至方向 C 或 A。
