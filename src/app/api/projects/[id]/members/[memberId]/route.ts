import { NextRequest, NextResponse } from "next/server";
import { ProjectMemberRole, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-access";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string; memberId: string }> };
const schema = z.object({ role: z.nativeEnum(ProjectMemberRole) });

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: workspaceRole } = await getDemoContext();
    const { id, memberId } = await context.params;
    const access = await getProjectAccess(id, workspace.id, user.id, workspaceRole);
    if (!access.exists) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    if (!access.canManage) return NextResponse.json({ error: "没有管理项目成员的权限" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "项目角色不正确" }, { status: 400 });
    if (workspaceRole !== WorkspaceRole.OWNER && workspaceRole !== WorkspaceRole.ADMIN && parsed.data.role === ProjectMemberRole.MANAGER) return NextResponse.json({ error: "只有工作空间管理员可以指定项目负责人" }, { status: 403 });
    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: id, userId: memberId } } });
    if (!existing) return NextResponse.json({ error: "项目成员不存在" }, { status: 404 });
    if (existing.role === ProjectMemberRole.MANAGER && parsed.data.role !== ProjectMemberRole.MANAGER) {
      const managers = await prisma.projectMember.count({ where: { projectId: id, role: ProjectMemberRole.MANAGER } });
      if (managers <= 1) return NextResponse.json({ error: "项目至少需要保留一名负责人" }, { status: 400 });
    }
    await prisma.projectMember.update({ where: { projectId_userId: { projectId: id, userId: memberId } }, data: { role: parsed.data.role } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[PATCH /api/projects/:id/members/:memberId]", error);
    return NextResponse.json({ error: "更新项目角色失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: workspaceRole } = await getDemoContext();
    const { id, memberId } = await context.params;
    const access = await getProjectAccess(id, workspace.id, user.id, workspaceRole);
    if (!access.exists) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    if (!access.canManage) return NextResponse.json({ error: "没有管理项目成员的权限" }, { status: 403 });
    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: id, userId: memberId } } });
    if (!existing) return NextResponse.json({ error: "项目成员不存在" }, { status: 404 });
    if (existing.role === ProjectMemberRole.MANAGER) {
      const managers = await prisma.projectMember.count({ where: { projectId: id, role: ProjectMemberRole.MANAGER } });
      if (managers <= 1) return NextResponse.json({ error: "项目至少需要保留一名负责人" }, { status: 400 });
    }
    await prisma.projectMember.delete({ where: { projectId_userId: { projectId: id, userId: memberId } } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[DELETE /api/projects/:id/members/:memberId]", error);
    return NextResponse.json({ error: "移除项目成员失败" }, { status: 500 });
  }
}
