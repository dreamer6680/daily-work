import { NextResponse } from "next/server";
import { getDemoContext } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { workspace } = await getDemoContext();
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id, status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ error: "读取项目失败" }, { status: 500 });
  }
}
