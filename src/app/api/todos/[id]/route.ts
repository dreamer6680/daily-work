import { NextRequest, NextResponse } from "next/server";
import { ProgressEventType, Priority, TodoStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(TodoStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  currentProgressTitle: z.string().max(200).optional().nullable(),
  currentProgressNote: z.string().max(10000).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace } = await getDemoContext();
    const todo = await prisma.todo.findFirst({
      where: { id, workspaceId: workspace.id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, color: true } },
        progressLogs: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!todo) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: todo });
  } catch (error) {
    console.error("[GET /api/todos/:id]", error);
    return NextResponse.json({ error: "读取待办详情失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = updateTodoSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "请求参数不正确" },
        { status: 400 },
      );
    }

    const { user, workspace } = await getDemoContext();
    const existing = await prisma.todo.findFirst({
      where: { id, workspaceId: workspace.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    const input = parsed.data;
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "所选项目不存在" }, { status: 400 });
      }
    }

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const progressChanged =
      (input.currentProgressTitle !== undefined &&
        input.currentProgressTitle !== existing.currentProgressTitle) ||
      (input.currentProgressNote !== undefined &&
        input.currentProgressNote !== existing.currentProgressNote);

    const updated = await prisma.$transaction(async (tx) => {
      const todo = await tx.todo.update({
        where: { id },
        data: {
          ...input,
          updatedById: user.id,
          completedAt:
            input.status === "DONE"
              ? existing.completedAt ?? new Date()
              : input.status && existing.status === "DONE"
                ? null
                : undefined,
        },
        include: { project: { select: { id: true, name: true, color: true } } },
      });

      if (statusChanged) {
        const eventType =
          input.status === "DONE"
            ? ProgressEventType.COMPLETED
            : existing.status === "DONE"
              ? ProgressEventType.REOPENED
              : ProgressEventType.STATUS_CHANGED;

        await tx.todoProgressLog.create({
          data: {
            workspaceId: workspace.id,
            todoId: id,
            authorId: user.id,
            eventType,
            fromStatus: existing.status,
            toStatus: todo.status,
            progressTitle: todo.currentProgressTitle,
            progressNote: todo.currentProgressNote,
          },
        });
      }

      if (progressChanged) {
        await tx.todoProgressLog.create({
          data: {
            workspaceId: workspace.id,
            todoId: id,
            authorId: user.id,
            eventType: ProgressEventType.PROGRESS_UPDATED,
            fromStatus: existing.status,
            toStatus: todo.status,
            progressTitle: todo.currentProgressTitle,
            progressNote: todo.currentProgressNote,
          },
        });
      }

      return todo;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/todos/:id]", error);
    return NextResponse.json({ error: "更新待办失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, workspace } = await getDemoContext();
    const existing = await prisma.todo.findFirst({
      where: { id, workspaceId: workspace.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    await prisma.todo.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/todos/:id]", error);
    return NextResponse.json({ error: "删除待办失败" }, { status: 500 });
  }
}
