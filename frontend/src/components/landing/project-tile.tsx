"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressIndicator } from "@/components/shared/progress-indicator";
import { SapIcon } from "@/components/shared/sap-icon";
import { OBJECT_TYPE_LABELS } from "@/lib/constants";
import type { Project } from "@/types/project";

interface ProjectTileProps {
  project: Project;
}

export function ProjectTile({ project }: ProjectTileProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <SapIcon
                objtype={project.objtype}
                className="text-blue-600 shrink-0"
                size={18}
              />
              <span className="text-xs text-muted-foreground">
                {OBJECT_TYPE_LABELS[project.objtype] ?? project.objtype}
              </span>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <h3 className="font-semibold text-sm truncate mb-1">
            {project.name}
          </h3>

          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {project.description}
            </p>
          )}

          <ProgressIndicator
            migrated={project.migratedCount ?? 0}
            total={project.totalCount ?? 0}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
