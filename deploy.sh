#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 美食食谱网站 — 本地一键部署脚本
#
# 用途：GitHub Actions CI/CD 失败时的兜底部署方案
#        或快速热更新（不重新构建镜像）
#
# 运行方式：
#   ./deploy.sh full          # 全量部署：git pull + docker compose 重建
#   ./deploy.sh backend       # 仅后端热更新（docker cp + restart）
#   ./deploy.sh frontend      # 仅前端热更新（build + docker cp + reload）
#   ./deploy.sh check         # 仅检查服务器状态和版本差异
#
# 环境变量（可覆盖默认值）：
#   SERVER_HOST    服务器地址（默认 39.103.68.205）
#   SERVER_USER    SSH 用户名（默认 root）
#   PROJECT_DIR    服务器项目路径（默认 /root/food-website）
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ── 配置 ─────────────────────────────────────────────────────
SERVER_HOST="${SERVER_HOST:-39.103.68.205}"
SERVER_USER="${SERVER_USER:-root}"
PROJECT_DIR="${PROJECT_DIR:-/root/food-website}"
SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── 工具函数 ─────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

die() {
  log_error "$*"
  exit 1
}

# 检查 SSH 连接
check_ssh() {
  log_info "检查 SSH 连接: ${SSH_TARGET} ..."
  if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new "${SSH_TARGET}" "echo 'SSH OK'" &>/dev/null; then
    die "无法连接到 ${SSH_TARGET}，请检查：\n  1. SSH 密钥是否已添加到服务器 ~/.ssh/authorized_keys\n  2. 服务器是否运行中\n  3. 网络是否可达"
  fi
  log_ok "SSH 连接正常"
}

