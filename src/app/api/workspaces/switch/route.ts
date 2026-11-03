import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
const schema = z.object({ workspaceId: z.string().uuid() });
export async function POST(request: NextRequest) {
  try {
    const { user } = await getDemoContext();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "工作空间参数无效" }, { status: 400 });
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: parsed.data.workspaceId, userId: user.id } },
      select: { workspaceId: true },
    });
    if (!membership) return NextResponse.json({ error: "你不是该工作空间的成员" }, { status: 403 });
    const response = NextResponse.json({ data: { success: true } });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append("Set-Cookie", `daily_work_workspace=${membership.workspaceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${secure}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/workspaces/switch]", error);
    return NextResponse.json({ error: "切换工作空间失败" }, { status: 500 });
  }
}