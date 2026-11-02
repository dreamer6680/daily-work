import { NextRequest, NextResponse } from "next/server";
import { ProgressEventType, Priority, TodoStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "任务名称不能为空").max(200),
  description: z.string().max(10000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(TodoStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  currentProgressTitle: z.string().max(200).optional().nullable(),
  currentProgressNote: z.string().max(10000).optional().nullable(),
});

export async function GET() {
  try {
    const { workspace } = await getDemoContext();
    const todos = await prisma.todo.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ data: todos });
  } catch (error) {
    console.error("[GET /api/todos]", error);
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

    const { user, workspace } = await getDemoContext();
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

      return created;
    });

    return NextResponse.json({ data: todo }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/todos]", error);
    return NextResponse.json({ error: "创建待办失败" }, { status: 500 });
  }
}
