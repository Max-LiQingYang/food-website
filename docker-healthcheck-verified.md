# Docker 健康检查 IPv6 解析问题 — 验证报告

**项目**: food-website  
**日期**: 2026-05-22  
**审查者**: 自动化诊断子进程  
**状态**: 部分修复（仍需一个位置）

---

## 背景

BusyBox `wget`（Alpine Linux 默认）优先解析 `localhost` 为 IPv6 地址 `::1`。  
Nginx 在 frontend 容器中 `listen 80` 仅绑定 IPv4 `0.0.0.0`。  
健康检查 URL `http://localhost/health` ⇒ DNS 解析到 `::1:80` ⇒ 连接失败 ⇒ 容器标记为 **unhealthy**。

## 文件 1：docker-compose.yml ✅ 已修复

**路径**: `~/Projects/food-website/docker-compose.yml`  
**相关片段** (frontend 服务):

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://127.0.0.1/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

**结论**: ✅ **已使用 `127.0.0.1`，IPv6 问题已规避。**  
Docker Compose 中 frontend healthcheck 的 test URL 已经是 `http://127.0.0.1/health`，正确无误。

## 文件 2：frontend/Dockerfile ❌ 尚未修复

**路径**: `~/Projects/food-website/frontend/Dockerfile`  
**相关片段** (文件末尾):

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
```

**结论**: ❌ **仍在使用 `http://localhost/health`，存在相同的 IPv6 解析问题。**  
此 Dockerfile 基于 `nginx:1.25-alpine`（BusyBox wget），健康检查命令会遭受完全相同的 `localhost → ::1` 解析失败。**需要将 `localhost` 替换为 `127.0.0.1`**，与 docker-compose.yml 保持一致。

---

## 总结

| 位置 | 当前值 | 状态 |
|---|---|---|
| `docker-compose.yml` frontend healthcheck | `http://127.0.0.1/health` | ✅ 已修复 |
| `frontend/Dockerfile` HEALTHCHECK | `http://localhost/health` | ❌ 待修复 |

**建议**: 将 `frontend/Dockerfile` 中的 `http://localhost/health` 改为 `http://127.0.0.1/health`，与 docker-compose.yml 保持一致，然后重新构建并推送镜像。