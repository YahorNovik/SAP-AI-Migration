"use client";

import { useCallback } from "react";

export function useMigrationControls(projectId: string) {
  const start = useCallback(async () => {
    await fetch(`/api/projects/${projectId}/start`, { method: "POST" });
  }, [projectId]);

  const pause = useCallback(async () => {
    await fetch(`/api/projects/${projectId}/pause`, { method: "POST" });
  }, [projectId]);

  const resume = useCallback(async () => {
    await fetch(`/api/projects/${projectId}/resume`, { method: "POST" });
  }, [projectId]);

  return { start, pause, resume };
}
