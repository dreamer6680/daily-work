import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "daily_work_session";

export async function getDemoContext() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) throw new Error("UNAUTHORIZED");

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });
  if (!session || session.expires <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    throw new Error("UNAUTHORIZED");
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) throw new Error("WORKSPACE_NOT_FOUND");

  return { user: session.user, workspace: membership.workspace };
}

export { SESSION_COOKIE };
