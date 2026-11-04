# Daily Work

基于 Next.js、React、Tailwind CSS、Prisma 和 PostgreSQL 的开发工作台。

## 环境要求

- Node.js 20.9+
- Docker Desktop
- pnpm 10+

## 启动步骤

### 1. 安装依赖

```bash
pnpm install
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
pnpm exec prisma validate
pnpm exec prisma generate
```

### 5. 创建数据库迁移

首次初始化数据库时执行：

```bash
pnpm exec prisma migrate dev --name init
```

已有迁移时不要重复创建 init migration。

### 6. 启动 Next.js

```bash
pnpm dev
```

访问 http://localhost:3000

## 当前已实现

- PostgreSQL + Prisma 数据模型
- 工作台静态布局改为真实数据库待办列表
- 待办新增、编辑、软删除
- 待办状态和优先级维护
- 任务支持表格、看板和时间线三种视图，视图共享关键字、成员、项目、优先级和状态筛选
- 导航支持全部任务、今日计划、我负责的任务和最近更新范围切换
- 按项目归类待办
- 当前进展标题和说明
- 创建、状态变化、进展变化写入 `todo_progress_logs`
- 任务详情抽屉与最近 100 条进展历史
- 每日计划：按日期安排已有任务，记录计划内容、实际进展、计划耗时和实际耗时
- 每日计划支持新增、编辑、移除和日期切换；移除计划不会删除原任务
- 工作空间支持创建、切换和成员管理；按成员角色限制管理操作
- 阻塞问题管理：登记问题描述、原因、影响、严重程度和处理负责人
- 阻塞问题支持关联多个任务、关键字搜索、状态流转、负责人调整及处理记录时间线
- 阻塞问题数据按工作空间隔离；只读成员不能创建或修改阻塞问题
- 只读成员不能新增、编辑或删除任务、进展和每日计划
- 独立进展记录接口 `POST /api/todos/:id/progress`，事务更新当前进展并追加历史记录
- 关键字搜索和状态筛选
- 工作空间和示例项目的本地开发初始化

## 账户、工作空间与成员

支持邮箱 + 密码注册登录。密码使用 Node.js `scrypt` 加盐哈希保存；登录后通过 HttpOnly、SameSite=Lax 会话 Cookie 识别用户。注册会创建个人工作空间。用户可以创建多个工作空间、切换当前工作空间，并通过已注册邮箱添加成员。工作空间角色包括所有者、管理员、成员和只读成员；只读成员只能查看任务、进展和每日计划。当前尚未接入邮件服务，因此成员需要先注册账户，再由工作空间管理员添加。

## 常用命令

```bash
pnpm db:studio
pnpm typecheck
pnpm build
docker compose logs -f postgres
docker compose down
```

## 后续阶段

- 完善工作空间成员管理、工作空间切换与角色权限
- 待办负责人分配和成员协作
- 阻塞问题批量处理和更完整的提醒机制

## 数据库安全提醒

`.env` 中的数据库密码仅用于本地开发。不要将 `.env` 提交到 Git，也不要将此密码用于生产环境。
