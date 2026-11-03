import { NextRequest, NextResponse } from "next/server";
import { ProgressEventType } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const progressSchema = z.object({
  progressTitle: z.string().trim().max(200).optional().nullable(),
  progressNote: z.string().trim().max(10000).optional().nullable(),
}).refine(
  (value) => Boolean(value.progressTitle?.trim() || value.progressNote?.trim()),
  { message: "请填写进展标题或进展说明" },
);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = progressSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "请求参数不正确" },
        { status: 400 },
      );
    }

    const { user, workspace } = await getDemoContext();
    const existing = await prisma.todo.findFirst({
      where: { id, workspaceId: workspace.id, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "待办不存在" }, { status: 404 });
    }

    const progressTitle = parsed.data.progressTitle?.trim() || null;
    const progressNote = parsed.data.progressNote?.trim() || null;

    const result = await prisma.$transaction(async (tx) => {
      const todo = await tx.todo.update({
        where: { id },
        data: {
          currentProgressTitle: progressTitle,
          currentProgressNote: progressNote,
          updatedById: user.id,
        },
      });

      const log = await tx.todoProgressLog.create({
        data: {
          workspaceId: workspace.id,
          todoId: id,
          authorId: user.id,
          eventType: ProgressEventType.PROGRESS_UPDATED,
          fromStatus: existing.status,
          toStatus: todo.status,
          progressTitle,
          progressNote,
        },
        include: { author: { select: { id: true, name: true, email: true } } },
      });

      return { todo, log };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/todos/:id/progress]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "保存进展失败" }, { status: 500 });
  }
}
