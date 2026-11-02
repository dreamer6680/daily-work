import { NextResponse } from "next/server";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { workspace } = await getDemoContext();
    const existing = await prisma.todoDailyPlan.findFirst({
      where: { id, workspaceId: workspace.id }, select: { id: true }
    });
    if (!existing) return NextResponse.json({ error: "每日计划不存在" }, { status: 404 });
    await prisma.todoDailyPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/daily-plans/:id]", error);
    return NextResponse.json({ error: "移除每日计划失败" }, { status: 500 });
  }
}
