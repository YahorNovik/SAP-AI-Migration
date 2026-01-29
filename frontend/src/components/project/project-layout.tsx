"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/use-project";
import { useSSE } from "@/hooks/use-sse";
import { useMigrationControls } from "@/hooks/use-migration-controls";
import { useMigrationStore } from "@/stores/migration-store";
import { useEditorStore } from "@/stores/editor-store";
import { TopBar } from "./top-bar";
import { SubObjectSidebar } from "./sub-object-sidebar";
import { SourcePanel } from "./source-panel";
import { MigrationPanel } from "./migration-panel";
import { BottomPanel } from "./bottom-panel";
import type { SubObject } from "@/types/project";

interface ProjectLayoutProps {
  projectId: string;
}

export function ProjectLayout({ projectId }: ProjectLayoutProps) {
  const { project, isLoading, refetch, setProject } = useProject(projectId);
  const { start, pause, resume } = useMigrationControls(projectId);
  const setActivities = useMigrationStore((s) => s.setActivities);
  const {
    activeSubObject,
    localMigratedSource,
    isDirty,
    setActiveSubObject,
    setLocalMigratedSource,
  } = useEditorStore();

  // Initialize activities from fetched project
  useEffect(() => {
    if (project?.activityLogs) {
      setActivities(project.activityLogs);
    }
  }, [project?.activityLogs, setActivities]);

  // Auto-select first sub-object
  useEffect(() => {
    if (project?.subObjects?.length && !activeSubObject) {
      setActiveSubObject(project.subObjects[0]);
    }
  }, [project?.subObjects, activeSubObject, setActiveSubObject]);

  const handleSubObjectUpdate = useCallback(
    (data: { id: string; status: string }) => {
      if (project) {
        setProject({
          ...project,
          subObjects: project.subObjects?.map((s) =>
            s.id === data.id ? { ...s, status: data.status } : s
          ),
        });
      }
    },
    [project, setProject]
  );

  const handleProjectStatus = useCallback(
    (data: { status: string }) => {
      if (project) {
        setProject({ ...project, status: data.status as typeof project.status });
        refetch();
      }
    },
    [project, setProject, refetch]
  );

  const handleDiscoveryComplete = useCallback(() => {
    refetch();
  }, [refetch]);

  useSSE(projectId, handleSubObjectUpdate, handleProjectStatus, handleDiscoveryComplete);

  async function handleStart() {
    await start();
    refetch();
  }

  async function handlePause() {
    await pause();
  }

  async function handleResume() {
    await resume();
  }

  function handleSelectSubObject(sub: SubObject) {
    setActiveSubObject(sub);
  }

  const handleToggleExclude = useCallback(
    async (sub: SubObject) => {
      const newExcluded = !sub.excluded;
      // Optimistic update
      if (project) {
        setProject({
          ...project,
          subObjects: project.subObjects?.map((s) =>
            s.id === sub.id ? { ...s, excluded: newExcluded } : s
          ),
        });
      }
      await fetch(
        `/api/projects/${projectId}/sub-objects/${sub.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excluded: newExcluded }),
        }
      );
    },
    [project, projectId, setProject]
  );

  async function handleSaveMigratedSource() {
    if (!activeSubObject) return;
    await fetch(
      `/api/projects/${projectId}/sub-objects/${activeSubObject.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ migratedSource: localMigratedSource }),
      }
    );
    useEditorStore.getState().setDirty(false);
    refetch();
  }

  if (isLoading || !project) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading project...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Back link */}
      <div className="px-4 py-1 bg-white border-b">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft size={12} />
          Back to projects
        </Link>
      </div>

      {/* Top bar */}
      <TopBar
        project={project}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
      />

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Sub-object sidebar */}
        <div className="w-64 shrink-0">
          <SubObjectSidebar
            subObjects={project.subObjects ?? []}
            activeId={activeSubObject?.id ?? null}
            onSelect={handleSelectSubObject}
            onToggleExclude={handleToggleExclude}
          />
        </div>

        {/* Code panels + bottom panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Code panels */}
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 min-w-0 border-r">
              <SourcePanel
                source={activeSubObject?.originalSource ?? ""}
              />
            </div>
            <div className="flex-1 min-w-0">
              <MigrationPanel
                source={localMigratedSource}
                isDirty={isDirty}
                onChange={setLocalMigratedSource}
                onSave={handleSaveMigratedSource}
              />
            </div>
          </div>

          {/* Bottom panel */}
          <div className="h-64 shrink-0">
            <BottomPanel projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
