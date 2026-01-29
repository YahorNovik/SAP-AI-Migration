import { projectService } from "./project-service";
import { activityService } from "./activity-service";
import { runDiscovery } from "./ai/discovery-agent";
import { migrateSubObject } from "./ai/migration-worker";

// Simple in-memory event bus for SSE
type EventCallback = (event: { type: string; payload: unknown }) => void;

export class EventBus {
  private subscribers = new Map<string, Set<EventCallback>>();

  subscribe(projectId: string, callback: EventCallback) {
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Set());
    }
    this.subscribers.get(projectId)!.add(callback);
    return () => {
      this.subscribers.get(projectId)?.delete(callback);
    };
  }

  emit(projectId: string, type: string, payload: unknown) {
    this.subscribers.get(projectId)?.forEach((cb) => cb({ type, payload }));
  }
}

export const eventBus = new EventBus();

// Track running migrations
const runningMigrations = new Map<string, AbortController>();

export const migrationOrchestrator = {
  async start(projectId: string) {
    if (runningMigrations.has(projectId)) return;

    const controller = new AbortController();
    runningMigrations.set(projectId, controller);

    try {
      await projectService.update(projectId, { status: "in_progress" });
      eventBus.emit(projectId, "project_status", { status: "in_progress" });

      const project = await projectService.getById(projectId);
      if (!project) throw new Error("Project not found");

      if (!project.sourceSystemId || !project.targetSystemId) {
        throw new Error(
          "Project must have both source and target systems configured. Go to project settings."
        );
      }

      // Phase 1: Discovery (if no sub-objects exist yet)
      const existingSubObjects = project.subObjects ?? [];
      if (existingSubObjects.length === 0) {
        await runDiscovery(
          projectId,
          project.sourceSystemId,
          project.targetSystemId!,
          eventBus,
          controller.signal
        );
      }

      controller.signal.throwIfAborted();

      // Re-fetch project to get discovered sub-objects
      const updatedProject = await projectService.getById(projectId);
      if (!updatedProject) throw new Error("Project not found after discovery");

      // Phase 2: Migration — process sub-objects in dependency order
      const pending = (updatedProject.subObjects ?? [])
        .filter((s) => !s.excluded && (s.status === "pending" || s.status === "error"))
        .sort((a, b) => {
          if (a.objectOrder !== b.objectOrder) return a.objectOrder - b.objectOrder;
          return a.order - b.order;
        });

      const migrationRules =
        (updatedProject as Record<string, unknown>).migrationRules as string ?? "";

      const context = {
        objectName: updatedProject.name,
        objectType: updatedProject.objtype,
        parentName: updatedProject.parentName,
        parentPath: updatedProject.parentPath,
        transport: updatedProject.transport,
        description: updatedProject.description,
        migrationRules,
      };

      for (const sub of pending) {
        controller.signal.throwIfAborted();

        // Check dependencies
        if (sub.dependsOn) {
          try {
            const deps = JSON.parse(sub.dependsOn) as string[];
            const allSubs = updatedProject.subObjects ?? [];
            const unmet = deps.filter((depName) => {
              const dep = allSubs.find(
                (d) => d.name.toUpperCase() === depName.toUpperCase()
              );
              return dep && !dep.excluded && dep.status !== "activated" && dep.status !== "migrated";
            });
            if (unmet.length > 0) {
              const entry = await activityService.create(
                projectId,
                "info",
                `Skipping ${sub.name}: waiting for dependencies (${unmet.join(", ")})`,
                sub.id
              );
              eventBus.emit(projectId, "activity", entry);
              continue;
            }
          } catch {
            // Invalid JSON in dependsOn, ignore
          }
        }

        // Check inter-object dependencies: all earlier object groups must be complete
        const allSubs = updatedProject.subObjects ?? [];
        const earlierIncomplete = allSubs.filter(
          (s) =>
            s.objectOrder < sub.objectOrder &&
            !s.excluded &&
            s.status !== "activated" &&
            s.status !== "migrated"
        );
        if (earlierIncomplete.length > 0) {
          const entry = await activityService.create(
            projectId,
            "info",
            `Skipping ${sub.name}: waiting for earlier objects to complete`,
            sub.id
          );
          eventBus.emit(projectId, "activity", entry);
          continue;
        }

        // Pass correct parent object context for dependency objects
        const subContext = {
          ...context,
          objectName: sub.parentObjectName || context.objectName,
          objectType: sub.parentObjectType || context.objectType,
        };

        await migrateSubObject(
          projectId,
          sub.id,
          updatedProject.targetSystemId!,
          subContext,
          eventBus,
          controller.signal
        );
      }

      // All done
      await projectService.update(projectId, { status: "completed" });
      eventBus.emit(projectId, "project_status", { status: "completed" });

      const doneLog = await activityService.create(
        projectId,
        "info",
        "Migration completed successfully. All objects activated."
      );
      eventBus.emit(projectId, "activity", doneLog);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      if (msg === "Migration paused" || controller.signal.aborted) {
        await projectService.update(projectId, { status: "paused" });
        eventBus.emit(projectId, "project_status", { status: "paused" });
        const pauseLog = await activityService.create(
          projectId,
          "info",
          "Migration paused by user."
        );
        eventBus.emit(projectId, "activity", pauseLog);
      } else {
        await projectService.update(projectId, { status: "error" });
        eventBus.emit(projectId, "project_status", { status: "error" });
        const errorLog = await activityService.create(
          projectId,
          "error",
          `Migration error: ${msg}`
        );
        eventBus.emit(projectId, "activity", errorLog);
      }
    } finally {
      runningMigrations.delete(projectId);
    }
  },

  pause(projectId: string) {
    const controller = runningMigrations.get(projectId);
    if (controller) {
      controller.abort(new Error("Migration paused"));
    }
  },

  async resume(projectId: string) {
    await this.start(projectId);
  },
};
