import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@daily-work.local";
const DEMO_WORKSPACE = "我的工作空间";

export async function getDemoContext() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Demo User" },
    create: { email: DEMO_EMAIL, name: "Demo User" },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { name: DEMO_WORKSPACE, createdById: user.id },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: DEMO_WORKSPACE,
        createdById: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
  } else {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  }

  const defaultProjects = [
    { name: "合同系统", color: "#2563eb" },
    { name: "官网", color: "#0d9488" },
    { name: "AI Agent", color: "#7c3aed" },
  ];

  for (const project of defaultProjects) {
    await prisma.project.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: project.name,
        },
      },
      update: {},
      create: {
        ...project,
        workspaceId: workspace.id,
        createdById: user.id,
      },
    });
  }

  return { user, workspace };
}
