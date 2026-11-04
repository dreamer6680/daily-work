import { NextRequest, NextResponse } from "next/server";
import { BlockerEventType } from "@prisma/client";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ content: z.string().trim().min(1, "处理记录不能为空").max(5000) });

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, workspace, role } = await getDemoContext();
    if (role === "VIEWER") return NextResponse.json({ error: "只读成员不能添加处理记录" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    const blocker = await prisma.blocker.findFirst({ where: { id, workspaceId: workspace.id }, select: { id: true } });
    if (!blocker) return NextResponse.json({ error: "阻塞问题不存在" }, { status: 404 });
    const event = await prisma.blockerEvent.create({
      data: { workspaceId: workspace.id, blockerId: id, actorId: user.id, eventType: BlockerEventType.COMMENT, content: parsed.data.content },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    console.error("[POST /api/blockers/:id/events]", error);
    return NextResponse.json({ error: "添加处理记录失败" }, { status: 500 });
  }
}
