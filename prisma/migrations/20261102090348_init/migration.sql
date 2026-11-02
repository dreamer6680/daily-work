-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProgressEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PROGRESS_UPDATED', 'NOTE', 'COMPLETED', 'REOPENED');

-- CreateEnum
CREATE TYPE "BlockerStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'WAITING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BlockerSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BlockerEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'COMMENT', 'OWNER_CHANGED', 'RESOLVED', 'REOPENED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(255),
    "email_verified" TIMESTAMPTZ(3),
    "image" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Taipei',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(20),
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_by_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "project_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TodoStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "current_progress_title" VARCHAR(200),
    "current_progress_note" TEXT,
    "start_at" TIMESTAMPTZ(3),
    "due_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "archived_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_assignees" (
    "todo_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todo_assignees_pkey" PRIMARY KEY ("todo_id","user_id")
);

-- CreateTable
CREATE TABLE "todo_daily_plans" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "todo_id" UUID NOT NULL,
    "plan_date" DATE NOT NULL,
    "day_note" TEXT,
    "planned_minutes" INTEGER,
    "actual_minutes" INTEGER,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todo_daily_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_progress_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "todo_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "eventType" "ProgressEventType" NOT NULL,
    "from_status" "TodoStatus",
    "to_status" "TodoStatus",
    "progress_title" VARCHAR(200),
    "progress_note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todo_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "cause" TEXT,
    "impact" TEXT,
    "severity" "BlockerSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "BlockerStatus" NOT NULL DEFAULT 'OPEN',
    "reported_by_id" UUID NOT NULL,
    "owner_id" UUID,
    "detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocker_todos" (
    "workspace_id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "todo_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocker_todos_pkey" PRIMARY KEY ("blocker_id","todo_id")
);

-- CreateTable
CREATE TABLE "blocker_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "eventType" "BlockerEventType" NOT NULL,
    "from_status" "BlockerStatus",
    "to_status" "BlockerStatus",
    "content" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocker_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "projects_workspace_id_status_idx" ON "projects"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_workspace_id_key" ON "projects"("id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_name_key" ON "projects"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "todos_workspace_id_status_idx" ON "todos"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "todos_workspace_id_project_id_idx" ON "todos"("workspace_id", "project_id");

-- CreateIndex
CREATE INDEX "todos_workspace_id_updated_at_idx" ON "todos"("workspace_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "todos_workspace_id_due_at_idx" ON "todos"("workspace_id", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "todos_id_workspace_id_key" ON "todos"("id", "workspace_id");

-- CreateIndex
CREATE INDEX "todo_assignees_user_id_todo_id_idx" ON "todo_assignees"("user_id", "todo_id");

-- CreateIndex
CREATE INDEX "todo_daily_plans_workspace_id_plan_date_idx" ON "todo_daily_plans"("workspace_id", "plan_date");

-- CreateIndex
CREATE UNIQUE INDEX "todo_daily_plans_todo_id_plan_date_key" ON "todo_daily_plans"("todo_id", "plan_date");

-- CreateIndex
CREATE INDEX "todo_progress_logs_todo_id_created_at_idx" ON "todo_progress_logs"("todo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "todo_progress_logs_workspace_id_created_at_idx" ON "todo_progress_logs"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "blockers_workspace_id_status_idx" ON "blockers"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "blockers_workspace_id_severity_idx" ON "blockers"("workspace_id", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "blockers_id_workspace_id_key" ON "blockers"("id", "workspace_id");

-- CreateIndex
CREATE INDEX "blocker_todos_todo_id_idx" ON "blocker_todos"("todo_id");

-- CreateIndex
CREATE INDEX "blocker_todos_workspace_id_idx" ON "blocker_todos"("workspace_id");

-- CreateIndex
CREATE INDEX "blocker_events_blocker_id_created_at_idx" ON "blocker_events"("blocker_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "blocker_events_workspace_id_created_at_idx" ON "blocker_events"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_project_id_workspace_id_fkey" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_assignees" ADD CONSTRAINT "todo_assignees_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_daily_plans" ADD CONSTRAINT "todo_daily_plans_todo_id_workspace_id_fkey" FOREIGN KEY ("todo_id", "workspace_id") REFERENCES "todos"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_daily_plans" ADD CONSTRAINT "todo_daily_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_progress_logs" ADD CONSTRAINT "todo_progress_logs_todo_id_workspace_id_fkey" FOREIGN KEY ("todo_id", "workspace_id") REFERENCES "todos"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_progress_logs" ADD CONSTRAINT "todo_progress_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocker_todos" ADD CONSTRAINT "blocker_todos_blocker_id_workspace_id_fkey" FOREIGN KEY ("blocker_id", "workspace_id") REFERENCES "blockers"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocker_todos" ADD CONSTRAINT "blocker_todos_todo_id_workspace_id_fkey" FOREIGN KEY ("todo_id", "workspace_id") REFERENCES "todos"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocker_events" ADD CONSTRAINT "blocker_events_blocker_id_workspace_id_fkey" FOREIGN KEY ("blocker_id", "workspace_id") REFERENCES "blockers"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocker_events" ADD CONSTRAINT "blocker_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
