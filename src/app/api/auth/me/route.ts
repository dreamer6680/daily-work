import { NextResponse } from "next/server";
import { getDemoContext } from "@/lib/demo-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { user, workspace, role } = await getDemoContext();
    return NextResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        workspace: { id: workspace.id, name: workspace.name },
        role,
      },
    });
  } catch {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
}
