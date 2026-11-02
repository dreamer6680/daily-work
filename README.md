# Daily Work

基于 Next.js、React、Tailwind CSS、Prisma 和 PostgreSQL 的开发工作台。

## 环境要求

- Node.js 20.9+
- Docker Desktop
- npm

## 启动步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 启动 PostgreSQL

```bash
docker compose up -d
docker compose ps
```

PostgreSQL 映射到本机 `5433` 端口，避免与本机已有 MySQL/PostgreSQL 服务的默认端口冲突。

### 4. 校验 Prisma Schema 并生成客户端

```bash
npx prisma validate
npx prisma generate
```

### 5. 创建数据库迁移

```bash
npx prisma migrate dev --name init
```

### 6. 启动 Next.js

```bash
npm run dev
```

访问 http://localhost:3000

## 常用命令

```bash
npm run db:studio
npm run typecheck
npm run build
docker compose logs -f postgres
docker compose down
```

## 当前阶段范围

当前提交包含项目骨架、PostgreSQL、Prisma 数据模型和静态工作台页面。登录、真实业务 API、任务 CRUD、进展历史写入和阻塞问题管理将在后续阶段逐步实现。

## 数据库安全提醒

`.env` 中的数据库密码仅用于本地开发。不要将 `.env` 提交到 Git，也不要将此密码用于生产环境。
