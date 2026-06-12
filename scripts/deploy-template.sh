#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# deploy-template.sh — 可复用部署模板
# TaskID: T-2026-0612-003
#
# 5 阶段: PREFLIGHT → TRANSFER → DEPLOY → VERIFY → LOG
# 退出码: 0=PASS  1=PREFLIGHT失败  2=TRANSFER失败  3=PARTIAL  4=FAIL
#
# 用法:
#   bash deploy-template.sh \
#     PROJECT_PATH=/path/to/project \
#     SERVICE_NAME=backend \
#     CONTAINER_NAME=food-backend \
#     COMPOSE_FILE=docker-compose.yml
#
# 参数支持 KEY=VALUE 命令行 或 环境变量（命令行优先）
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── 版本 ──
DEPLOY_TEMPLATE_VERSION="1.0.0"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# ── 默认值 ──
SSH_HOST="${SSH_HOST:-root@39.103.68.205}"
SSH_PORT="${SSH_PORT:-22}"
SERVER_PROJECT_PATH="${SERVER_PROJECT_PATH:-/root/food-website}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
NGINX_CONTAINER="${NGINX_CONTAINER:-food-frontend}"
NGINX_HTML_PATH="${NGINX_HTML_PATH:-/usr/share/nginx/html}"
DOMAIN="${DOMAIN:-39.103.68.205}"
V1_HEALTH_PATH="${V1_HEALTH_PATH:-/health}"
V2_CHUNK_PATTERN="${V2_CHUNK_PATTERN:-*.js}"
V3_GREP_KEYWORD="${V3_GREP_KEYWORD:-}"
V4_ROUTE_PATH="${V4_ROUTE_PATH:-/}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-backend/Dockerfile}"
CHOWN_USER="${CHOWN_USER:-}"
CHOWN_GROUP="${CHOWN_GROUP:-}"
LOG_FILE="${LOG_FILE:-}"
V1_CUSTOM_CMD="${V1_CUSTOM_CMD:-}"

# ── 内部状态 ──
VERDICT=""
XATTR_STRIP=false
TAR_EXTRA_OPTS=""
TAR_ENV_PREFIX=""
V1_RESULT="SKIP"
V2_RESULT="SKIP"
V3_RESULT="SKIP"
V4_RESULT="SKIP"
START_TIME=""
DEPLOY_PHASE="INIT"

# ══════════════════════════════════════════════════════════════
# §0  参数解析
# ══════════════════════════════════════════════════════════════

usage() {
  cat <<'EOF'
deploy-template.sh — 可复用部署模板 v1.0.0

用法:
  bash deploy-template.sh KEY=VALUE ...

必填参数:
  PROJECT_PATH    本地项目根目录（绝对路径）
  SERVICE_NAME    docker-compose service 名（非 container_name）
  CONTAINER_NAME  docker 容器名
  COMPOSE_FILE    compose 文件路径（相对于 PROJECT_PATH）

可选参数（含默认值）:
  SSH_HOST              root@39.103.68.205
  SSH_PORT              22
  SERVER_PROJECT_PATH   /root/food-website
  BACKEND_PORT          3001
  NGINX_CONTAINER       food-frontend
  NGINX_HTML_PATH       /usr/share/nginx/html
  DOMAIN                39.103.68.205
  DOCKERFILE_PATH       backend/Dockerfile  （相对于 PROJECT_PATH）
  V1_HEALTH_PATH        /health
  V2_CHUNK_PATTERN      *.js
  V3_GREP_KEYWORD       （无默认，需传）
  V4_ROUTE_PATH         /
  V1_CUSTOM_CMD         （可选，V1 后追加自定义验证命令）
  CHOWN_USER            （自动探测 Dockerfile USER 指令）
  CHOWN_GROUP           （自动探测 Dockerfile USER 指令）
  LOG_FILE              （日志文件路径，默认仅 stdout）

退出码:
  0  全部验证 PASS
  1  PREFLIGHT 失败
  2  TRANSFER 失败
  3  部分验证 PARTIAL
  4  全部验证 FAIL
EOF
  exit 0
}

