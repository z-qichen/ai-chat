FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制 workspace 配置
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY ai-chat-server/package.json ./ai-chat-server/package.json
COPY ai-chat-vue/package.json ./ai-chat-vue/package.json

RUN pnpm install --frozen-lockfile

# 复制前端源码
COPY ai-chat-vue/ ./ai-chat-vue/
# 清理可能被 Windows 本地 node_modules (junction) 覆盖的依赖，重新安装
RUN rm -rf ai-chat-vue/node_modules
RUN pnpm install --frozen-lockfile

WORKDIR /app/ai-chat-vue
RUN pnpm build

FROM nginx:stable-alpine

RUN apk add --no-cache wget

COPY --from=builder /app/ai-chat-vue/dist /usr/share/nginx/html
COPY ai-chat-vue/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
