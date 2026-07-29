#!/bin/sh
# setup-env.sh — 初始环境配置脚本
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../ai-chat-server"
ENV_PATH="$SERVER_DIR/.env"
ENV_EXAMPLE="$SERVER_DIR/.env.example"

if [ -f "$ENV_PATH" ]; then
    echo "⚠️  .env 已存在，跳过生成"
else
    JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '+/=' | head -c 64)
    sed "s/change-me-to-a-random-string/${JWT_SECRET}/g" "$ENV_EXAMPLE" > "$ENV_PATH"
    echo "✅ .env 已生成，JWT_SECRET 已随机生成"
fi

echo "下一步: 编辑 $ENV_PATH 填写 DEEPSEEK_API_KEY 等必填项"
