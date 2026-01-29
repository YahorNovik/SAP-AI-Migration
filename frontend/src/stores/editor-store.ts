import { create } from "zustand";
import type { SubObject } from "@/types/project";

interface EditorStore {
  activeSubObject: SubObject | null;
  localMigratedSource: string;
  isDirty: boolean;
  setActiveSubObject: (sub: SubObject | null) => void;
  setLocalMigratedSource: (source: string) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  activeSubObject: null,
  localMigratedSource: "",
  isDirty: false,
  setActiveSubObject: (sub) =>
    set({
      activeSubObject: sub,
      localMigratedSource: sub?.migratedSource ?? "",
      isDirty: false,
    }),
  setLocalMigratedSource: (source) =>
    set({ localMigratedSource: source, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
