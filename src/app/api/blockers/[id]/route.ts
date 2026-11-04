import { NextRequest, NextResponse } from "next/server";
import { BlockerEventType, BlockerSeverity, BlockerStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  cause: z.string().max(10000).optional().nullable(),
  impact: z.string().max(10000).optional().nullable(),
  severity: z.nativeEnum(BlockerSeverity).optional(),
  status: z.nativeEnum(BlockerStatus).optional(),
  ownerId: z.string().uuid().optional().nullable(),
  todoIds: z.array(z.string().uuid()).max(50).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能修改阻塞问题" }, { status: 403 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    const existing = await prisma.blocker.findFirst({ where: { id, workspaceId: workspace.id } });
    if (!existing) return NextResponse.json({ error: "阻塞问题不存在" }, { status: 404 });
    const input = parsed.data;
    if (input.ownerId) {
      const owner = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: input.ownerId } }, select: { userId: true } });
      if (!owner) return NextResponse.json({ error: "处理负责人必须是当前工作空间成员" }, { status: 400 });
    }
    const todoIds = input.todoIds === undefined ? undefined : [...new Set(input.todoIds)];
    if (todoIds) {
      const count = todoIds.length ? await prisma.todo.count({ where: { id: { in: todoIds }, workspaceId: workspace.id, deletedAt: null } }) : 0;
      if (count !== todoIds.length) return NextResponse.json({ error: "关联任务必须属于当前工作空间且未删除" }, { status: 400 });
    }
    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const ownerChanged = input.ownerId !== undefined && input.ownerId !== existing.ownerId;
    const updated = await prisma.$transaction(async (tx) => {
      const { todoIds: _todoIds, ...fields } = input;
      const blocker = await tx.blocker.update({
        where: { id },
        data: {
          ...fields,
          resolvedAt: input.status === BlockerStatus.RESOLVED
            ? existing.resolvedAt ?? new Date()
            : (input.status === BlockerStatus.OPEN || input.status === BlockerStatus.INVESTIGATING || input.status === BlockerStatus.WAITING)
              ? null
              : undefined,
        },
      });
      if (todoIds) {
        await tx.blockerTodo.deleteMany({ where: { blockerId: id, workspaceId: workspace.id } });
        if (todoIds.length) await tx.blockerTodo.createMany({ data: todoIds.map((todoId) => ({ blockerId: id, todoId, workspaceId: workspace.id })) });
      }
      if (statusChanged) {
        const reopening = existing.status === BlockerStatus.RESOLVED &&
          (input.status === BlockerStatus.OPEN || input.status === BlockerStatus.INVESTIGATING || input.status === BlockerStatus.WAITING);
        const eventType = input.status === BlockerStatus.RESOLVED
          ? BlockerEventType.RESOLVED
          : reopening
            ? BlockerEventType.REOPENED
            : BlockerEventType.STATUS_CHANGED;
        await tx.blockerEvent.create({ data: { workspaceId: workspace.id, blockerId: id, actorId: user.id, eventType, fromStatus: existing.status, toStatus: input.status } });
      }
      if (ownerChanged) {
        const [previousOwner, nextOwner] = await Promise.all([
          existing.ownerId ? tx.user.findUnique({ where: { id: existing.ownerId }, select: { name: true, email: true } }) : null,
          input.ownerId ? tx.user.findUnique({ where: { id: input.ownerId }, select: { name: true, email: true } }) : null,
        ]);
        const displayName = (person: { name: string | null; email: string | null } | null) =>
          person?.name?.trim() || person?.email || "未分配";
        await tx.blockerEvent.create({
          data: {
            workspaceId: workspace.id,
            blockerId: id,
            actorId: user.id,
            eventType: BlockerEventType.OWNER_CHANGED,
            content: `处理负责人：${displayName(previousOwner)} → ${displayName(nextOwner)}`,
          },
        });
      }
      return tx.blocker.findUniqueOrThrow({
        where: { id },
        include: {
          reportedBy: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
          todoLinks: { include: { todo: { select: { id: true, title: true, status: true } } } },
          events: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { id: true, name: true, email: true } } } },
        },
      });
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[PATCH /api/blockers/:id]", error);
    return NextResponse.json({ error: "更新阻塞问题失败" }, { status: 500 });
  }
}
