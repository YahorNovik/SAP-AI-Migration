import { create } from "zustand";
import type { Project } from "@/types/project";

interface ProjectStore {
  projects: Project[];
  filter: string | null;
  setProjects: (projects: Project[]) => void;
  setFilter: (filter: string | null) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  filter: null,
  setProjects: (projects) => set({ projects }),
  setFilter: (filter) => set({ filter }),
  updateProject: (id, patch) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    })),
}));
