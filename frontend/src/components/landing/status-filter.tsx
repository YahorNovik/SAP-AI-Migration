"use client";

import { useProjectStore } from "@/stores/project-store";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "error", label: "Error" },
] as const;

export function StatusFilter() {
  const { filter, setFilter } = useProjectStore();

  return (
    <div className="flex gap-2 mb-6 flex-wrap">
      {FILTERS.map((f) => (
        <Button
          key={f.label}
          variant={filter === f.value ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
