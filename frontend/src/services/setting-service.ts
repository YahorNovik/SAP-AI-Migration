import { prisma } from "@/lib/db";

export const settingService = {
  async get(key: string): Promise<string | null> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async getAll(): Promise<Record<string, string>> {
    const settings = await prisma.setting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  },

  async setMany(entries: Record<string, string>): Promise<void> {
    await prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
  },
};
