import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const schema = z.object({ name: z.string().trim().min(1).max(100) });
export async function GET() {
  try {
    const { user, workspace } = await getDemoContext();
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { select: { id: true, name: true, _count: { select: { members: true } } } } },
      orderBy: { joinedAt: "asc" },
    });
    return NextResponse.json({ data: {
      currentWorkspaceId: workspace.id,
      workspaces: memberships.map(({ workspace: item, role }) => ({ id: item.id, name: item.name, role, memberCount: item._count.members })),
    }});
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[GET /api/workspaces]", error);
    return NextResponse.json({ error: "读取工作空间失败" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const { user } = await getDemoContext();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "工作空间名称不能为空" }, { status: 400 });
    const workspace = await prisma.workspace.create({
      data: { name: parsed.data.name, createdById: user.id, members: { create: { userId: user.id, role: "OWNER" } } },
      select: { id: true, name: true },
    });
    const response = NextResponse.json({ data: workspace }, { status: 201 });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append("Set-Cookie", `daily_work_workspace=${workspace.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${secure}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/workspaces]", error);
    return NextResponse.json({ error: "创建工作空间失败" }, { status: 500 });
  }
}