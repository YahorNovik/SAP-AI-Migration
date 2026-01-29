"use client";

import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/stores/project-store";

export function useProjects() {
  const { projects, filter, setProjects } = useProjectStore();

  const fetchProjects = useCallback(async () => {
    const url = filter ? `/api/projects?status=${filter}` : "/api/projects";
    const res = await fetch(url);
    const data = await res.json();
    setProjects(data);
  }, [filter, setProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, refetch: fetchProjects };
}
