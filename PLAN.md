# 美食食谱网站（food-website）产品完善计划

**分析日期**：2026-05-19  
**分析师**：产品经理  
**项目版本**：v1.0.0

---

## 一、项目当前状态总览

### 1.1 文件清单

| 分类 | 文件 | 状态 |
|------|------|------|
| **PRD** | `PRD-favorite-recipes.md` | ✅ 完整（v1.0） |
| **根配置** | `package.json` | ✅ monorepo workspaces 配置完整 |
| **部署** | `docker-compose.yml` | ✅ 4 服务（frontend/backend/mysql/redis） |
| **部署** | `Dockerfile.backend` | ✅ 多阶段+非root用户 |
| **部署** | `Dockerfile.frontend` | ✅ builder+nginx 两阶段 |
| **部署** | `nginx.conf` | ✅ SPA路由+API代理+健康检查 |
| **部署** | `.env.example` | ✅ 完整变量模板 |
| **CI/CD** | `.github/workflows/deploy.yml` | ✅ lint→test→build→deploy 全链路 |
| **后端** | `backend/index.js`（路由入口） | ✅ 4 个路由端点挂载 |
| **后端** | `backend/models/favorite.js` | ✅ Sequelize 模型+索引+软删除 |
| **后端** | `backend/routes/favorites.js` | ✅ 4 个 controller 函数 |
| **后端** | `backend/services/favoriteService.js` | ✅ 4 个业务方法+幂等 |
| **后端** | `backend/package.json` | ✅ 依赖完整 |
| **前端** | `frontend/api.js` | ✅ 4 个 API 方法+拦截器 |
| **前端** | `frontend/components/FavoriteButton.vue` | ✅ 乐观更新+登录检查 |
| **前端** | `frontend/pages/FavoriteList.vue` | ✅ 列表+分页+空状态+骨架屏 |
| **前端** | `frontend/package.json` | ✅ Vue3+Vite |
| **测试** | `tests/backend/backend.test.js` | ⚠️ 仅模拟路由，非真实 app |
| **测试** | `tests/frontend/frontend.test.js` | ⚠️ 4 个用例，3 个会失败 |
| **测试** | `tests/package.json` / 子包 | ✅ Jest 配置完整 |

### 1.2 缺失文件

| 缺失文件 | 严重性 | 说明 |
|----------|--------|------|
| `backend/app.js` / `backend/server.js` | 🔴 致命 | 无 Express 应用入口，`index.js` 只是路由模块，无法独立启动 |
| `backend/config/database.js` | 🔴 致命 | Sequelize 连接配置缺失，模型无法初始化 |
| `backend/models/index.js` | 🔴 致命 | 模型加载与关联注册缺失，`favoriteService.js` 的 `require('../models')` 会报错 |
| `backend/middleware/auth.js` | 🔴 致命 | 认证中间件缺失，路由中的 `req.userId` 无来源 |
| `backend/middleware/errorHandler.js` | 🟡 高 | 全局错误处理中间件缺失 |
| `backend/middleware/validate.js` | 🟡 中 | 请求参数校验中间件缺失（当前在 controller 中内联校验） |
| `backend/scripts/init.sql` | 🟡 高 | docker-compose 引用的 MySQL 初始化脚本缺失 |
| `backend/scripts/migrate.js` | 🟡 中 | `npm run migrate` 引用的迁移脚本缺失 |
| `backend/models/recipe.js` | 🟡 高 | Favorite 关联的 Recipe 模型缺失，收藏列表 JOIN 查询会失败 |
| `backend/models/user.js` | 🟡 中 | User 模型缺失（认证依赖） |
| `backend/routes/index.js` | 🟡 中 | 路由总入口缺失（挂载 /api/favorites） |
| `frontend/vite.config.js` | 🟡 高 | Vite 配置缺失，开发服务器代理未配置 |
| `frontend/router/index.js` | 🟡 高 | Vue Router 配置缺失，页面路由无法注册 |
| `frontend/App.vue` | 🟡 高 | 根组件缺失 |
| `frontend/main.js` | 🟡 高 | 应用入口缺失 |
| `frontend/index.html` | 🟡 高 | HTML 模板缺失 |
| `Dockerfile.frontend` / `Dockerfile.backend` 引用路径 | 🟡 中 | Dockerfile 在子目录，但 `docker-compose.yml` 的 `context` 和 `dockerfile` 路径需确认 |
| `docker-compose.prod.yml` | 🟡 中 | CI/CD 部署引用但缺失 |
| `.gitignore` | 🟡 中 | 缺失，.env 和 node_modules 可能被提交 |
| `tests/frontend/__mocks__/api.js` | 🟡 中 | Jest 配置引用但缺失 |
| `tests/frontend/jest.setup.js` | 🟡 中 | Jest 配置引用但缺失 |
| `frontend/components/api.js` | 🟢 低 | FavoriteButton.vue 的 import 路径 `./api` 应为 `../api` |

