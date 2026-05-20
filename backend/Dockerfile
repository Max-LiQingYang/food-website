# ─────────────────────────────────────────────────────────────
# 生产环境：Node.js 18 + 非 root 用户
# ─────────────────────────────────────────────────────────────
FROM node:18-alpine AS production

# 安装生产依赖（apk 基础镜像，体积小）
RUN apk add --no-cache dumb-init curl

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeapp -u 1001

WORKDIR /app

# 先复制 package.json，再安装依赖（利用 Docker 缓存层）
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps && \
    chown -R nodeapp:nodejs /app

# 复制源码
COPY --chown=nodeapp:nodejs . .

# 安全：切换为非 root 用户
USER nodeapp

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE ${PORT}

# dumb-init 处理 SIGTERM / SIGINT，防止容器无法优雅退出
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "server.js"]
