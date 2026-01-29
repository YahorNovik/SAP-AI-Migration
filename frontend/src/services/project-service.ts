import { prisma } from "@/lib/db";
import type { CreateProjectInput } from "@/types/project";

export const projectService = {
  async list(status?: string) {
    const projects = await prisma.project.findMany({
      where: status ? { status } : undefined,
      include: {
        subObjects: { select: { id: true, status: true } },
        sourceSystem: { select: { id: true, name: true } },
        targetSystem: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return projects.map((p) => ({
      ...p,
      migratedCount: p.subObjects.filter(
        (s) => s.status === "migrated" || s.status === "activated"
      ).length,
      totalCount: p.subObjects.length,
    }));
  },

  async getById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        subObjects: { orderBy: [{ objectOrder: "asc" }, { order: "asc" }] },
        activityLogs: { orderBy: { timestamp: "desc" }, take: 100 },
        sourceSystem: { select: { id: true, name: true } },
        targetSystem: { select: { id: true, name: true } },
      },
    });
  },

  async create(input: CreateProjectInput) {
    return prisma.project.create({
      data: {
        name: input.name,
        objtype: input.objtype,
        parentName: input.parentName,
        parentPath: input.parentPath,
        description: input.description,
        transport: input.transport || null,
        migrationRules: input.migrationRules || "",
        sourceSystemId: input.sourceSystemId || null,
        targetSystemId: input.targetSystemId || null,
      },
    });
  },

  async update(id: string, data: Partial<CreateProjectInput> & { status?: string }) {
    return prisma.project.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};