---

## 二、PRD 符合度分析

### 2.1 核心功能点对照

| PRD 要求 | 实现状态 | 差距 |
|----------|----------|------|
| 收藏按钮（空心/实心图标切换） | ✅ 已实现 | FavoriteButton.vue 使用 🤍/❤️ emoji，非 PRD 建议的 ♡/❤️，可接受 |
| 状态切换（无刷新） | ✅ 已实现 | 乐观更新模式，UI 即时反馈 |
| 收藏列表页 | ✅ 已实现 | FavoriteList.vue 含卡片、分页、空状态 |
| 取消收藏（详情页+列表页） | ✅ 已实现 | 两处均可操作 |
| 未登录引导登录 | ✅ 已实现 | FavoriteButton.vue 检查 token 并跳转 |
| 重复收藏幂等 | ✅ 已实现 | 后端 findOrCreate + 前端不报错 |
| 取消收藏幂等 | ✅ 已实现 | 后端返回"未收藏，无需取消" |
| 收藏计数（可选） | ❌ 未实现 | PRD 标注为可选，优先级低 |

### 2.2 API 规范对照

| PRD API | 后端路由 | 前端 API | 一致性 |
|---------|----------|----------|--------|
| `POST /api/favorites` | ✅ `router.post('/')` | ✅ `addFavorite()` | ✅ 一致 |
| `DELETE /api/favorites/{recipeId}` | ✅ `router.delete('/:recipeId')` | ✅ `removeFavorite()` | ✅ 一致 |
| `GET /api/favorites?page=&pageSize=` | ✅ `router.get('/')` | ✅ `getFavoriteList()` | ✅ 一致 |
| `GET /api/favorites/{recipeId}/status` | ⚠️ `router.get('/:recipeId/status')` | ⚠️ `getFavoriteStatus()` | ⚠️ 路径不一致 |

**路径不一致详情**：

- PRD 定义：`GET /api/favorites/{recipeId}/status`
- 后端路由：`GET /api/favorites/:recipeId/status`（在 `backend/index.js` 中注册）
- 前端调用：`GET /api/favorites/{recipeId}/status`
- 后端 controller 中注释写的是 `GET /api/favorites/status/:recipeId`

**结论**：路由注册（`/:recipeId/status`）与前端（`/{recipeId}/status`）一致，但 controller 注释错误。**实际路由可工作，注释需修正。**

### 2.3 响应格式对照

| PRD 响应 | 后端实际 | 差距 |
|----------|----------|------|
| 添加收藏 201 `{ code:0, message:"收藏成功", data:{id,userId,recipeId,createdAt} }` | ✅ 完全一致 | 无 |
| 重复收藏 200 `{ code:0, message:"已收藏", data:null }` | ✅ 完全一致 | 无 |
| 取消收藏 200 `{ code:0, message:"取消收藏成功", data:null }` | ✅ 完全一致 | 无 |
| 未收藏幂等 200 `{ code:0, message:"未收藏，无需取消", data:null }` | ✅ 完全一致 | 无 |
| 收藏列表 200 含 recipe 关联数据 | ✅ 包含 recipe 对象 | 无 |
| 401 未授权 | ⚠️ 未实现 | auth 中间件缺失，无法返回 401 |

