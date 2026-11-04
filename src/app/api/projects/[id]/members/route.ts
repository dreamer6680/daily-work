import { NextRequest, NextResponse } from "next/server";
import { ProjectMemberRole, WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
import { getProjectAccess } from "@/lib/project-access";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ email: z.string().trim().email().max(255), role: z.enum(["MANAGER", "MEMBER", "VIEWER"]).default("MEMBER") });

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: workspaceRole } = await getDemoContext();
    const { id } = await context.params;
    const access = await getProjectAccess(id, workspace.id, user.id, workspaceRole);
    if (!access.exists) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    if (!access.canRead) return NextResponse.json({ error: "你不是该项目成员" }, { status: 403 });
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return NextResponse.json({ data: {
      members: members.map(({ user: item, role, joinedAt }) => ({ id: item.id, name: item.name, email: item.email, role, joinedAt })),
      currentUserId: user.id, currentRole: access.role, canManage: access.canManage,
      workspaceMembers: await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: "asc" } }).then(rows => rows.map(row => ({ id: row.user.id, name: row.user.name, email: row.user.email }))),
    }});
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[GET /api/projects/:id/members]", error);
    return NextResponse.json({ error: "读取项目成员失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: workspaceRole } = await getDemoContext();
    const { id } = await context.params;
    const access = await getProjectAccess(id, workspace.id, user.id, workspaceRole);
    if (!access.exists) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    if (!access.canManage) return NextResponse.json({ error: "没有管理项目成员的权限" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请输入有效邮箱和项目角色" }, { status: 400 });
    if (workspaceRole !== WorkspaceRole.OWNER && workspaceRole !== WorkspaceRole.ADMIN && parsed.data.role === "MANAGER") return NextResponse.json({ error: "只有工作空间管理员可以指定项目负责人" }, { status: 403 });
    const target = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "该邮箱尚未注册" }, { status: 404 });
    const workspaceMember = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: target.id } }, select: { userId: true } });
    if (!workspaceMember) return NextResponse.json({ error: "只能添加当前工作空间的成员" }, { status: 400 });
    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: id, userId: target.id } } });
    if (existing) return NextResponse.json({ error: "该用户已经是项目成员" }, { status: 409 });
    await prisma.$transaction(async tx => {
      const memberCount = await tx.projectMember.count({ where: { projectId: id } });
      if (memberCount === 0 && access.project?.createdById !== target.id) {
        await tx.projectMember.create({ data: { projectId: id, userId: access.project!.createdById, role: ProjectMemberRole.MANAGER } });
      }
      await tx.projectMember.create({ data: { projectId: id, userId: target.id, role: parsed.data.role } });
    });
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/projects/:id/members]", error);
    return NextResponse.json({ error: "添加项目成员失败" }, { status: 500 });
  }
}
