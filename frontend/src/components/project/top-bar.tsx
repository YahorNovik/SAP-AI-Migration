"use client";

import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SapIcon } from "@/components/shared/sap-icon";
import { MigrationControls } from "./migration-controls";
import { OBJECT_TYPE_LABELS } from "@/lib/constants";
import type { Project } from "@/types/project";

interface TopBarProps {
  project: Project;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function TopBar({ project, onStart, onPause, onResume }: TopBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b bg-white">
      <SapIcon objtype={project.objtype} className="text-blue-600" size={24} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg truncate">{project.name}</h1>
          <span className="text-xs text-muted-foreground">
            {OBJECT_TYPE_LABELS[project.objtype] ?? project.objtype}
          </span>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground truncate">
            {project.description}
          </p>
        )}
      </div>

      {(project.sourceSystem || project.targetSystem) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded px-2 py-1">
          <span className="font-medium">
            {project.sourceSystem?.name ?? "—"}
          </span>
          <ArrowRight size={12} />
          <span className="font-medium">
            {project.targetSystem?.name ?? "—"}
          </span>
        </div>
      )}

      <ProgressIndicator
        migrated={project.migratedCount ?? 0}
        total={project.totalCount ?? 0}
        className="w-48 ml-auto"
      />

      <StatusBadge status={project.status} />

      <MigrationControls
        status={project.status}
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
      />
    </div>
  );
}
