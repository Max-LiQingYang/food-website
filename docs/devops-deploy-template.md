# 部署模板操作手册

> **deploy-template.sh v1.0.0** | TaskID: T-2026-0612-003 | 沉淀自 #137 迭代 10 次部署失败教训

---

## 1. 何时用模板 vs 何时手工

### 用模板

- ✅ 常规迭代部署（代码变更 → 服务器更新 → 验证）
- ✅ 后端 API + 前端 SPA 全量部署
- ✅ devops subagent 自动化部署（通过 `auto-deploy.sh`）
- ✅ 需要结构化验证报告的部署（4 验证套件）

### 手工部署

- ⚠️ 数据库 DDL 变更（模板不处理 migration）
- ⚠️ 容器镜像首次构建（模板假设镜像已存在）
- ⚠️ docker-compose.yml 结构变更（需手动 `docker compose up -d`）
- ⚠️ 服务器环境初始化（Docker 安装、网络配置等）
- ⚠️ 回滚操作（手动 revert + 重启即可）
- ⚠️ Gateway drain 期间 spawn 被拒收 → 运行 `openclaw gateway status` 确认状态，等待 drain 结束或手动执行模板
- ⚠️ kimi-k2.6 spawn "Tool not found" → 切换模型为 `volcano/doubao-seed-2.0-pro`，或在 spawn 时显式 model override

### 判断原则

如果部署只需要"传输代码 + 重启容器 + 验证生效"三步，用模板。如果涉及基础设施变更、数据迁移或需要交互式调试，先手工处理再回归模板。

---

## 2. 参数说明

### 必填参数（缺一报错 exit 1）

| 参数 | 说明 | 示例 |
|------|------|------|
| `PROJECT_PATH` | 本地项目根目录（绝对路径） | `/Users/max_yang/Projects/food-website` |
| `SERVICE_NAME` | docker-compose service 名（**不是** container_name） | `backend` |
| `CONTAINER_NAME` | docker 容器名 | `food-backend` |
| `COMPOSE_FILE` | compose 文件路径（相对于 PROJECT_PATH） | `docker-compose.yml` |

> ⚠️ compose CLI 用 service 名，docker CLI 用 container_name。`docker-compose.yml` 中 `services:` 下的 key 是 service 名，`container_name:` 是容器名。**两者经常不同。**

### 可选参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SSH_HOST` | `root@39.103.68.205` | SSH 连接目标（user@host 格式） |
| `SSH_PORT` | `22` | SSH 端口 |
| `SERVER_PROJECT_PATH` | `/root/food-website` | 服务器端项目根目录 |
| `BACKEND_PORT` | `3001` | 后端容器内监听端口 |
| `NGINX_CONTAINER` | `food-frontend` | Nginx 容器名（V2/V3 验证用） |
| `NGINX_HTML_PATH` | `/usr/share/nginx/html` | Nginx 静态资源根目录 |
| `DOMAIN` | `39.103.68.205` | 公网域名或 IP（V4 验证用） |
| `DOCKERFILE_PATH` | `backend/Dockerfile` | Dockerfile 路径（相对于 PROJECT_PATH） |
| `V1_HEALTH_PATH` | `/health` | 后端健康检查路径 |
| `V2_CHUNK_PATTERN` | `*.js` | chunk 文件匹配模式（glob） |
| `V3_GREP_KEYWORD` | （无默认） | 在 chunk 中搜索的关键符号 |
| `V4_ROUTE_PATH` | `/` | 公网验证路径 |
| `V1_CUSTOM_CMD` | （无默认） | V1 通过后追加的自定义验证命令（SSH 执行） |
| `CHOWN_USER` | （自动探测） | 容器内文件属主用户 |
| `CHOWN_GROUP` | （自动探测） | 容器内文件属主组 |
| `LOG_FILE` | （仅 stdout） | 日志文件路径 |

### 自动探测

| 探测项 | 来源 | fallback |
|--------|------|----------|
| chown 用户/组 | `${DOCKERFILE_PATH}` 中的 `USER` 指令 | `nodeapp:nodejs` |
| macOS xattr | `uname -s` | Linux 自动跳过 |
| compose service 名验证 | 检查 `${COMPOSE_FILE}` 中是否存在 | 仅警告，不阻塞 |

### 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | VERDICT=PASS（4 验证全部通过） |
| 1 | PREFLIGHT 失败（参数缺失/SSH 不通/源码缺失） |
| 2 | TRANSFER 失败（网络/文件传输错误） |
| 3 | VERDICT=PARTIAL（部分验证失败） |
| 4 | VERDICT=FAIL（全部验证失败） |

### food-website 适配示例

```bash
# 最简调用（使用默认值）
bash scripts/deploy-template.sh \
  PROJECT_PATH=/Users/max_yang/Projects/food-website \
  SERVICE_NAME=backend \
  CONTAINER_NAME=food-backend \
  COMPOSE_FILE=docker-compose.yml \
  V3_GREP_KEYWORD=aggregateDimensionAverages

# 通过 auto-deploy.sh
bash .team/scripts/auto-deploy.sh T-2026-0612-003 \
  V3_GREP_KEYWORD=aggregateDimensionAverages

# 自定义验证路径
bash scripts/deploy-template.sh \
  PROJECT_PATH=/Users/max_yang/Projects/food-website \
  SERVICE_NAME=backend \
  CONTAINER_NAME=food-backend \
  COMPOSE_FILE=docker-compose.yml \
  V1_HEALTH_PATH=/api/health \
  V4_ROUTE_PATH=/compare
```

### 新项目适配清单

首次在新项目中使用模板：

