import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const schema = z.object({ role: z.enum(["ADMIN", "MEMBER", "VIEWER"]) });
type RouteContext = { params: Promise<{ userId: string }> };
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: actorRole } = await getDemoContext();
    const { userId } = await context.params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "成员角色无效" }, { status: 400 });
    const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId } } });
    if (!target) return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    if (target.role === WorkspaceRole.OWNER) return NextResponse.json({ error: "不能修改所有者角色" }, { status: 403 });
    if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.ADMIN) return NextResponse.json({ error: "没有修改成员权限" }, { status: 403 });
    if (actorRole === WorkspaceRole.ADMIN && (target.role === WorkspaceRole.ADMIN || parsed.data.role === WorkspaceRole.ADMIN)) return NextResponse.json({ error: "管理员不能管理其他管理员" }, { status: 403 });
    if (user.id === userId) return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
    await prisma.workspaceMember.update({ where: { workspaceId_userId: { workspaceId: workspace.id, userId } }, data: { role: parsed.data.role } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[PATCH /api/workspaces/members/:userId]", error);
    return NextResponse.json({ error: "修改成员角色失败" }, { status: 500 });
  }
}
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, workspace, role: actorRole } = await getDemoContext();
    const { userId } = await context.params;
    const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId } } });
    if (!target) return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.ADMIN) return NextResponse.json({ error: "没有移除成员的权限" }, { status: 403 });
    if (target.role === WorkspaceRole.OWNER) return NextResponse.json({ error: "不能移除工作空间所有者" }, { status: 403 });
    if (actorRole === WorkspaceRole.ADMIN && target.role === WorkspaceRole.ADMIN) return NextResponse.json({ error: "管理员不能移除其他管理员" }, { status: 403 });
    if (user.id === userId) return NextResponse.json({ error: "请联系所有者移除你的成员身份" }, { status: 400 });
    await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: workspace.id, userId } } });
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[DELETE /api/workspaces/members/:userId]", error);
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 });
  }
}