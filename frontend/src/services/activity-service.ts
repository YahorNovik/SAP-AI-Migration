import { prisma } from "@/lib/db";

export const activityService = {
  async listByProject(projectId: string, subObjectId?: string) {
    return prisma.activityLog.findMany({
      where: {
        projectId,
        ...(subObjectId ? { subObjectId } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  },

  async create(
    projectId: string,
    type: string,
    content: string,
    subObjectId?: string
  ) {
    return prisma.activityLog.create({
      data: { projectId, type, content, subObjectId },
    });
  },
};
