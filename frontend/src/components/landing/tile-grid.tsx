"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import { ProjectTile } from "./project-tile";
import { NewProjectTile } from "./new-project-tile";
import { CreateProjectDialog } from "./create-project-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export function TileGrid() {
  const { projects, refetch } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {projects.length === 0 ? (
        <EmptyState
          title="No migration projects"
          description="Create a new project to start migrating ABAP objects."
        />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((project) => (
          <ProjectTile key={project.id} project={project} />
        ))}
        <NewProjectTile onClick={() => setDialogOpen(true)} />
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={refetch}
      />
    </>
  );
}
