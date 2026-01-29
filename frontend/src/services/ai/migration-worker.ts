import { generateText, stepCountIs } from "ai";
import { prisma } from "@/lib/db";
import { subObjectService } from "../sub-object-service";
import { activityService } from "../activity-service";
import { getModel } from "./model";
import { buildMigrationSystemPrompt } from "./prompts";
import { createSapTools } from "./tool-definitions";
import type { EventBus } from "../migration-orchestrator";

interface MigrationContext {
  objectName: string;
  objectType: string;
  parentName: string;
  parentPath: string;
  transport: string | null;
  description: string;
  migrationRules: string;
}

interface MigrationResult {
  success: boolean;
  migratedSource?: string;
  error?: string;
}

export async function migrateSubObject(
  projectId: string,
  subObjectId: string,
  targetSystemId: string,
  context: MigrationContext,
  eventBus: EventBus,
  signal?: AbortSignal
): Promise<MigrationResult> {
  const sub = await prisma.subObject.findUniqueOrThrow({
    where: { id: subObjectId },
  });

  const log = async (type: string, content: string) => {
    const entry = await activityService.create(projectId, type, content, sub.id);
    eventBus.emit(projectId, "activity", entry);
  };

  // Mark in_progress
  await subObjectService.update(subObjectId, { status: "in_progress" });
  eventBus.emit(projectId, "sub_object_update", {
    id: subObjectId,
    status: "in_progress",
  });
  await log("info", `Starting migration of ${sub.name} (${sub.objtype})`);

  try {
    const model = await getModel();
    const systemPrompt = await buildMigrationSystemPrompt(
      context.migrationRules,
      {
        objectName: context.objectName,
        objectType: context.objectType,
        parentName: context.parentName,
        parentPath: context.parentPath,
        transport: context.transport,
        description: context.description,
      }
    );

    const tools = createSapTools(targetSystemId);

    const userPrompt = `Migrate the following ABAP sub-object to the target system.

Sub-object: ${sub.name} (${sub.objtype})
Target package: ${context.parentName}
Target package path: ${context.parentPath}
${context.transport ? `Transport: ${context.transport}` : "Local package ($TMP)"}

Original source code:
\`\`\`abap
${sub.originalSource}
\`\`\`

Apply the migration rules, write the code using sap_write_and_check, fix any syntax errors, activate with sap_activate, run ATC checks with sap_atc_run (fix all priority 1 findings, attempt priority 2-3), and unlock with sap_unlock.
Include the final migrated source code in your response inside an \`\`\`abap code block.`;

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(10),
      abortSignal: signal,
      onStepFinish: async (step) => {
        for (const tc of step.toolCalls) {
          await log("write", `Tool: ${tc.toolName} — ${summarizeArgs(tc.toolName, tc.input as Record<string, unknown>)}`);
        }
        for (const tr of step.toolResults) {
          const preview =
            typeof tr.output === "string"
              ? tr.output.substring(0, 300)
              : JSON.stringify(tr.output).substring(0, 300);
          await log("check", `Result (${tr.toolName}): ${preview}`);
        }
      },
    });

    const migratedSource = extractSource(result.text, sub.originalSource);

    await subObjectService.update(subObjectId, {
      status: "activated",
      migratedSource,
    });
    eventBus.emit(projectId, "sub_object_update", {
      id: subObjectId,
      status: "activated",
    });
    await log("activate", `Successfully migrated and activated ${sub.name}`);

    return { success: true, migratedSource };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (signal?.aborted) {
      await subObjectService.update(subObjectId, { status: "pending" });
      eventBus.emit(projectId, "sub_object_update", {
        id: subObjectId,
        status: "pending",
      });
      throw err;
    }

    await subObjectService.update(subObjectId, { status: "error" });
    eventBus.emit(projectId, "sub_object_update", {
      id: subObjectId,
      status: "error",
    });
    await log("error", `Migration failed for ${sub.name}: ${msg}`);

    return { success: false, error: msg };
  }
}

function summarizeArgs(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "sap_write_and_check":
      return `Writing ${args.name as string ?? "object"} (${(args.source as string)?.length ?? 0} chars)`;
    case "sap_activate":
      return `Activating ${args.objectName as string ?? "object"}`;
    case "sap_unlock":
      return "Releasing lock";
    case "sap_atc_run":
      return `Running ATC checks on ${args.objectUrl as string ?? "object"}`;
    case "sap_get_source":
      return `Reading source from ${args.objectSourceUrl as string ?? ""}`;
    default:
      return JSON.stringify(args).substring(0, 120);
  }
}

function extractSource(responseText: string, fallback: string): string {
  // Try ```abap ... ``` first
  const abapMatch = responseText.match(/```abap\s*\n([\s\S]*?)```/);
  if (abapMatch) return abapMatch[1].trim();

  // Try generic ``` ... ```
  const genericMatch = responseText.match(/```\s*\n([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();

  return fallback;
}