1. 复制 `scripts/deploy-template.sh` 或创建符号链接
2. 创建 `.env.deploy` 文件设置项目级默认值
3. **手动确认** Dockerfile `USER` 指令（自动探测不能替代人工确认）
4. **手动确认** compose service 名与 container_name 的对应关系
5. 确认 SSH 免密登录已配置

---

## 3. 失败模式与根因映射

| # | 失败现象 | 对应验证 | 根因分类 | 自查项 | #137 对应 |
|---|----------|----------|----------|--------|-----------|
| F1 | `docker compose up` → "no such service" | P3 compose up | **service 名 ≠ container_name** | 检查 `docker-compose.yml` 中 `services:` 下的 key（service 名）与 `container_name:` 是否不同 | v9 坑 #1 |
| F2 | `docker cp` → "lsetxattr com.apple.provenance" | P2 tar pipe | **macOS xattr 污染** | `xattr -cr <dir>` + `COPYFILE_DISABLE=1 tar --no-xattrs`；模板自动处理 | v4 坑 #4 |
| F3 | V1 FAIL（健康检查非 200） | V1 | **baked-in 代码未更新** | `docker cp` 后须 `chown`（属主 root→nodeapp）；然后 `docker restart` | v10 坑 #2 |
| F4 | V2 FAIL（no chunks） | V2 | **前端 dist 未传输或路径错误** | 检查 `NGINX_HTML_PATH`；确认 `docker cp` 目标路径 | v5 坑 #7 |
| F5 | V3 FAIL（keyword not found） | V3 | **React lazy-load chunk 路径不在 index.html** | 用 `docker exec ls assets/` 而非 `curl | grep`；lazy() chunk 只在 router 中 | v5 坑 #7 |
| F6 | V4 → 502/503 | V4 | **后端未 healthy 或 nginx upstream 失效** | `docker ps` 确认容器 healthy；`docker exec <nginx> nginx -s reload` | v9 坑 #2 |
| F7 | SSH 连接超时 | P1 SSH check | **网络不通或 SSH 配置错误** | 检查 `SSH_HOST`/`SSH_PORT`；`ssh -o ConnectTimeout=5 <host> echo ok` | v8 坑 #6 |
| F8 | `docker cp` 后文件属主错误 | P3 chown | **未执行 chown** | 确认 `CHOWN_USER:CHOWN_GROUP` 与 Dockerfile `USER` 一致 | v10 坑 #3 |
| F9 | 容器 restart 后死循环 502 | P3 restart | **代码错误导致进程崩溃** | `docker logs <container> --tail 50`；本地验证 | v9 坑 #2 |
| F10 | tar 传输 0 文件 | P2 tar pipe | **源路径错误或为空** | `find <dir> -type f \| wc -l`；检查 PROJECT_PATH | — |
| F11 | Gateway drain spawn 被拒 | N/A | **基础设施** | `openclaw gateway status`；等待或手工执行 | v8 坑 #6 |
| F12 | kimi-k2.6 "Tool not found" | N/A | **模型 bug** | 切换 `volcano/doubao-seed-2.0-pro` | v1/v2 坑 #5 |

### 失败优先级

```
P0 (阻塞部署): F1, F2, F7, F10
P1 (部署完成但功能未生效): F3, F4, F5, F8, F9
P2 (环境/基础设施): F6, F11, F12
```

---

## 4. 自查清单

部署前逐项确认：

- [ ] **service 名正确**：`docker compose config --services` 确认 SERVICE_NAME 值
- [ ] **container_name 正确**：`docker ps --format '{{.Names}}'` 确认 CONTAINER_NAME 值
- [ ] **SSH 连通**：`ssh -o ConnectTimeout=5 <host> echo ok`
- [ ] **Dockerfile USER**：`grep '^USER ' <Dockerfile>` 确认 chown 用户/组
- [ ] **macOS xattr**：模板自动处理（Darwin 自动启用 `xattr -cr` + `tar --no-xattrs`）
- [ ] **源码存在**：`ls <PROJECT_PATH>/backend/` 非空
- [ ] **V3_GREP_KEYWORD** 已设置（否则 V3 跳过，不影响 verdict）

部署后验证：

- [ ] V1 PASS：`docker exec <container> curl -sf http://localhost:<port><health_path>`
- [ ] V2 PASS：`docker exec <nginx> ls <html>/assets/*.js` 有文件
- [ ] V3 PASS：`docker exec <nginx> grep <keyword> <html>/assets/*.js` 命中
- [ ] V4 PASS：`curl -s -o /dev/null -w '%{http_code}' http://<domain>/` = 200

快速诊断命令：

```bash
# 容器状态
ssh <host> 'docker ps --format "{{.Names}}\t{{.Status}}"'

# 后端日志
ssh <host> 'docker logs <container> --tail 50'

# nginx 配置测试
ssh <host> 'docker exec <nginx> nginx -t'

# 容器内文件验证
ssh <host> 'docker exec <container> grep -c <keyword> <path>'
```

### compose service 探测注意事项

模板内置的 service 名验证 awk 脚本兼容 2 空格、4 空格和 tab 缩进的 YAML 文件。但以下情况可能探测失败：

- 自定义 YAML 锚点/别名
- 多文档 YAML（`---` 分隔）
- 行内 JSON 格式的 compose 配置

如遇探测失败，直接显式传入 `SERVICE_NAME` 即可。

---

## 附录：5 阶段流程图

```
PREFLIGHT ──→ TRANSFER ──→ DEPLOY ──→ VERIFY ──→ LOG
  (硬门)       (硬门)      (软门)     (软门)     (记录)

硬门: 失败即停, exit 1/2
软门: 尽可能跑完, 汇总报告后 exit 0/3/4
```
