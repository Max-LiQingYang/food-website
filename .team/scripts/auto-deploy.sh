#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# auto-deploy.sh — devops subagent 统一部署入口
# TaskID: T-2026-0612-003
#
# 用法: bash .team/scripts/auto-deploy.sh <task-id> [KEY=VALUE ...]
# 退出码: 0=PASS  1=PREFLIGHT  2=TRANSFER  3=PARTIAL  4=FAIL
#
# 示例:
#   bash .team/scripts/auto-deploy.sh T-2026-0612-003 \
#     V3_GREP_KEYWORD=aggregateDimensionAverages
# ─────────────────────────────────────────────────────────────
set -euo pipefail

TASK_ID="${1:?Usage: auto-deploy.sh <task-id> [KEY=VALUE ...]}"
shift

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="${PROJECT_ROOT}/scripts/deploy-template.sh"
LOG_DIR="${PROJECT_ROOT}/.team/tasks/${TASK_ID}"
LOG_FILE="${LOG_DIR}/deploy.log"

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 加载项目级默认值（可选）
ENV_DEPLOY="${PROJECT_ROOT}/.env.deploy"
if [[ -f "$ENV_DEPLOY" ]]; then
  set -a
  source "$ENV_DEPLOY"
  set +a
fi

# ── 日志头 ──
{
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║  auto-deploy.sh — ${TASK_ID}"
  echo "║  started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "║  project: ${PROJECT_ROOT}"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
} | tee -a "$LOG_FILE"

# ── 调用模板 ──
bash "$TEMPLATE" \
  PROJECT_PATH="$PROJECT_ROOT" \
  LOG_FILE="$LOG_FILE" \
  "$@" \
  2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

# ── 日志尾 ──
{
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║  auto-deploy.sh — ${TASK_ID}"
  echo "║  ended:   $(date '+%Y-%m-%d %H:%M:%S')"
  echo "║  exit:    ${EXIT_CODE}"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
} | tee -a "$LOG_FILE"

exit $EXIT_CODE
