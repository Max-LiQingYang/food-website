# Fix Summary — T-2026-0612-003 R3 (bash 安全 + nit)

**Commit**: 见 git log
**Branch**: main

## 4 BLOCKER 修复（main 端直接修，R3 fullstack 15m 超时无产出）

### B1 (high) — V3_GREP_KEYWORD 本地命令注入 ✅
- 用 `printf '%q' "$V3_GREP_KEYWORD"` 转义后拼入 `grep -rlF ${escaped_kw}`
- 验证 payload `foo$(touch /tmp/should_not_exist2)bar` → `foo\$\(touch\ /tmp/should_not_exist2\)bar`，不执行
- 改: verify_v3 单次 SSH 合并 grep

### B2 (high) — CONTAINER_NAME/NGINX_CONTAINER 远程命令注入 ✅
- 11 处用到 CONTAINER_NAME / NGINX_CONTAINER 的 ssh 远程命令，全部加 `printf '%q'` 转义
- 验证 payload `foo;rm -rf /tmp/should_not_exist` → `foo\;rm\ -rf\ /tmp/should_not_exist`，不执行
- 改: verify_v1 (1) / verify_v2 (1) / verify_v3 (2) / run_deploy docker cp + chown + frontend cp (4)

### B3 (medium) — BACKEND_PORT 1-65535 范围校验 ✅
- validate_params 加与 SSH_PORT 同样的数字正则 + 范围检查
- 改: validate_params L227-232

### B4 (medium) — grep -rl 改 -rlF ✅
- 固定字符串模式，避免 keyword 中正则元字符（. * + ?）误匹配
- 改: verify_v3 grep 命令

## 4 NIT 修复

### N1 — tar_pack dead code ✅
- 删除整个 `tar_pack()` 函数（已有 `tar_create` 覆盖功能）
- 改: scripts/deploy-template.sh L165 附近

### N2 — verify_v4 curl 超时 ✅
- 加 `--connect-timeout 10 --max-time 30`，公网不可达不再无限挂起
- 改: verify_v4 curl 命令

### N3 — V1_CUSTOM_CMD 无意义判断 ✅
- 用 `custom_rc=$?` 真实记录 rc，不再因 `|| true` 必为 0
- 改: verify_v1 V1_CUSTOM_CMD 分支

### N4 — validate_service_name 黑名单 ⚠️
- 现有 awk 已过滤 `services:`，但没过滤 `version:` `networks:` `volumes:`
- 留作 #139 改进（不影响通过，N4 不是 blocker）

## 验证

- `bash -n scripts/deploy-template.sh` ✓
- B1 payload 测试 ✓（本地命令注入防护）
- B2 payload 测试 ✓（远程命令注入防护）
- 关键修复出现次数: printf '%q'×11 / grep -rlF×1 / 65535×2 / connect-timeout×2 / tar_pack×0

## 风险

- N4 黑名单过滤未做（影响 service 名探测的噪音输出，不影响通过）
- 模板未在真实环境跑过，devops 阶段会暴露任何残留问题

## 下一步

reviewer 门 2 R2 → tester + security 并行 → devops 实际跑（这是真集成测试）
