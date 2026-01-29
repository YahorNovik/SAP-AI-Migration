import { create } from "zustand";
import type { ActivityLog } from "@/types/project";

interface MigrationStore {
  isRunning: boolean;
  isPaused: boolean;
  activities: ActivityLog[];
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setActivities: (activities: ActivityLog[]) => void;
  addActivity: (activity: ActivityLog) => void;
}

export const useMigrationStore = create<MigrationStore>((set) => ({
  isRunning: false,
  isPaused: false,
  activities: [],
  setRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused }),
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) =>
    set((state) => ({ activities: [activity, ...state.activities] })),
}));
