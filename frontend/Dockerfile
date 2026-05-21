# ─────────────────────────────────────────────────────────────
# Stage 1: Build — 安装依赖 + 构建生产包
# ─────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖（利用 Docker 缓存）
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# 复制源码（排除 node_modules）
COPY . .

# 构建生产资源
# VITE_API_BASE_URL 在构建时注入（供 Vite 内联到 bundle）
ARG VITE_API_BASE_URL=https://api.example.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npx vite build

# ─────────────────────────────────────────────────────────────
# Stage 2: Production — Nginx 托管静态资源 + 反向代理 API
# ─────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置（SPA 路由 + API 反向代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
