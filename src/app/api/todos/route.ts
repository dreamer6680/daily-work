import { NextRequest, NextResponse } from "next/server";
import { ProgressEventType, Priority, TodoStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "任务名称不能为空").max(200),
  description: z.string().max(10000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(TodoStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  currentProgressTitle: z.string().max(200).optional().nullable(),
  currentProgressNote: z.string().max(10000).optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
});

export async function GET() {
  try {
    const { user, workspace, role } = await getDemoContext();
    const todos = await prisma.todo.findMany({
      where: { workspaceId: workspace.id, deletedAt: null, ...(role === "OWNER" || role === "ADMIN" ? {} : { OR: [{ projectId: null }, { project: { members: { none: {} } } }, { project: { members: { some: { userId: user.id } } } }] }) },
      include: { project: { select: { id: true, name: true, color: true } }, assignees: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ data: todos });
  } catch (error) {
    console.error("[GET /api/todos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "读取待办失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTodoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "请求参数不正确" },
        { status: 400 },
      );
    }

    const { user, workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能修改待办" }, { status: 403 });
    const input = parsed.data;
    const assigneeIds = [...new Set(input.assigneeIds ?? [])];
    if (assigneeIds.length) {
      const validMembers = await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, userId: { in: assigneeIds } } });
      if (validMembers !== assigneeIds.length) return NextResponse.json({ error: "负责人必须是当前工作空间成员" }, { status: 400 });
    }

    if (input.projectId) {
      const access = await getProjectAccess(input.projectId, workspace.id, user.id, role);
      if (!access.exists) return NextResponse.json({ error: "所选项目不存在" }, { status: 400 });
      if (!access.canWrite) return NextResponse.json({ error: "你没有在该项目创建任务的权限" }, { status: 403 });
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "所选项目不存在" }, { status: 400 });
      }
    }

    const todo = await prisma.$transaction(async (tx) => {
      const created = await tx.todo.create({
        data: {
          workspaceId: workspace.id,
          projectId: input.projectId ?? null,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "TODO",
          priority: input.priority ?? "NORMAL",
          currentProgressTitle: input.currentProgressTitle ?? null,
          currentProgressNote: input.currentProgressNote ?? null,
          createdById: user.id,
          updatedById: user.id,
        },
        include: { project: { select: { id: true, name: true, color: true } } },
      });

      if (assigneeIds.length) {
        await tx.todoAssignee.createMany({ data: assigneeIds.map((userId) => ({ todoId: created.id, userId, assignedById: user.id })) });
      }

      await tx.todoProgressLog.create({
        data: {
          workspaceId: workspace.id,
          todoId: created.id,
          authorId: user.id,
          eventType: ProgressEventType.CREATED,
          toStatus: created.status,
          progressTitle: created.currentProgressTitle,
          progressNote: created.currentProgressNote,
          metadata: { title: created.title },
        },
      });

      return tx.todo.findUniqueOrThrow({ where: { id: created.id }, include: { project: { select: { id: true, name: true, color: true } }, assignees: { include: { user: { select: { id: true, name: true, email: true } } } } } });
    });

    return NextResponse.json({ data: todo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/todos]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "创建待办失败" }, { status: 500 });
  }
}