### 2.4 数据模型对照

| PRD 字段 | 模型实现 | 差距 |
|----------|----------|------|
| `id` UUID | ✅ UUIDV4 主键 | 无 |
| `userId` UUID | ✅ 非空 | 无 |
| `recipeId` UUID | ✅ 非空 | 无 |
| `createdAt` ISO 8601 | ✅ DataTypes.DATE | 无 |
| UNIQUE(userId, recipeId) | ✅ 条件唯一索引 | 模型用 WHERE isDeleted=false，比 PRD 更优 |
| INDEX(userId, createdAt DESC) | ✅ 已创建 | 无 |
| 软删除 isDeleted | ➕ 额外字段 | PRD 未要求，但属于合理扩展 |

---

## 三、接口一致性分析

### 3.1 前后端接口一致性

| 接口 | 前端调用 | 后端处理 | 结论 |
|------|----------|----------|------|
| POST /api/favorites | `{ recipeId }` | `req.body.recipeId` | ✅ 一致 |
| DELETE /api/favorites/:recipeId | 路径参数 | `req.params.recipeId` | ✅ 一致 |
| GET /api/favorites | `?page=&pageSize=` | `req.query.page/pageSize` | ✅ 一致 |
| GET /api/favorites/:recipeId/status | 路径参数 | `req.params.recipeId` | ✅ 一致 |

### 3.2 前端 import 路径错误

- **FavoriteButton.vue** 第 9 行：`import { addFavorite, removeFavorite } from './api'`
  - 应为 `from '../api'`（组件在 `components/` 下，`api.js` 在上级目录）
- **FavoriteList.vue**：`import { getFavoriteList, removeFavorite } from './api'`
  - 同理应为 `from '../api'`

### 3.3 前端数据解构问题

- `FavoriteList.vue` 的 `fetchList()` 中：`res.data.list`
  - `api.js` 的响应拦截器已做 `return response.data`，所以 `res` 已经是 `{ code, message, data }` 结构
  - 正确写法应为 `res.data.list`（因为 `res` = `response.data` = `{ code:0, data:{ list } }`）
  - **当前写法实际正确**，但容易混淆，建议添加注释说明

---

## 四、测试覆盖度分析

### 4.1 后端测试

**当前状态**：使用模拟路由（硬编码响应），未接入真实 Express 应用。

| 问题 | 详情 |
|------|------|
| 未使用真实 app | 测试中 `const app = express()` + 硬编码路由，无法测试真实业务逻辑 |
| 无数据库测试 | 未配置测试数据库（SQLite 内存），favoriteService 未被测试 |
| 缺少认证测试 | 无 401 场景测试 |
| 缺少幂等测试 | 无重复收藏/重复取消收藏测试 |
| 缺少分页边界测试 | 无 page=0、pageSize=101 等边界值测试 |
| 缺少 UUID 格式校验测试 | 无非法 recipeId 格式测试 |

**覆盖率**：≈ 0%（模拟路由不覆盖任何实际代码）

### 4.2 前端测试

**当前状态**：4 个用例，其中 3 个会失败。

| 用例 | 预期结果 | 实际问题 |
|------|----------|----------|
| 未收藏显示"收藏" | pass | ✅ 可通过 |
| 已收藏显示"已收藏" | pass | ✅ 可通过 |
| 点击触发 `toggle` 事件 | **fail** | 组件未 emit `toggle` 事件，也无此逻辑 |
| loading 状态禁用按钮 | **fail** | `loading` 不是组件 prop，组件内部 `data` 中的 `loading` 不可通过 propsData 传入 |
| FavoriteList 空列表 | **fail** | 空状态文案是"还没有收藏任何食谱"而非"暂无收藏" |