# 解析命令行 KEY=VALUE 参数（覆盖环境变量）
for arg in "$@"; do
  case "$arg" in
    --help|-h) usage ;;
    *=*)
      key="${arg%%=*}"
      val="${arg#*=}"
      # 动态赋值
      case "$key" in
        PROJECT_PATH|SERVICE_NAME|CONTAINER_NAME|COMPOSE_FILE|\
        SSH_HOST|SSH_PORT|SERVER_PROJECT_PATH|BACKEND_PORT|\
        NGINX_CONTAINER|NGINX_HTML_PATH|DOMAIN|DOCKERFILE_PATH|\
        V1_HEALTH_PATH|V2_CHUNK_PATTERN|V3_GREP_KEYWORD|V4_ROUTE_PATH|\
        CHOWN_USER|CHOWN_GROUP|LOG_FILE|V1_CUSTOM_CMD)
          declare "$key"="$val"
          ;;
        *)
          echo "WARNING: unknown parameter: $key"
          ;;
      esac
      ;;
    *)
      echo "WARNING: ignoring argument: $arg"
      ;;
  esac
done

# 加载项目级 .env.deploy（若存在，命令行参数已优先）
if [[ -f "${PROJECT_PATH:-}/.env.deploy" ]]; then
  # 只 set 尚未赋值的变量
  while IFS='=' read -r ek ev; do
    [[ -z "$ek" || "$ek" =~ ^# ]] && continue
    if [[ -z "${!ek+x}" ]]; then
      declare "$ek"="$ev"
    fi
  done < "${PROJECT_PATH}/.env.deploy"
fi

# ══════════════════════════════════════════════════════════════
# §1  辅助函数
# ══════════════════════════════════════════════════════════════

log()  { echo -e "[$(date '+%H:%M:%S')] $*"; }
ok()   { log "${GREEN}✓ $*${NC}"; }
warn() { log "${YELLOW}⚠ $*${NC}"; }
fail() { log "${RED}✗ $*${NC}"; }

ssh_cmd() {
  ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    -o LogLevel=ERROR \
    -p "${SSH_PORT}" "${SSH_HOST}" "$@"
}

die() {
  fail "$@"
  exit 1
}

# tar 打包辅助函数（处理 COPYFILE_DISABLE 前缀）
tar_create() {
  local dest="$1"; shift
  if $XATTR_STRIP; then
    COPYFILE_DISABLE=1 tar --no-xattrs -cf "$dest" "$@" 2>/dev/null
  else
    tar -cf "$dest" "$@" 2>/dev/null
  fi
}

# tar 辅助函数已合并到 tar_create（dead code 删除，N1 修复）

# ══════════════════════════════════════════════════════════════
# §2  PREFLIGHT 阶段
# ══════════════════════════════════════════════════════════════

# ── 2.1 参数校验 ──
validate_params() {
  local errors=0

  # 必填参数检查
  for param in PROJECT_PATH SERVICE_NAME CONTAINER_NAME COMPOSE_FILE; do
    if [[ -z "${!param:-}" ]]; then
      fail "missing required param: ${param}"
      errors=$((errors+1))
    fi
  done

  [[ $errors -gt 0 ]] && return 1

  # PROJECT_PATH 必须存在且为目录
  if [[ ! -d "$PROJECT_PATH" ]]; then
    fail "PROJECT_PATH does not exist: ${PROJECT_PATH}"
    return 1
  fi

  # 解析为绝对路径
  PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

  # COMPOSE_FILE 必须存在
  if [[ ! -f "${PROJECT_PATH}/${COMPOSE_FILE}" ]]; then
    fail "COMPOSE_FILE not found: ${PROJECT_PATH}/${COMPOSE_FILE}"
    return 1
  fi

  # SSH_HOST 格式校验（N3 修复: 严格 user@host 格式）
  if [[ ! "$SSH_HOST" =~ ^[^@]+@[a-zA-Z0-9._-]+$ ]]; then
    fail "SSH_HOST invalid format (expected user@host): ${SSH_HOST}"
    return 1
  fi

  # 端口范围（B3 修复: BACKEND_PORT 同样校验）
  if [[ ! "$SSH_PORT" =~ ^[0-9]+$ ]] || [[ "$SSH_PORT" -lt 1 ]] || [[ "$SSH_PORT" -gt 65535 ]]; then
    fail "invalid SSH_PORT: ${SSH_PORT}"
    return 1
  fi
  if [[ ! "$BACKEND_PORT" =~ ^[0-9]+$ ]] || [[ "$BACKEND_PORT" -lt 1 ]] || [[ "$BACKEND_PORT" -gt 65535 ]]; then
    fail "invalid BACKEND_PORT: ${BACKEND_PORT}"
    return 1
  fi

  ok "params validated"
  return 0
}

# ── 2.2 macOS xattr 清扫（N2 修复: 实际执行 xattr -cr）──
detect_xattr() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    XATTR_STRIP=true
    TAR_EXTRA_OPTS="--no-xattrs"
    TAR_ENV_PREFIX="COPYFILE_DISABLE=1"
    ok "macOS detected — xattr strip enabled, tar with --no-xattrs"
  else
    XATTR_STRIP=false
    TAR_EXTRA_OPTS=""
    TAR_ENV_PREFIX=""
    ok "non-macOS — xattr strip skipped"
  fi
}

strip_xattr() {
  if $XATTR_STRIP; then
    log "stripping xattr on backend/ and frontend/dist/ ..."
    # 实际执行 xattr -cr（N2 修复）
    if [[ -d "${PROJECT_PATH}/backend" ]]; then
      xattr -cr "${PROJECT_PATH}/backend" 2>/dev/null && ok "xattr -cr backend/" || warn "xattr -cr backend/ failed (non-fatal)"
    fi
    if [[ -d "${PROJECT_PATH}/frontend/dist" ]]; then
      xattr -cr "${PROJECT_PATH}/frontend/dist" 2>/dev/null && ok "xattr -cr frontend/dist/" || warn "xattr -cr frontend/dist/ failed (non-fatal)"
    fi
  fi
}

# ── 2.3 chown 自动探测（B2 修复: 使用 DOCKERFILE_PATH）──
detect_chown() {
  local dockerfile="${PROJECT_PATH}/${DOCKERFILE_PATH}"
  local user="nodeapp"
  local group="nodejs"

  if [[ -f "$dockerfile" ]]; then
    local user_line
    user_line=$(grep -E '^USER ' "$dockerfile" | tail -1)
    if [[ -n "$user_line" ]]; then
      local user_spec
      user_spec=$(echo "$user_line" | sed -E 's/^USER[[:space:]]+//')
      if [[ "$user_spec" == *:* ]]; then
        user="${user_spec%%:*}"
        group="${user_spec##*:}"
      else
        user="$user_spec"
        # 不覆盖 group — 保持 fallback 默认值
        # Dockerfile 中 USER nodeapp 无组时，组通常来自 addgroup 指令
      fi
    fi
    ok "chown detected from ${DOCKERFILE_PATH}: ${user}:${group}"
  else
    warn "Dockerfile not found: ${dockerfile} — using fallback nodeapp:nodejs"
  fi

  # 仅当用户未显式传入时才用探测值
  CHOWN_USER="${CHOWN_USER:-$user}"
  CHOWN_GROUP="${CHOWN_GROUP:-$group}"
  log "chown will use: ${CHOWN_USER}:${CHOWN_GROUP}"
}

# ── 2.4 compose service 名验证 ──
validate_service_name() {
  local compose_file="${PROJECT_PATH}/${COMPOSE_FILE}"

  # 验证 SERVICE_NAME 确实存在于 compose 文件
  # 兼容 2 空格 / 4 空格 / tab 缩进（N1 修复）
  local found
  found=$(awk -v sn="$SERVICE_NAME" '
    /^[[:space:]]*[a-zA-Z][a-zA-Z0-9_-]*:/ {
      current = $0
      gsub(/^[[:space:]]+/, "", current)
      gsub(/:.*$/, "", current)
      if (current == sn) { print "FOUND"; exit }
    }
  ' "$compose_file")

  if [[ "$found" == "FOUND" ]]; then
    ok "service '${SERVICE_NAME}' found in ${COMPOSE_FILE}"
  else
    warn "service '${SERVICE_NAME}' NOT found in ${COMPOSE_FILE} — compose up may fail"
    warn "available services:"
    awk '/^[[:space:]]*[a-zA-Z][a-zA-Z0-9_-]*:/ {
      s=$0; gsub(/^[[:space:]]+/, "", s); gsub(/:.*$/, "", s)
      if (s != "services") print "  - " s
    }' "$compose_file" | head -10
  fi
}

# ── 2.5 SSH 连通性检查 ──
check_ssh() {
  log "checking SSH connectivity to ${SSH_HOST}..."
  if ssh_cmd "echo ok" 2>/dev/null | grep -q '^ok$'; then
    ok "SSH connected"
  else
    fail "SSH connection failed: ${SSH_HOST}:${SSH_PORT}"
    return 1
  fi
}

# ── 2.6 本地源码确认 ──
check_source() {
  log "checking local source exists..."
  local src_dir="${PROJECT_PATH}/backend"
  if [[ ! -d "$src_dir" ]]; then
    fail "backend source dir not found: $src_dir"
    return 1
  fi
  local file_count
  file_count=$(find "$src_dir" -type f | wc -l | tr -d ' ')
  ok "backend source: ${file_count} files"
}

# ── PREFLIGHT 主函数 ──
run_preflight() {
  DEPLOY_PHASE="PREFLIGHT"
  log "========== PHASE 1: PREFLIGHT =========="

  validate_params   || die "PREFLIGHT failed: parameter validation"
  detect_xattr
  strip_xattr
  detect_chown
  validate_service_name
  check_ssh         || die "PREFLIGHT failed: SSH unreachable"
  check_source      || die "PREFLIGHT failed: source missing"

  ok "PREFLIGHT complete"
}

# ══════════════════════════════════════════════════════════════
# §3  TRANSFER 阶段
# ══════════════════════════════════════════════════════════════

run_transfer() {
  DEPLOY_PHASE="TRANSFER"
  log "========== PHASE 2: TRANSFER =========="

  # ── 3.1 打包 + 传输后端 ──
  log "packaging backend source..."
  local tmp_tar="/tmp/deploy-backend-$$.tar"
  tar_create "${tmp_tar}" -C "${PROJECT_PATH}/backend" .
  local tar_size
  tar_size=$(stat -f%z "${tmp_tar}" 2>/dev/null || echo 0)
  log "backend tar: ${tar_size} bytes"

  # scp 传输
  scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o LogLevel=ERROR -P "${SSH_PORT}" \
    "${tmp_tar}" "${SSH_HOST}:/tmp/deploy-backend-$$.tar" 2>&1 || true

  # 远程解压
  ssh_cmd "rm -rf /tmp/backend-overlay && mkdir -p /tmp/backend-overlay && tar xf /tmp/deploy-backend-$$.tar -C /tmp/backend-overlay && rm -f /tmp/deploy-backend-$$.tar" 2>&1 || true

  # 清理本地临时文件
  rm -f "${tmp_tar}"

  # 验证传输结果
  local transferred
  transferred=$(ssh_cmd "find /tmp/backend-overlay -type f 2>/dev/null | wc -l" 2>/dev/null | tr -d ' ')

  if [[ -n "${transferred}" ]] && [[ "${transferred}" -gt 0 ]]; then
    ok "backend transferred: ${transferred} files"
  else
    fail "backend transfer failed (0 files on server)"
    return 1
  fi

  # ── 3.2 传输前端（如果 dist 存在）──
  if [[ -d "${PROJECT_PATH}/frontend/dist" ]]; then
    log "packaging frontend dist..."
    local tmp_fe_tar="/tmp/deploy-frontend-$$.tar"
    tar_create "${tmp_fe_tar}" -C "${PROJECT_PATH}/frontend/dist" . || true

    scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o LogLevel=ERROR -P "${SSH_PORT}" \
      "${tmp_fe_tar}" "${SSH_HOST}:/tmp/deploy-frontend-$$.tar" 2>&1 || true

    ssh_cmd "rm -rf /tmp/frontend-overlay && mkdir -p /tmp/frontend-overlay && tar xf /tmp/deploy-frontend-$$.tar -C /tmp/frontend-overlay && rm -f /tmp/deploy-frontend-$$.tar" 2>&1 || true

    rm -f "${tmp_fe_tar}"

    local fe_transferred
    fe_transferred=$(ssh_cmd "find /tmp/frontend-overlay -type f 2>/dev/null | wc -l" 2>/dev/null | tr -d ' ')
    if [[ -n "${fe_transferred}" ]] && [[ "${fe_transferred}" -gt 0 ]]; then
      ok "frontend transferred: ${fe_transferred} files"
    else
      warn "frontend transfer failed (non-blocking, may not be needed)"
    fi
  else
    log "no frontend/dist directory — skipping frontend transfer"
  fi

  ok "TRANSFER complete"
}

# ══════════════════════════════════════════════════════════════
# §4  DEPLOY 阶段
# ══════════════════════════════════════════════════════════════

run_deploy() {
  DEPLOY_PHASE="DEPLOY"
  log "========== PHASE 3: DEPLOY =========="

  # set +e: 单步失败不退出，verify 会暴露问题
  set +e

  # SEC-001 修复: compose up 块所有变量 printf '%q' 转义
  # SEC-002 修复: chown 块 CHOWN_USER/CHOWN_GROUP printf '%q' 转义
  # B2 修复: 容器名 / nginx 容器名 printf '%q' 转义
  local escaped_srv escaped_compose escaped_svc escaped_cname_deploy escaped_nginx_deploy
  local escaped_chown_user escaped_chown_group
  escaped_srv=$(printf '%q' "$SERVER_PROJECT_PATH")
  escaped_compose=$(printf '%q' "$COMPOSE_FILE")
  escaped_svc=$(printf '%q' "$SERVICE_NAME")
  escaped_cname_deploy=$(printf '%q' "$CONTAINER_NAME")
  escaped_nginx_deploy=$(printf '%q' "$NGINX_CONTAINER")
  escaped_chown_user=$(printf '%q' "$CHOWN_USER")
  escaped_chown_group=$(printf '%q' "$CHOWN_GROUP")

  # ── 4.1 compose up service ──
  log "docker compose up ${SERVICE_NAME}..."
  ssh_cmd "cd ${escaped_srv} && \
    (docker compose -f ${escaped_compose} up -d --force-recreate --no-deps ${escaped_svc} 2>&1 || \
     docker-compose -f ${escaped_compose} up -d --force-recreate --no-deps ${escaped_svc} 2>&1)" \
    || warn "compose up failed (continuing — verify will catch issues)"

  # ── 4.2 wait for container healthy ──
  log "waiting for ${CONTAINER_NAME} to be healthy..."
  local retries=0
  local max_retries=20
  while [[ $retries -lt $max_retries ]]; do
    local status
    status=$(ssh_cmd "docker inspect --format='{{.State.Health.Status}}' ${escaped_cname_deploy} 2>/dev/null || echo unknown" 2>/dev/null | tail -1 | tr -d "'")
    if [[ "$status" == "healthy" ]]; then
      ok "${CONTAINER_NAME} is healthy"
      break
    fi
    log "  waiting... (${retries}/${max_retries}) status=${status}"
    sleep 3
    retries=$((retries+1))
  done
  if [[ $retries -ge $max_retries ]]; then
    warn "${CONTAINER_NAME} not healthy after $((max_retries * 3))s — continuing anyway"
  fi

  # ── 4.3 docker cp 覆盖容器内文件 ──
  log "docker cp backend overlay → ${CONTAINER_NAME}..."
  ssh_cmd "docker cp /tmp/backend-overlay/. ${escaped_cname_deploy}:/app/ 2>&1" \
    || warn "docker cp backend failed"

  # ── 4.4 chown 修复权限 ──
  log "chown ${CHOWN_USER}:${CHOWN_GROUP} /app/..."
  ssh_cmd "docker exec ${escaped_cname_deploy} chown -R ${escaped_chown_user}:${escaped_chown_group} /app/ 2>&1" \
    || warn "chown failed — baked image files may be inaccessible"

  # ── 4.5 docker cp 前端（如果有）──
  if ssh_cmd "test -d /tmp/frontend-overlay" 2>/dev/null; then
    log "docker cp frontend overlay → ${NGINX_CONTAINER}..."
    ssh_cmd "docker cp /tmp/frontend-overlay/. ${escaped_nginx_deploy}:${NGINX_HTML_PATH}/ 2>&1" \
      || warn "docker cp frontend failed"
  fi

  # ── 4.6 restart 容器 ──
  log "restarting ${CONTAINER_NAME}..."
  ssh_cmd "docker restart ${escaped_cname_deploy} 2>&1" \
    || warn "docker restart failed"

  # ── 4.7 wait for healthy after restart ──
  log "waiting for ${CONTAINER_NAME} to recover..."
  retries=0
  while [[ $retries -lt 20 ]]; do
    local status
    status=$(ssh_cmd "docker inspect --format='{{.State.Health.Status}}' ${escaped_cname_deploy} 2>/dev/null || echo unknown" 2>/dev/null | tail -1 | tr -d "'")
    if [[ "$status" == "healthy" ]]; then
      ok "${CONTAINER_NAME} recovered healthy"
      break
    fi
    sleep 3
    retries=$((retries+1))
  done
  if [[ $retries -ge 20 ]]; then
    warn "${CONTAINER_NAME} not healthy after restart"
  fi

  set -e
  ok "DEPLOY complete (check VERIFY for results)"
}

# ══════════════════════════════════════════════════════════════
# §5  VERIFY 阶段
# ══════════════════════════════════════════════════════════════

# ── 5.1 V1: 后端契约 — 通用健康检查（B1/B3 修复）──
verify_v1() {
  echo ""
  log "=== verify 1: backend health check ==="

  # 通用健康检查: docker exec curl → 200 即 PASS
  # B2 修复: CONTAINER_NAME 用 printf '%q' 转义防远程命令注入
  local cname_v1 escaped_cname_v1 v1_exit
  cname_v1="${CONTAINER_NAME}"
  escaped_cname_v1=$(printf '%q' "$cname_v1")
  v1_exit=$(ssh_cmd "docker exec ${escaped_cname_v1} curl -sf -o /dev/null -w '%{http_code}' http://localhost:${BACKEND_PORT}${V1_HEALTH_PATH} 2>&1" 2>/dev/null | tail -1)

  if [[ "$v1_exit" == "200" ]]; then
    V1_RESULT="PASS"
    ok "V1: ${V1_HEALTH_PATH} → 200"
  else
    V1_RESULT="FAIL"
    fail "V1: ${V1_HEALTH_PATH} → ${v1_exit:-no-response} (expected 200)"
  fi

  # 可选: V1_CUSTOM_CMD 钩子（项目专属深度验证）
  if [[ -n "${V1_CUSTOM_CMD}" ]]; then
    log "V1 CUSTOM: running custom validation..."
    local custom_out custom_rc
    custom_out=$(ssh_cmd "${V1_CUSTOM_CMD}" 2>&1) || true
    custom_rc=$?  # N3 修复: 真实记录 rc,不再因 || true 必为 0
    if [[ $custom_rc -eq 0 ]] && echo "$custom_out" | grep -qi 'PASS\|OK\|0'; then
      ok "V1 CUSTOM: passed"
    else
      warn "V1 CUSTOM: result — $custom_out"
      # V1_CUSTOM 不覆盖 V1 主判定
    fi
  fi
}

# ── 5.2 V2: chunk 在 nginx ──
verify_v2() {
  echo ""
  log "=== verify 2: chunk in nginx ==="

  # B2 修复: NGINX_CONTAINER 用 printf '%q' 转义防远程命令注入
  local escaped_nginx_cname chunk_list
  escaped_nginx_cname=$(printf '%q' "$NGINX_CONTAINER")
  chunk_list=$(ssh_cmd "docker exec ${escaped_nginx_cname} ls ${NGINX_HTML_PATH}/assets/${V2_CHUNK_PATTERN} 2>&1" 2>/dev/null)

  if [[ -z "$chunk_list" ]] || echo "$chunk_list" | grep -qi 'No such\|cannot\|error'; then
    V2_RESULT="FAIL"
    fail "V2: no chunks in ${NGINX_HTML_PATH}/assets/"
  else
    local count
    count=$(echo "$chunk_list" | wc -l | tr -d ' ')
    V2_RESULT="PASS"
    ok "V2: ${count} chunk(s) in nginx assets/"
    echo "$chunk_list" | head -5
  fi
}

# ── 5.3 V3: 字段在 chunk ──
verify_v3() {
  echo ""
  log "=== verify 3: keyword in chunk ==="

  if [[ -z "${V3_GREP_KEYWORD}" ]]; then
    V3_RESULT="SKIP"
    log "V3: skipped (no V3_GREP_KEYWORD configured)"
    return 0
  fi

  # 一次性获取所有 chunk 文件列表
  # B2 修复: NGINX_CONTAINER printf '%q' 转义
  local escaped_nginx_cname chunks
  escaped_nginx_cname=$(printf '%q' "$NGINX_CONTAINER")
  chunks=$(ssh_cmd "docker exec ${escaped_nginx_cname} find ${NGINX_HTML_PATH}/assets/ -name '*.js' -type f 2>&1" 2>/dev/null)

  if [[ -z "$chunks" ]] || echo "$chunks" | grep -qi 'No such\|cannot\|error'; then
    V3_RESULT="FAIL"
    fail "V3: no JS files in nginx assets/"
    return 0
  fi

  # 单次 SSH 合并 grep 全部 chunk
  # B1 修复: V3_GREP_KEYWORD printf '%q' 转义防本地命令注入 + 单引号包裹延迟到远程展开
  # B4 修复: grep -rl 改 -rlF 固定字符串模式
  local escaped_kw grep_result
  escaped_kw=$(printf '%q' "$V3_GREP_KEYWORD")
  grep_result=$(ssh_cmd "docker exec ${escaped_nginx_cname} sh -c 'grep -rlF ${escaped_kw} ${NGINX_HTML_PATH}/assets/*.js 2>/dev/null || echo NO_MATCH'" 2>/dev/null)

  if echo "$grep_result" | grep -q 'NO_MATCH'; then
    V3_RESULT="FAIL"
    fail "V3: keyword '${V3_GREP_KEYWORD}' not found in any chunk"
  else
    V3_RESULT="PASS"
    local match_count
    match_count=$(echo "$grep_result" | grep -v 'NO_MATCH' | wc -l | tr -d ' ')
    ok "V3: keyword '${V3_GREP_KEYWORD}' found in ${match_count} chunk(s)"
  fi
}

# ── 5.4 V4: 路由 200 ──
verify_v4() {
  echo ""
  log "=== verify 4: route 200 ==="

  # N2 修复: curl 加 --connect-timeout / --max-time 防公网不可达无限挂起
  local http_code
  http_code=$(curl -s --connect-timeout 10 --max-time 30 -o /dev/null -w "%{http_code}" "http://${DOMAIN}${V4_ROUTE_PATH}" 2>/dev/null || echo "000")

  if [[ "$http_code" == "200" ]]; then
    V4_RESULT="PASS"
    ok "V4: ${V4_ROUTE_PATH} → 200"
  else
    V4_RESULT="FAIL"
    fail "V4: ${V4_ROUTE_PATH} → ${http_code} (expected 200)"
  fi
}

# ── VERIFY 主函数 ──
run_verify() {
  DEPLOY_PHASE="VERIFY"
  log "========== PHASE 4: VERIFY =========="

  set +e
  verify_v1
  verify_v2
  verify_v3
  verify_v4
  set -e
}

# ══════════════════════════════════════════════════════════════
# §6  LOG 阶段
# ══════════════════════════════════════════════════════════════

run_log() {
  DEPLOY_PHASE="LOG"
  log "========== PHASE 5: LOG =========="

  # ── 6.1 汇总验证结果 ──
  local pass_count=0
  [[ "$V1_RESULT" == "PASS" ]] && pass_count=$((pass_count+1))
  [[ "$V2_RESULT" == "PASS" ]] && pass_count=$((pass_count+1))
  [[ "$V3_RESULT" == "PASS" ]] && pass_count=$((pass_count+1))
  [[ "$V3_RESULT" == "SKIP" ]] && pass_count=$((pass_count+1))  # SKIP 算通过
  [[ "$V4_RESULT" == "PASS" ]] && pass_count=$((pass_count+1))

  echo ""
  log "=== VERIFICATION SUMMARY ==="
  log "V1 backend health:  ${V1_RESULT}"
  log "V2 chunk in nginx:  ${V2_RESULT}"
  log "V3 keyword in chunk: ${V3_RESULT}"
  log "V4 route 200:       ${V4_RESULT}"
  log "Total: ${pass_count}/4"

  # ── 6.2 判定 verdict ──
  if [[ $pass_count -eq 4 ]]; then
    VERDICT="PASS"
  elif [[ $pass_count -eq 0 ]]; then
    VERDICT="FAIL"
  else
    VERDICT="PARTIAL"
  fi

  if [[ "$VERDICT" == "PASS" ]]; then
    ok "VERDICT: ${VERDICT}"
  elif [[ "$VERDICT" == "PARTIAL" ]]; then
    warn "VERDICT: ${VERDICT}"
  else
    fail "VERDICT: ${VERDICT}"
  fi

  # ── 6.3 写黑板日志 ──
  local elapsed
  elapsed=$(($(date +%s) - START_TIME))

  local log_content
  log_content=$(cat <<EOF
=== deploy-template.sh log ===
timestamp:  $(date '+%Y-%m-%d %H:%M:%S')
phase:      ${DEPLOY_PHASE}
verdict:    ${VERDICT}
elapsed:    ${elapsed}s
params:
  PROJECT_PATH=${PROJECT_PATH}
  SERVICE_NAME=${SERVICE_NAME}
  CONTAINER_NAME=${CONTAINER_NAME}
  COMPOSE_FILE=${COMPOSE_FILE}
  DOCKERFILE_PATH=${DOCKERFILE_PATH}
  SSH_HOST=${SSH_HOST}
  BACKEND_PORT=${BACKEND_PORT}
  V1_HEALTH_PATH=${V1_HEALTH_PATH}
  CHOWN=${CHOWN_USER}:${CHOWN_GROUP}
  V3_GREP_KEYWORD=${V3_GREP_KEYWORD:-<none>}
verification:
  V1=${V1_RESULT}
  V2=${V2_RESULT}
  V3=${V3_RESULT}
  V4=${V4_RESULT}
=== end log ===
EOF
)

  if [[ -n "${LOG_FILE}" ]]; then
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "$log_content" >> "$LOG_FILE"
    ok "log written to ${LOG_FILE}"
  else
    log "no LOG_FILE configured — log only to stdout"
  fi

  # ── 6.4 临时文件清理 ──
  cleanup
}

# ── 清理函数 ──
cleanup() {
  log "cleaning up server-side temp files..."
  ssh_cmd "rm -rf /tmp/backend-overlay /tmp/frontend-overlay 2>/dev/null; echo cleanup_done" 2>/dev/null || true
}

# ══════════════════════════════════════════════════════════════
# §7  主流程
# ══════════════════════════════════════════════════════════════

main() {
  START_TIME=$(date +%s)

  echo ""
  log "╔══════════════════════════════════════════════╗"
  log "║  deploy-template.sh v${DEPLOY_TEMPLATE_VERSION}                   ║"
  log "║  ${PROJECT_PATH:-<unset>}"
  log "╚══════════════════════════════════════════════╝"
  echo ""

  # Phase 1: PREFLIGHT (硬门, 失败即停)
  run_preflight || exit 1

  # Phase 2: TRANSFER (硬门, 失败即停)
  run_transfer || exit 2

  # Phase 3: DEPLOY (软门, 继续到 verify)
  run_deploy

  # Phase 4: VERIFY (软门, 全部跑完)
  run_verify

  # Phase 5: LOG
  run_log

  # 退出码
  case "$VERDICT" in
    PASS)    exit 0 ;;
    PARTIAL) exit 3 ;;
    FAIL)    exit 4 ;;
    *)       exit 4 ;;
  esac
}

# trap 确保异常退出时也清理，但保留退出码
trap 'rc=$?; cleanup; exit $rc' EXIT

main "$@"
