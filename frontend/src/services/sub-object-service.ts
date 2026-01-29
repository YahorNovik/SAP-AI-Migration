import { prisma } from "@/lib/db";

export const subObjectService = {
  async listByProject(projectId: string) {
    return prisma.subObject.findMany({
      where: { projectId },
      orderBy: [{ objectOrder: "asc" }, { order: "asc" }],
    });
  },

  async update(
    subId: string,
    data: { status?: string; migratedSource?: string; originalSource?: string }
  ) {
    return prisma.subObject.update({
      where: { id: subId },
      data,
    });
  },

  async toggleExcluded(subId: string, excluded: boolean) {
    return prisma.subObject.update({
      where: { id: subId },
      data: { excluded },
    });
  },
};
