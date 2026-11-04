import { NextRequest, NextResponse } from "next/server";
import { BlockerEventType, BlockerSeverity, BlockerStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(1, "阻塞标题不能为空").max(200),
  description: z.string().max(10000).optional().nullable(),
  cause: z.string().max(10000).optional().nullable(),
  impact: z.string().max(10000).optional().nullable(),
  severity: z.nativeEnum(BlockerSeverity).default(BlockerSeverity.MEDIUM),
  ownerId: z.string().uuid().optional().nullable(),
  todoIds: z.array(z.string().uuid()).max(50).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { user, workspace, role } = await getDemoContext();
    const query = request.nextUrl.searchParams;
    const status = query.get("status");
    const severity = query.get("severity");
    const where = {
      workspaceId: workspace.id,
      ...(status && status !== "ALL" && Object.values(BlockerStatus).includes(status as BlockerStatus) ? { status: status as BlockerStatus } : {}),
      ...(severity && severity !== "ALL" && Object.values(BlockerSeverity).includes(severity as BlockerSeverity) ? { severity: severity as BlockerSeverity } : {}),
    };
    const blockers = await prisma.blocker.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        todoLinks: { where: { todo: { deletedAt: null, ...(role === "OWNER" || role === "ADMIN" ? {} : { OR: [{ projectId: null }, { project: { members: { none: {} } } }, { project: { members: { some: { userId: user.id } } } }] }) } }, include: { todo: { select: { id: true, title: true, status: true } } } },
        events: { orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ data: blockers });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[GET /api/blockers]", error);
    return NextResponse.json({ error: "读取阻塞问题失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能创建阻塞问题" }, { status: 403 });
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    const input = parsed.data;
    const todoIds = [...new Set(input.todoIds)];
    if (input.ownerId) {
      const owner = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: input.ownerId } }, select: { userId: true } });
      if (!owner) return NextResponse.json({ error: "处理负责人必须是当前工作空间成员" }, { status: 400 });
    }
    if (todoIds.length) {
      const linkedTodos = await prisma.todo.findMany({ where: { id: { in: todoIds }, workspaceId: workspace.id, deletedAt: null }, select: { id: true, projectId: true } });
      if (linkedTodos.length !== todoIds.length) return NextResponse.json({ error: "关联任务必须属于当前工作空间且未删除" }, { status: 400 });
      for (const todo of linkedTodos) {
        if (todo.projectId) {
          const access = await getProjectAccess(todo.projectId, workspace.id, user.id, role);
          if (!access.canWrite) return NextResponse.json({ error: "你没有关联该项目任务的权限" }, { status: 403 });
        }
      }
    }
    const blocker = await prisma.$transaction(async (tx) => {
      const created = await tx.blocker.create({
        data: {
          workspaceId: workspace.id,
          title: input.title,
          description: input.description ?? null,
          cause: input.cause ?? null,
          impact: input.impact ?? null,
          severity: input.severity,
          ownerId: input.ownerId ?? null,
          reportedById: user.id,
        },
      });
      if (todoIds.length) {
        await tx.blockerTodo.createMany({ data: todoIds.map((todoId) => ({ blockerId: created.id, todoId, workspaceId: workspace.id })) });
      }
      await tx.blockerEvent.create({ data: { workspaceId: workspace.id, blockerId: created.id, actorId: user.id, eventType: BlockerEventType.CREATED, content: "创建阻塞问题" } });
      return tx.blocker.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          todoLinks: { include: { todo: { select: { id: true, title: true, status: true } } } },
          events: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true, email: true } } } },
        },
      });
    });
    return NextResponse.json({ data: blocker }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/blockers]", error);
    return NextResponse.json({ error: "创建阻塞问题失败" }, { status: 500 });
  }
}
