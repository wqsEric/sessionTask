#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "未检测到 Docker，请先安装 Docker。"
  exit 1
fi

if [ ! -f .env.server ]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "未检测到 openssl，无法安全生成密码。"
    exit 1
  fi

  umask 077
  site_url="${1:-http://localhost}"
  db_password="$(openssl rand -hex 32)"
  session_secret="$(openssl rand -hex 48)"
  sed \
    -e "s|replace-with-a-long-random-database-password|${db_password}|" \
    -e "s|replace-with-at-least-32-random-characters|${session_secret}|" \
    -e "s|http://your-server-ip|${site_url}|" \
    .env.server.example > .env.server
  chmod 600 .env.server
  echo "已生成仅服务器保存的 .env.server。"
else
  echo "检测到已有 .env.server，将保留原配置。"
fi

docker compose --env-file .env.server up -d --build
docker compose --env-file .env.server ps

