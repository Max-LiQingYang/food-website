# 部署指南

## 两种部署方式

本项目支持 **GitHub Actions 自动部署** 和 **本地脚本手动部署** 两种方式，互为兜底。

---

## 方式一：GitHub Actions CI/CD（推荐）

### 触发条件

- `push` 到 `main` 或 `develop` 分支
- 向 `main` 分支发起 Pull Request

### 流水线流程

```
lint（代码检查）
  → test（单元测试：后端 Jest + 前端 Vitest）
    → build-frontend（构建并推送前端 Docker 镜像到 ghcr.io）
    → build-backend（构建并推送后端 Docker 镜像到 ghcr.io）
      → deploy（SSH 到服务器，拉取镜像并重启）
```

### 必需配置（GitHub Secrets）

在 GitHub 仓库 **Settings → Secrets → Actions** 中添加：

| Secret | 说明 |
|--------|------|
| `SSH_HOST` | 服务器 IP 或域名，如 `39.103.68.205` |
| `SSH_USER` | SSH 用户名，如 `root` |
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥（完整内容，包含 `-----BEGIN OPENSSH PRIVATE KEY-----`） |

> `GITHUB_TOKEN` 由 GitHub 自动生成，**不需要手动配置**，用于 ghcr.io 镜像仓库登录。

### 常见问题

**Q: deploy job 提示 "缺少 Secrets"**

检查 `Settings → Secrets → Actions` 中是否已配置 `SSH_HOST`、`SSH_USER`、`SSH_PRIVATE_KEY`。deploy job 会自动检查这些 secrets 是否存在，缺失时提前失败并给出明确提示。

**Q: 后端测试失败，报错 `SQLITE_BUSY`**

已修复：CI 配置中已添加 `--runInBand` 参数，确保 SQLite in-memory 测试串行执行。

**Q: 前端测试失败，提示不认识 `--run` 参数**

已修复：vitest v2 使用 `vitest run`（不带 `--`），CI 配置已修正。

**Q: docker login 失败，提示未授权**

旧版 workflow 错误地依赖 `GHCR_TOKEN` secret。新版已改用自动提供的 `GITHUB_TOKEN`，无需额外配置。

---

## 方式二：本地部署脚本（兜底）

当 GitHub Actions 因网络、GitHub 服务故障等原因失败时，使用本地脚本直接部署。

### 前提条件

1. 本地已配置 SSH 免密登录到服务器
2. 本地 `node` >= 18，前端依赖已安装（`cd frontend && npm ci`）

### 配置 SSH 免密登录（首次）

```bash
# 将本地公钥复制到服务器
ssh-copy-id root@39.103.68.205

# 验证
ssh root@39.103.68.205 "echo OK"
```

### 使用方式

```bash
# 进入项目目录
cd ~/Projects/food-website

# 全量部署（最可靠，约 2-5 分钟）
./deploy.sh full

# 仅后端热更新（约 30 秒，适合后端小改动）
./deploy.sh backend

# 仅前端热更新（约 1 分钟，适合前端 UI 改动）
./deploy.sh frontend

# 检查服务器状态（不部署）
./deploy.sh check
```

### 环境变量覆盖

```bash
# 部署到另一台服务器
SERVER_HOST=192.168.1.100 SERVER_USER=admin ./deploy.sh full

# 使用自定义项目路径
PROJECT_DIR=/opt/food-website ./deploy.sh backend
```

---

## 部署模式对比

| 模式 | 适用场景 | 耗时 | 可靠性 |
|------|----------|------|--------|
| GitHub Actions | 日常开发，代码已 push | ~5-8 分钟 | 依赖 GitHub 和 ghcr.io 网络 |
| `deploy.sh full` | CI 失败，需要兜底 | ~2-5 分钟 | 高（直接 SSH + docker） |
| `deploy.sh backend` | 后端路由/模型小改动 | ~30 秒 | 高（docker cp + restart） |
| `deploy.sh frontend` | 前端 UI/样式改动 | ~1 分钟 | 高（build + docker cp + reload） |

---

## 服务器环境要求

- Docker + Docker Compose v2
- Git
- 宿主机 MariaDB（端口 3306）
- 端口开放：80（前端）、3000（后端 API）

---

## 回滚

如果部署后发现问题，快速回滚到上一版本：

```bash
# 在服务器上执行
ssh root@39.103.68.205
cd /root/food-website
git log --oneline -5          # 查看最近 commit
git reset --hard HEAD~1       # 回滚到上一个 commit
docker compose up -d --force-recreate
```

---

## 前端 Nginx Gzip 压缩

前端 nginx 已启用 gzip 静态资源压缩（HTML/JS/CSS/SVG/WOFF2/WASM 等文本类资源），配置见 `frontend/nginx.conf`。Dockerfile 构建阶段会执行 `RUN nginx -t` 做配置语法校验。
