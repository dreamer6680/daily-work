import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "邮箱或密码格式不正确" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({
    data: { user: { id: user.id, name: user.name, email: user.email } },
  });
  setSessionCookie(response, session.sessionToken, session.expires);
  return response;
}
