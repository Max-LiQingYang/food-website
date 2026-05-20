# 美食食谱网站 - 用户收藏功能
## 项目简介
这是一个前后端分离的美食食谱网站，核心实现了用户收藏食谱的功能，包括收藏/取消收藏、收藏列表展示、收藏状态查询等功能。
## 技术栈
- 前端：Vue 3 + Vite
- 后端：Node.js + Express + Sequelize ORM
- 数据库：MySQL
- 缓存：Redis（可选）
- 部署：Docker + Docker Compose
- CI/CD：GitHub Actions
## 目录结构
```
/
├── frontend/          # 前端Vue3项目
├── backend/           # 后端Node.js项目
│   ├── models/        # 数据模型定义
│   ├── routes/        # 路由定义
│   ├── services/      # 业务逻辑层
│   ├── middleware/    # 中间件
│   └── config/        # 配置文件
├── tests/             # 前后端测试用例
├── .github/workflows/ # CI/CD流水线配置
├── docker-compose.yml # Docker Compose部署配置
├── docker-compose.prod.yml # 生产环境部署配置
├── .env.example       # 环境变量模板
├── eslint.config.mjs  # ESLint代码检查配置
├── .prettierrc        # Prettier代码格式化配置
├── package.json       # 项目依赖配置
└── README.md          # 项目说明文档
```
## 本地开发步骤
### 1. 环境准备
- Node.js >= 20.x
- Docker + Docker Compose（可选，用于本地启动数据库）
### 2. 克隆项目
```bash
git clone <仓库地址>
cd food-website
```
### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，配置数据库连接等信息
```
### 4. 安装依赖
```bash
npm install
```
### 5. 启动本地开发环境
#### 方式一：同时启动前后端
```bash
npm run dev
# 前端访问地址：http://localhost:5173
# 后端接口地址：http://localhost:3001
```
#### 方式二：分别启动
```bash
# 启动后端
npm run dev:backend
# 启动前端（另开终端）
npm run dev:frontend
```
### 6. 运行测试
```bash
# 运行所有测试
npm test
# 只运行后端测试
npm run test:backend
# 只运行前端测试
npm run test:frontend
# 查看测试覆盖率
npm run test:coverage
```
### 7. 代码检查与格式化
```bash
# 代码格式检查
npm run format:check
# 自动格式化代码
npm run format
# ESLint代码检查
npm run lint
# ESLint自动修复可修复的问题
npm run lint:fix
```
## Docker部署步骤
### 1. 生产环境部署
```bash
# 复制并配置环境变量
cp .env.example .env
# 构建镜像
npm run docker:build
# 启动服务（后台运行）
npm run docker:up
# 查看服务日志
npm run docker:logs
# 停止服务
npm run docker:down
```
### 2. 服务访问
- 前端：http://localhost
- 后端接口：http://localhost/api
## API文档概览
### 收藏相关接口
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/favorites | 添加收藏 | 需要登录 |
| DELETE | /api/favorites/{recipeId} | 取消收藏 | 需要登录 |
| GET | /api/favorites | 获取用户收藏列表（支持分页） | 需要登录 |
| GET | /api/favorites/{recipeId}/status | 查询指定食谱是否已被当前用户收藏 | 需要登录 |
#### 请求参数说明
- 添加收藏：请求体包含`recipeId`（食谱ID）
- 取消收藏：路径参数`recipeId`（食谱ID）
- 收藏列表：查询参数`page`（页码，默认1）、`pageSize`（每页数量，默认10）
- 收藏状态查询：路径参数`recipeId`（食谱ID）
#### 响应格式
所有接口统一返回JSON格式：
```json
{
  "code": 0, // 0表示成功，非0表示失败
  "message": "操作成功", // 提示信息
  "data": {} // 返回数据
}
```
## License
MIT