# 检查服务器上的项目目录和容器状态
check_server() {
  log_info "检查服务器环境 ..."

  local result
  result=$(ssh "${SSH_TARGET}" "
    set -e
    # 检查项目目录
    if [ ! -d '${PROJECT_DIR}' ]; then
      echo 'ERR: PROJECT_DIR_NOT_FOUND'
      exit 1
    fi

    # 检查 docker 和 docker compose
    if ! command -v docker &>/dev/null; then
      echo 'ERR: DOCKER_NOT_FOUND'
      exit 1
    fi

    # 检查容器状态
    echo '--- CONTAINER STATUS ---'
    docker ps --format '{{.Names}}: {{.Status}}' | grep -E 'food-(frontend|backend)' || echo 'Containers not running'

    # 检查 git 版本
    echo '--- GIT STATUS ---'
    cd '${PROJECT_DIR}' && git log --oneline -1
    echo 'Remote: ' \$(git rev-parse origin/main 2>/dev/null || echo 'N/A')

    # 检查磁盘空间
    echo '--- DISK USAGE ---'
    df -h / | tail -1 | awk '{print \$5 " used on /"}'
  " 2>/dev/null)

  echo "$result"
}

# 比较本地和远程 git 版本
check_version_diff() {
  log_info "比较本地与远程版本 ..."

  local_local_sha=$(git rev-parse HEAD)
  local_remote_sha=$(ssh "${SSH_TARGET}" "cd ${PROJECT_DIR} && git rev-parse HEAD" 2>/dev/null || echo "UNKNOWN")

  log_info "本地 HEAD: ${local_local_sha:0:7}"
  log_info "远程 HEAD: ${local_remote_sha:0:7}"

  if [ "$local_local_sha" = "$remote_sha" ]; then
    log_ok "本地与远程版本一致，无需更新"
    return 0
  fi

  log_warn "版本不一致，远程落后 $(git rev-list --count "${remote_sha}..HEAD" 2>/dev/null || echo '?') 个 commit"
  return 1
}

# ── 部署模式：全量部署 ──────────────────────────────────────
deploy_full() {
  log_info "===== 全量部署 ====="
  check_ssh

  log_info "推送代码到 GitHub ..."
  git push origin main || log_warn "git push 失败（可能已是最新）"

  log_info "服务器端执行：git pull + docker compose 重建 ..."
  ssh "${SSH_TARGET}" "
    set -e
    cd '${PROJECT_DIR}'

    echo '[SERVER] git pull ...'
    git reset --hard HEAD
    git pull origin main

    echo '[SERVER] 拉取最新镜像 ...'
    docker compose pull

    echo '[SERVER] 重建并启动容器 ...'
    docker compose up -d --force-recreate --remove-orphans

    echo '[SERVER] 等待服务启动 ...'
    sleep 15

    echo '[SERVER] 健康检查 ...'
    curl -sf http://127.0.0.1:3000/health && echo 'Backend OK' || { echo 'Backend FAIL'; exit 1; }
    curl -sf http://127.0.0.1:8081/health && echo 'Frontend OK' || { echo 'Frontend FAIL'; exit 1; }

    echo '[SERVER] 清理旧镜像 ...'
    docker image prune -f

    echo '[SERVER] 当前运行容器：'
    docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'food-(frontend|backend)'
  "

  log_ok "全量部署完成 🎉"
  log_info "访问地址：http://${SERVER_HOST}/"
}

# ── 部署模式：仅后端热更新 ──────────────────────────────────
deploy_backend() {
  log_info "===== 后端热更新 ====="
  check_ssh

  log_info "本地构建验证 ..."
  # 可以在这里加本地 lint/test，但热更新通常跳过以节省时间

  log_info "复制后端代码到容器并重启 ..."
  ssh "${SSH_TARGET}" "
    set -e
    cd '${PROJECT_DIR}'

    echo '[SERVER] git pull ...'
    git reset --hard HEAD
    git pull origin main

    echo '[SERVER] 复制 routes 到容器 ...'
    # 只复制变更频繁的文件，避免全量重建
    docker cp backend/routes/ food-backend:/app/
    docker cp backend/models/ food-backend:/app/
    docker cp backend/middleware/ food-backend:/app/
    docker cp backend/utils/ food-backend:/app/

    echo '[SERVER] 重启后端容器 ...'
    docker restart food-backend

    echo '[SERVER] 等待启动 ...'
    sleep 10

    echo '[SERVER] 健康检查 ...'
    curl -sf http://127.0.0.1:3000/health && echo 'Backend OK' || { echo 'Backend FAIL'; exit 1; }

    echo '[SERVER] 当前状态：'
    docker ps --format 'table {{.Names}}\t{{.Status}}' | grep food-backend
  "

  log_ok "后端热更新完成 🎉"
}

# ── 部署模式：仅前端热更新 ──────────────────────────────────
deploy_frontend() {
  log_info "===== 前端热更新 ====="
  check_ssh

  log_info "本地构建前端 ..."
  cd frontend && npm run build
  cd ..

  log_info "复制构建产物到服务器容器 ..."
  ssh "${SSH_TARGET}" "
    set -e
    cd '${PROJECT_DIR}'

    echo '[SERVER] git pull ...'
    git reset --hard HEAD
    git pull origin main
  "

  # 将本地 dist 复制到服务器，再 docker cp 到容器
  log_info "上传 dist 到服务器 ..."
  scp -r frontend/dist "${SSH_TARGET}:${PROJECT_DIR}/frontend/"

  ssh "${SSH_TARGET}" "
    set -e
    cd '${PROJECT_DIR}'

    echo '[SERVER] 复制到容器 ...'
    docker cp frontend/dist/. food-frontend:/usr/share/nginx/html/

    echo '[SERVER] 清理 Apple Double 文件 ...'
    docker exec food-frontend rm -f /usr/share/nginx/html/assets/._* 2>/dev/null || true

    echo '[SERVER] nginx reload ...'
    docker exec food-frontend nginx -s reload

    echo '[SERVER] 健康检查 ...'
    curl -sf http://127.0.0.1:8081/health && echo 'Frontend OK' || { echo 'Frontend FAIL'; exit 1; }

    echo '[SERVER] 当前状态：'
    docker ps --format 'table {{.Names}}\t{{.Status}}' | grep food-frontend
  "

  log_ok "前端热更新完成 🎉"
  log_info "访问地址：http://${SERVER_HOST}/"
}

# ── 主入口 ───────────────────────────────────────────────────
main() {
  local mode="${1:-help}"

  case "$mode" in
    full|all)
      deploy_full
      ;;
    backend|be)
      deploy_backend
      ;;
    frontend|fe)
      deploy_frontend
      ;;
    check|status)
      check_ssh
      check_server
      check_version_diff || true
      ;;
    help|--help|-h|*)
      cat <<'EOF'
美食食谱网站 — 本地部署脚本

用法：./deploy.sh <模式>

  full        全量部署：git push + 服务器 git pull + docker compose 重建
              （最可靠，但耗时较长，约 2-5 分钟）

  backend     仅后端热更新：复制后端代码到容器 + 重启
              （快，约 30 秒，适合后端小改动）

  frontend    仅前端热更新：本地 build + 复制到容器 + nginx reload
              （快，约 1 分钟，适合前端 UI 改动）

  check       检查服务器状态和版本差异（不部署）

环境变量：
  SERVER_HOST   服务器地址（默认 39.103.68.205）
  SERVER_USER   SSH 用户名（默认 root）
  PROJECT_DIR   服务器项目路径（默认 /root/food-website）

示例：
  ./deploy.sh full
  SERVER_HOST=192.168.1.100 ./deploy.sh backend
  ./deploy.sh check

EOF
      exit 0
      ;;
  esac
}

main "$@"
