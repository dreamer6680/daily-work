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

首次初始化数据库时执行：

```bash
npx prisma migrate dev --name init
```

已有迁移时不要重复创建 init migration。

### 6. 启动 Next.js

```bash
npm run dev
```

访问 http://localhost:3000

## 当前已实现

- PostgreSQL + Prisma 数据模型
- 工作台静态布局改为真实数据库待办列表
- 待办新增、编辑、软删除
- 待办状态和优先级维护
- 按项目归类待办
- 当前进展标题和说明
- 创建、状态变化、进展变化写入 `todo_progress_logs`
- 关键字搜索和状态筛选
- 工作空间和示例项目的本地开发初始化

## 当前开发身份说明

登录模块尚未接入。当前 API 使用固定的本地 Demo 用户（`demo@daily-work.local`）和其工作空间，仅用于本地开发验证。正式部署前必须替换为真实会话身份和服务端工作空间权限校验。

## 常用命令

```bash
npm run db:studio
npm run typecheck
npm run build
docker compose logs -f postgres
docker compose down
```

## 后续阶段

- 用户注册登录和真实身份认证
- 工作空间切换与成员权限
- 待办详情和进展历史时间线
- 每日计划
- 阻塞问题管理
- 看板和时间线视图

## 数据库安全提醒

`.env` 中的数据库密码仅用于本地开发。不要将 `.env` 提交到 Git，也不要将此密码用于生产环境。
