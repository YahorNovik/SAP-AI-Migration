import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class AtcHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_atc_run",
      {
        description:
          "Run ATC (ABAP Test Cockpit) checks on an activated object and return all findings. " +
          "Combines creating an ATC run and fetching the worklist results in a single call. " +
          "Use this after sap_activate to check for Clean Core compliance. " +
          "Priority 1 findings must be fixed; priority 2 and 3 should be fixed if possible.",
        inputSchema: {
          objectUrl: z
            .string()
            .describe(
              "ADT URI of the object to check, e.g. '/sap/bc/adt/programs/programs/zmy_report'."
            ),
          variant: z
            .string()
            .optional()
            .default("DEFAULT")
            .describe(
              "ATC check variant to use. Defaults to 'DEFAULT' (the system default variant)."
            ),
          maxResults: z
            .number()
            .optional()
            .default(100)
            .describe(
              "Maximum number of findings to return. Defaults to 100."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();

          // 1. Create ATC run
          const runResult = await client.createAtcRun(
            args.variant,
            args.objectUrl,
            args.maxResults
          );

          // 2. Fetch worklist with findings
          const worklist = await client.atcWorklists(
            runResult.id,
            runResult.timestamp,
            runResult.id,
            false
          );

          // 3. Flatten findings across all objects
          const findings = worklist.objects.flatMap((obj) =>
            obj.findings.map((f) => ({
              priority: f.priority,
              checkId: f.checkId,
              checkTitle: f.checkTitle,
              messageId: f.messageId,
              messageTitle: f.messageTitle,
              location: {
                uri: f.location.uri,
                startLine: f.location.range.start.line,
                startColumn: f.location.range.start.column,
                endLine: f.location.range.end.line,
                endColumn: f.location.range.end.column,
              },
              exemptionApproval: f.exemptionApproval,
              exemptionKind: f.exemptionKind,
              objectName: obj.name,
              objectType: obj.type,
            }))
          );

          // 4. Compute summary counts
          const priority1 = findings.filter((f) => f.priority === 1);
          const priority2 = findings.filter((f) => f.priority === 2);
          const priority3 = findings.filter((f) => f.priority === 3);

          return this.success({
            runId: runResult.id,
            totalFindings: findings.length,
            priority1Count: priority1.length,
            priority2Count: priority2.length,
            priority3Count: priority3.length,
            hasCriticalFindings: priority1.length > 0,
            findings,
            nextStep: priority1.length > 0
              ? "Critical ATC findings (priority 1) detected. You MUST fix these: " +
                "update the source with sap_write_and_check (reuse lockHandle), " +
                "re-activate with sap_activate, then re-run sap_atc_run."
              : priority2.length > 0 || priority3.length > 0
                ? "Non-critical ATC findings detected (priority 2/3). " +
                  "Attempt to fix them if possible, then re-run sap_atc_run. " +
                  "If you cannot resolve them, proceed to sap_unlock."
                : "No ATC findings. Code is clean. Proceed to sap_unlock.",
          });
        });
      }
    );

    this.server.registerTool(
      "sap_atc_customizing",
      {
        description:
          "Get ATC (ABAP Test Cockpit) customizing information, including " +
          "available check properties and exemption types.",
      },
      async () => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const customizing = await client.atcCustomizing();
          return this.success(customizing);
        });
      }
    );
  }
}