**覆盖率**：≈ 5%（仅测试了渲染文本，未测试交互逻辑）

---

## 五、部署准备度分析

### 5.1 已就绪

| 项目 | 状态 |
|------|------|
| Docker Compose 配置 | ✅ 4 服务完整定义 |
| Dockerfile（前后端） | ✅ 多阶段构建+安全加固 |
| Nginx 反向代理 | ✅ SPA + API 代理 + 健康检查 |
| 环境变量模板 | ✅ .env.example 完整 |
| CI/CD Pipeline | ✅ lint→test→build→deploy |
| Redis 配置 | ✅ 可选缓存服务 |

### 5.2 阻塞项

| 阻塞项 | 严重性 | 说明 |
|--------|--------|------|
| 后端无法启动 | 🔴 | 缺少 app.js/server.js + 数据库配置 + 模型初始化 |
| 前端无法构建 | 🔴 | 缺少 vite.config.js + main.js + App.vue + index.html |
| init.sql 缺失 | 🟡 | MySQL 容器首次启动会报错 |
| docker-compose.prod.yml 缺失 | 🟡 | CI/CD deploy 阶段引用此文件 |
| .gitignore 缺失 | 🟡 | 安全风险 |
| package-lock.json 缺失 | 🟡 | `npm ci` 和 Docker 缓存依赖此文件 |

---

## 六、产品完善计划

### Phase 1：基础可运行（P0 · 预计 3 天）

> 目标：项目能本地 `npm run dev` 启动，前后端联通，核心收藏流程跑通。

| # | 任务 | 优先级 | 预计工时 |
|---|------|--------|----------|
| 1.1 | 创建 `backend/app.js`：Express 应用入口，挂载 cors/helmet/rate-limit/json 解析/路由/错误处理 | P0 | 2h |
| 1.2 | 创建 `backend/server.js`：读取 .env + 同步数据库 + 启动 HTTP 监听 | P0 | 1h |
| 1.3 | 创建 `backend/config/database.js`：Sequelize 实例配置（支持 sqlite/mysql/pg 切换） | P0 | 1.5h |
| 1.4 | 创建 `backend/models/index.js`：自动加载模型 + 注册关联 + 导出 db 对象 | P0 | 1h |
| 1.5 | 创建 `backend/models/recipe.js`：Recipe 模型（id/title/coverImage/author/cookTime） | P0 | 1h |
| 1.6 | 创建 `backend/models/user.js`：User 模型（id/username/email/password） | P0 | 1h |
| 1.7 | 创建 `backend/middleware/auth.js`：JWT 认证中间件，解析 Bearer token → req.userId | P0 | 1.5h |
| 1.8 | 创建 `backend/middleware/errorHandler.js`：全局错误捕获 + 统一响应格式 | P0 | 1h |
| 1.9 | 创建 `backend/routes/index.js`：路由总入口，挂载 `/api/favorites` + auth 中间件 | P0 | 0.5h |
| 1.10 | 修正 `backend/routes/favorites.js`：注释中 `/status/:recipeId` → `/:recipeId/status` | P0 | 0.1h |
| 1.11 | 创建 `frontend/vite.config.js`：开发代理 `/api` → `http://localhost:3001` | P0 | 0.5h |
| 1.12 | 创建 `frontend/main.js`：Vue 应用入口 + Router + 全局 message 挂载 | P0 | 0.5h |
| 1.13 | 创建 `frontend/App.vue`：根组件 + `<router-view />` | P0 | 0.3h |
| 1.14 | 创建 `frontend/index.html`：Vite HTML 入口 | P0 | 0.2h |
| 1.15 | 创建 `frontend/router/index.js`：注册 `/favorites` 路由 | P0 | 0.5h |
| 1.16 | 修正前端 import 路径：`FavoriteButton.vue` 和 `FavoriteList.vue` 中 `./api` → `../api` | P0 | 0.1h |
| 1.17 | 创建 `.gitignore`：node_modules/.env/dist/coverage 等 | P0 | 0.1h |
| 1.18 | 安装依赖并生成 `package-lock.json`（根目录 + 三个 workspace） | P0 | 0.5h |

