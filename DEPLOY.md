# 阿里云 ECS 部署说明

## 部署范围

本部署使用项目独立的 PostgreSQL 容器和独立数据卷，不连接本机或公司的 MySQL。数据库未映射公网端口，只有应用容器可以访问。

## 首次部署

在 ECS 的 Ubuntu 终端执行：

```bash
cd /opt
git clone https://github.com/wqsEric/sessionTask.git gongyou-zhilian
cd gongyou-zhilian
bash scripts/bootstrap-server.sh http://服务器公网IP
```

脚本会在服务器本地生成随机数据库密码和登录签名密钥，保存在权限为 `600` 的 `.env.server` 中，不会提交到 GitHub。随后会构建并启动网页和 PostgreSQL。

## 检查状态

```bash
cd /opt/gongyou-zhilian
docker compose --env-file .env.server ps
curl -I http://127.0.0.1
```

两个容器应处于运行状态，网页请求应返回 HTTP 响应。之后可在手机浏览器打开 `http://服务器公网IP`。

## 更新版本

```bash
cd /opt/gongyou-zhilian
git pull --ff-only
docker compose --env-file .env.server up -d --build
```

## 数据与备份

- 用户、发布、联系申请、消息和举报数据存放在 Docker 数据卷 `gongyou_postgres` 中。
- `.env.server` 和数据库数据卷都只存在于 ECS，不在 GitHub 中。
- 删除容器不会自动删除数据卷；不要执行带 `-v` 的 compose down，除非明确要删除全部业务数据。
- 正式运营前需要建立定时 PostgreSQL 备份并验证恢复流程。

## 域名与 HTTPS

域名解析到 ECS 且安全组开放 80、443 后，Caddy 会自动申请并续期 HTTPS 证书。正式域名配置为：

```env
COOKIE_SECURE=true
NEXT_PUBLIC_SITE_URL=https://gongyou.wqseric.com
SITE_DOMAIN=gongyou.wqseric.com
```

首次从 HTTP 切换时更新服务器上的 `.env.server`，然后重新运行 compose。应用只在 Docker 内网监听 3000，公网请求统一由 Caddy 接收。
