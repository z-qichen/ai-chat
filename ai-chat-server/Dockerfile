# ============================================================
# 后端 Dockerfile — 多阶段构建
#
# 阶段1 builder: 编译 TypeScript + 编译原生模块 (better-sqlite3)
# 阶段2 production: 仅生产依赖 + 编译产物，镜像精简
# ============================================================

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY ai-chat-server/package.json ./ai-chat-server/package.json
COPY ai-chat-vue/package.json ./ai-chat-vue/package.json

RUN pnpm install --frozen-lockfile

COPY ai-chat-server/ ./ai-chat-server/
# 清理可能被 Windows 本地 node_modules (junction) 覆盖的依赖，重新安装
RUN rm -rf ai-chat-server/node_modules
RUN pnpm install --frozen-lockfile
WORKDIR /app/ai-chat-server
RUN pnpm build

# 用 pnpm deploy 创建独立的生产部署目录（仅生产依赖）
# 注意: pnpm deploy 尊重 .gitignore，会排除 dist/，需要单独复制
RUN cd /app && pnpm --filter ai-chat-server deploy --prod /deploy
RUN cp -r /app/ai-chat-server/dist /deploy/dist

FROM node:22-alpine
RUN apk add --no-cache wget
WORKDIR /app

COPY --from=builder /deploy ./

RUN mkdir -p /app/data

ENV NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# 使用 tsx 作为 ESM loader: 解决 tsc 编译产物 import 不带 .js 扩展名的问题
# Node 原生 ESM 要求显式扩展名, tsx 自动补齐
CMD ["node", "--import", "tsx/esm", "dist/index.js"]
