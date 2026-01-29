import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class ActivationHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_activate",
      {
        description:
          "Activate an ABAP object (make inactive changes active). " +
          "Can activate by object name/URL or by providing inactive object details. " +
          "Returns activation result with any messages (errors, warnings).",
        inputSchema: {
          objectName: z
            .string()
            .describe(
              "The name of the object to activate, e.g. 'ZMY_PROGRAM'."
            ),
          objectUrl: z
            .string()
            .describe(
              "The ADT URI of the object to activate."
            ),
          mainInclude: z
            .string()
            .optional()
            .describe(
              "Main include URL for includes that belong to a larger program."
            ),
          preauditRequested: z
            .boolean()
            .optional()
            .default(true)
            .describe(
              "Whether to request pre-audit during activation. Defaults to true."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const result = await client.activate(
            args.objectName,
            args.objectUrl,
            args.mainInclude,
            args.preauditRequested
          );
          return this.success({
            success: result.success,
            messages: result.messages,
            inactiveObjects: result.inactive,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_inactive_objects",
      {
        description:
          "List all inactive ABAP objects for the current user. " +
          "Returns objects that have been modified but not yet activated.",
      },
      async () => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const objects = await client.inactiveObjects();
          return this.success({
            count: objects.length,
            objects,
          });
        });
      }
    );
  }
}
