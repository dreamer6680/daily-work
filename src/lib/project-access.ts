import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getProjectAccess(projectId: string, workspaceId: string, userId: string, workspaceRole: WorkspaceRole) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    include: { _count: { select: { members: true } }, members: { where: { userId }, select: { role: true } } },
  });
  if (!project) return { exists: false, canRead: false, canWrite: false, canManage: false, role: null };
  const elevated = workspaceRole === "OWNER" || workspaceRole === "ADMIN";
  const memberRole = project.members[0]?.role ?? null;
  const unrestricted = project._count.members === 0;
  const canRead = elevated || unrestricted || memberRole !== null;
  const canWrite = elevated || unrestricted || memberRole === "MANAGER" || memberRole === "MEMBER";
  const canManage = elevated || (memberRole === "MANAGER") || (unrestricted && project.createdById === userId);
  return { exists: true, canRead, canWrite, canManage, role: memberRole, project };
}
