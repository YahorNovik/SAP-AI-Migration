import { prisma } from "@/lib/db";
import type { CreateSystemInput } from "@/types/system";

const WITHOUT_PASSWORD = {
  id: true,
  name: true,
  url: true,
  user: true,
  client: true,
  language: true,
  allowUnauthorizedCerts: true,
  createdAt: true,
  updatedAt: true,
};

export const systemService = {
  async list() {
    return prisma.sapSystem.findMany({
      select: WITHOUT_PASSWORD,
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string) {
    return prisma.sapSystem.findUnique({
      where: { id },
      select: WITHOUT_PASSWORD,
    });
  },

  async getWithPassword(id: string) {
    return prisma.sapSystem.findUnique({ where: { id } });
  },

  async create(input: CreateSystemInput) {
    return prisma.sapSystem.create({
      data: {
        name: input.name,
        url: input.url,
        user: input.user,
        password: input.password,
        client: input.client ?? "",
        language: input.language ?? "EN",
        allowUnauthorizedCerts: input.allowUnauthorizedCerts ?? false,
      },
      select: WITHOUT_PASSWORD,
    });
  },

  async update(id: string, data: Partial<CreateSystemInput>) {
    return prisma.sapSystem.update({
      where: { id },
      data,
      select: WITHOUT_PASSWORD,
    });
  },

  async delete(id: string) {
    // Check if referenced by any projects
    const refCount = await prisma.project.count({
      where: {
        OR: [{ sourceSystemId: id }, { targetSystemId: id }],
      },
    });
    if (refCount > 0) {
      throw new Error(
        `Cannot delete system: it is referenced by ${refCount} project(s). Remove the system from those projects first.`
      );
    }
    return prisma.sapSystem.delete({ where: { id } });
  },
};
