import { NextRequest, NextResponse } from "next/server";
import { ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().max(10000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能修改项目" }, { status: 403 });
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      return NextResponse.json({ error: parsed.success ? "没有需要更新的内容" : parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    }
    const existing = await prisma.project.findFirst({ where: { id, workspaceId: workspace.id } });
    if (!existing) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.status === ProjectStatus.ARCHIVED ? { archivedAt: new Date() } : {}),
        ...(parsed.data.status && parsed.data.status !== ProjectStatus.ARCHIVED ? { archivedAt: null } : {}),
      },
    });
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[PATCH /api/projects/:id]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "当前工作空间已存在同名项目" }, { status: 409 });
    return NextResponse.json({ error: "更新项目失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能归档项目" }, { status: 403 });
    const { id } = await context.params;
    const existing = await prisma.project.findFirst({ where: { id, workspaceId: workspace.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const project = await prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED, archivedAt: new Date() },
    });
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[DELETE /api/projects/:id]", error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: "归档项目失败" }, { status: 500 });
  }
}