**Phase 1 验收标准**：
- `npm run dev` 可同时启动前后端
- 前端收藏按钮可点击，后端 API 正确响应
- 收藏列表页可展示数据

---

### Phase 2：测试可运行（P1 · 预计 2 天）

> 目标：测试全部通过，覆盖率 ≥ 60%。

| # | 任务 | 优先级 | 预计工时 |
|---|------|--------|----------|
| 2.1 | 重构后端测试：使用真实 app + SQLite 内存数据库 + supertest | P1 | 3h |
| 2.2 | 后端测试：添加认证 401 场景 | P1 | 1h |
| 2.3 | 后端测试：添加幂等性测试（重复收藏/重复取消） | P1 | 1h |
| 2.4 | 后端测试：添加分页边界测试（page=0, pageSize>100, 空列表） | P1 | 1h |
| 2.5 | 后端测试：添加 UUID 格式校验测试 | P1 | 0.5h |
| 2.6 | 后端测试：添加收藏列表含 Recipe 关联数据测试 | P1 | 1h |
| 2.7 | 修正前端测试用例（删除 toggle 事件测试、修正 loading prop、修正空状态文案） | P1 | 1h |
| 2.8 | 前端测试：添加 FavoriteButton 乐观更新+失败回滚测试 | P1 | 2h |
| 2.9 | 前端测试：添加 FavoriteList 分页+取消收藏测试 | P1 | 2h |
| 2.10 | 创建 `tests/frontend/__mocks__/api.js` 和 `tests/frontend/jest.setup.js` | P1 | 1h |
| 2.11 | 配置 CI 中测试脚本正确执行 | P1 | 1h |

**Phase 2 验收标准**：
- `npm test` 全部通过
- 后端核心逻辑覆盖率 ≥ 70%
- 前端组件覆盖率 ≥ 50%

---

### Phase 3：部署就绪（P1 · 预计 2 天）

> 目标：Docker 构建成功，CI/CD 流水线可跑通。

| # | 任务 | 优先级 | 预计工时 |
|---|------|--------|----------|
| 3.1 | 创建 `backend/scripts/init.sql`：建表语句 + 种子数据 | P1 | 1h |
| 3.2 | 创建 `backend/scripts/migrate.js`：Sequelize 同步/迁移脚本 | P1 | 1h |
| 3.3 | 创建 `docker-compose.prod.yml`：生产覆盖配置（资源限制、日志驱动、只读文件系统） | P1 | 1.5h |
| 3.4 | 确认 Dockerfile 路径与 docker-compose.yml 的 context/dockerfile 引用一致 | P1 | 0.5h |
| 3.5 | 添加 `backend/app.js` 中的 `/health` 和 `/api/health` 健康检查端点 | P1 | 0.5h |
| 3.6 | 本地 `docker-compose up` 全链路验证 | P1 | 1h |
| 3.7 | 配置 GitHub Secrets（DOCKER_USERNAME/PASSWORD、SSH_KEY/HOST/USER） | P1 | 0.5h |
| 3.8 | CI/CD 流水线端到端测试（push 到 develop 分支验证） | P1 | 1h |

**Phase 3 验收标准**：
- `docker-compose up` 一键启动，4 个服务均 healthy
- 前端可访问，API 可调用
- CI push 到 develop 可完成 lint+test+build

---

### Phase 4：体验完善（P2 · 预计 3 天）

> 目标：打磨交互细节，满足 PRD 全部验收标准。

