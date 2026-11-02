import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const datePattern = /^\\d{4}-\\d{2}-\\d{2}$/;
function parseDate(value: string) {
  if (!datePattern.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
const schema = z.object({
  todoId: z.string().uuid(),
  planDate: z.string().regex(datePattern, "日期格式必须为 YYYY-MM-DD"),
  planNote: z.string().max(10000).nullable().optional(),
  actualNote: z.string().max(10000).nullable().optional(),
  plannedMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  actualMinutes: z.number().int().min(0).max(1440).nullable().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getDemoContext();
    const value = request.nextUrl.searchParams.get("date");
    if (!value) return NextResponse.json({ error: "请提供计划日期" }, { status: 400 });
    const planDate = parseDate(value);
    if (!planDate) return NextResponse.json({ error: "日期无效" }, { status: 400 });
    const data = await prisma.todoDailyPlan.findMany({
      where: { workspaceId: workspace.id, planDate },
      include: { todo: { select: { id: true, title: true, status: true, project: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/daily-plans]", error);
    return NextResponse.json({ error: "读取每日计划失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请求参数不正确" }, { status: 400 });
    const { user, workspace } = await getDemoContext();
    const input = parsed.data;
    const planDate = parseDate(input.planDate);
    if (!planDate) return NextResponse.json({ error: "日期无效" }, { status: 400 });
    const todo = await prisma.todo.findFirst({
      where: { id: input.todoId, workspaceId: workspace.id, deletedAt: null }, select: { id: true }
    });
    if (!todo) return NextResponse.json({ error: "关联任务不存在" }, { status: 404 });
    const data = await prisma.todoDailyPlan.upsert({
      where: { todoId_planDate: { todoId: input.todoId, planDate } },
      create: {
        workspaceId: workspace.id, todoId: input.todoId, planDate, creatorId: user.id,
        planNote: input.planNote?.trim() || null, actualNote: input.actualNote?.trim() || null,
        plannedMinutes: input.plannedMinutes ?? null, actualMinutes: input.actualMinutes ?? null
      },
      update: {
        planNote: input.planNote?.trim() || null, actualNote: input.actualNote?.trim() || null,
        plannedMinutes: input.plannedMinutes ?? null, actualMinutes: input.actualMinutes ?? null
      },
      include: { todo: { select: { id: true, title: true, status: true, project: { select: { name: true } } } } }
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[POST /api/daily-plans]", error);
    return NextResponse.json({ error: "保存每日计划失败" }, { status: 500 });
  }
}
