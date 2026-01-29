"use client";

import { useEffect, useRef } from "react";
import { useMigrationStore } from "@/stores/migration-store";

export function useSSE(
  projectId: string,
  onSubObjectUpdate?: (data: { id: string; status: string }) => void,
  onProjectStatus?: (data: { status: string }) => void,
  onDiscoveryComplete?: (data: { count: number }) => void
) {
  const addActivity = useMigrationStore((s) => s.addActivity);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/events`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "activity":
            addActivity(data.payload);
            break;
          case "sub_object_update":
            onSubObjectUpdate?.(data.payload);
            break;
          case "project_status":
            onProjectStatus?.(data.payload);
            break;
          case "discovery_complete":
            onDiscoveryComplete?.(data.payload);
            break;
        }
      } catch {
        // Ignore parse errors (heartbeat, etc.)
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [projectId, addActivity, onSubObjectUpdate, onProjectStatus, onDiscoveryComplete]);
}
