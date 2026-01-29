"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityEntry } from "./activity-entry";
import { useMigrationStore } from "@/stores/migration-store";

export function ActivityLog() {
  const activities = useMigrationStore((s) => s.activities);

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No activity yet. Start a migration to see progress.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {activities.map((log) => (
          <ActivityEntry key={log.id} log={log} />
        ))}
      </div>
    </ScrollArea>
  );
}
