import { NextRequest, NextResponse } from "next/server";
import { ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const projectSchema = z.object({
  name: z.string().trim().min(1, "项目名称不能为空").max(150),
  description: z.string().max(10000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export async function GET() {
  try {
    const { workspace } = await getDemoContext();
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id, status: { not: ProjectStatus.ARCHIVED } },
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { todos: true } } },
    });
    const activeTodos = await prisma.todo.groupBy({
      by: ["projectId", "status"],
      where: { workspaceId: workspace.id, deletedAt: null, projectId: { in: projects.map((project) => project.id) } },
      _count: { _all: true },
    });
    const stats = new Map<string, { total: number; completed: number }>();
    for (const row of activeTodos) {
      if (!row.projectId) continue;
      const current = stats.get(row.projectId) ?? { total: 0, completed: 0 };
      current.total += row._count._all;
      if (row.status === "DONE") current.completed += row._count._all;
      stats.set(row.projectId, current);
    }
    return NextResponse.json({ data: projects.map(({ _count, ...project }) => ({
      ...project,
      taskCount: stats.get(project.id)?.total ?? 0,
      completedCount: stats.get(project.id)?.completed ?? 0,
    })) });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: "读取项目失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能创建项目" }, { status: 403 });
    const parsed = projectSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    const input = parsed.data;
    const project = await prisma.project.create({
      data: { workspaceId: workspace.id, createdById: user.id, name: input.name, description: input.description ?? null, color: input.color ?? "#64748b" },
    });
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "当前工作空间已存在同名项目" }, { status: 409 });
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}
