import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  workspaceName: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请填写有效姓名、邮箱；密码至少 8 位" }, { status: 400 });
  }
  const { name, email, password, workspaceName } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash: hashPassword(password) },
      });
      await tx.workspace.create({
        data: {
          name: workspaceName || `${name}的工作空间`,
          createdById: created.id,
          members: { create: { userId: created.id, role: "OWNER" } },
        },
      });
      return created;
    });
    const session = await createSession(user.id);
    const response = NextResponse.json({
      data: { user: { id: user.id, name: user.name, email: user.email } },
    }, { status: 201 });
    setSessionCookie(response, session.sessionToken, session.expires);
    return response;
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
