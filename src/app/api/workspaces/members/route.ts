import { NextRequest, NextResponse } from "next/server";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const schema = z.object({ email: z.string().trim().email().max(255), role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER") });
export async function GET() {
  try {
    const { user, workspace, role } = await getDemoContext();
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return NextResponse.json({ data: { currentUserId: user.id, currentRole: role, members: members.map(({ user, role: memberRole, joinedAt }) => ({ id: user.id, name: user.name, email: user.email, role: memberRole, joinedAt })) } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[GET /api/workspaces/members]", error);
    return NextResponse.json({ error: "读取成员失败" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { workspace, role: actorRole } = await getDemoContext();
    if (actorRole !== WorkspaceRole.OWNER && actorRole !== WorkspaceRole.ADMIN) return NextResponse.json({ error: "没有添加成员的权限" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请输入有效邮箱和角色" }, { status: 400 });
    if (actorRole === WorkspaceRole.ADMIN && parsed.data.role === "ADMIN") return NextResponse.json({ error: "管理员不能新增管理员" }, { status: 403 });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "该邮箱尚未注册，请让对方先注册账户" }, { status: 404 });
    const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } } });
    if (existing) return NextResponse.json({ error: "该用户已经是工作空间成员" }, { status: 409 });
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: parsed.data.role } });
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/workspaces/members]", error);
    return NextResponse.json({ error: "添加成员失败" }, { status: 500 });
  }
}