| # | 任务 | 优先级 | 预计工时 |
|---|------|--------|----------|
| 4.1 | 收藏按钮动画：点击时心形缩放弹跳效果（PRD 附录建议的视觉反馈） | P2 | 1h |
| 4.2 | 收藏列表页：recipe 为 null 时的兜底展示（食谱已被删除） | P2 | 0.5h |
| 4.3 | 收藏列表页：移动端响应式优化（375px 宽度，PRD NF-03） | P2 | 1h |
| 4.4 | 网络异常友好提示（断网/超时，PRD AC-08） | P2 | 1h |
| 4.5 | 收藏列表页：翻页后保持滚动位置的优化 | P2 | 0.5h |
| 4.6 | 收藏计数（可选功能）：食谱详情页显示被收藏次数 | P2 | 2h |
| 4.7 | 后端 API 响应时间优化：确保 ≤ 500ms（PRD NF-01） | P2 | 1h |
| 4.8 | 收藏列表首次加载优化：确保 ≤ 1.5s（PRD NF-02） | P2 | 1h |
| 4.9 | ESLint 配置统一 + 代码格式化（Prettier） | P2 | 1h |
| 4.10 | README.md：项目介绍 + 本地开发 + Docker 部署指南 | P2 | 1h |

**Phase 4 验收标准**：
- PRD AC-01 ~ AC-08 全部通过
- PRD NF-01 ~ NF-04 全部满足
- 移动端体验流畅

---

### Phase 5：迭代扩展（P3 · 按需排期）

> 对应 PRD §7.2 后续迭代建议，根据用户反馈优先级排期。

| # | 任务 | 优先级 |
|---|------|--------|
| 5.1 | 收藏夹分类/标签（"快手菜"、"节日宴请"等） | P3 |
| 5.2 | 收藏时添加备注 | P3 |
| 5.3 | 分享收藏夹（公开链接） | P3 |
| 5.4 | 基于收藏历史的食谱推荐 | P3 |
| 5.5 | 收藏同步（多设备） | P3 |

---

## 七、风险与建议

### 7.1 关键风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 后端核心文件缺失，项目不可运行 | 🔴 阻塞所有开发 | Phase 1 优先补全 |
| Recipe 模型缺失，收藏列表 JOIN 失败 | 🔴 核心功能不可用 | Phase 1.5 补全 |
| 认证中间件缺失，无登录态 | 🔴 安全漏洞 | Phase 1.7 补全 |
| 前端 import 路径错误，组件无法加载 | 🟡 组件报错 | Phase 1.16 修正 |
| 测试全部为模拟，无法发现真实 bug | 🟡 质量无保障 | Phase 2 重构 |
| 前端测试 3/4 会失败 | 🟡 CI 会阻塞 | Phase 2.7 修正 |

### 7.2 架构建议

1. **认证方案**：当前仅有 JWT token 方案，建议补充 token 刷新机制（refresh token）和 token 过期处理（前端 401 拦截跳转登录）
2. **数据库迁移**：建议引入 `sequelize-cli` 管理迁移，替代手动 `init.sql`
3. **日志方案**：建议引入结构化日志（如 `winston` 或 `pino`），替代 `console.error`
4. **API 文档**：建议引入 Swagger/OpenAPI 自动生成 API 文档
5. **前端状态管理**：收藏状态可能跨组件共享（详情页+列表页），建议引入 Pinia 管理收藏状态

---

## 八、工时汇总

| Phase | 内容 | 预计工时 | 优先级 |
|-------|------|----------|--------|
| Phase 1 | 基础可运行 | 14.4h ≈ 3 天 | P0 |
| Phase 2 | 测试可运行 | 14.5h ≈ 2 天 | P1 |
| Phase 3 | 部署就绪 | 7h ≈ 1 天 | P1 |
| Phase 4 | 体验完善 | 10h ≈ 1.5 天 | P2 |
| Phase 5 | 迭代扩展 | 按需排期 | P3 |
| **合计** | | **≈ 7.5 天** | |

---

*文档结束*
