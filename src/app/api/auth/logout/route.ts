import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/demo-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { sessionToken: token } });
  const response = NextResponse.json({ data: { success: true } });
  clearSessionCookie(response);
  return response;
}
