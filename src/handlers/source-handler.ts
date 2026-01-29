import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class SourceHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_get_source",
      {
        description:
          "Retrieve the source code of an ABAP object. " +
          "The sourceUrl can be found in the object structure (metaData['abapsource:sourceUri'] or links). " +
          "Optionally specify a version (active, inactive, workingArea).",
        inputSchema: {
          objectSourceUrl: z
            .string()
            .describe(
              "Source URL of the ABAP object, e.g. '/sap/bc/adt/programs/programs/zmy_program/source/main'."
            ),
          version: z
            .enum(["active", "inactive", "workingArea"])
            .optional()
            .describe("Object version to retrieve. Defaults to active."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const source = await client.getObjectSource(args.objectSourceUrl, {
            version: args.version,
          });
          return this.success(source);
        });
      }
    );

    this.server.registerTool(
      "sap_set_source",
      {
        description:
          "Write/update the source code of an ABAP object. " +
          "Requires an active lock (use sap_lock first to get the lockHandle). " +
          "Optionally specify a transport request number.",
        inputSchema: {
          objectSourceUrl: z
            .string()
            .describe(
              "Source URL of the ABAP object, e.g. '/sap/bc/adt/programs/programs/zmy_program/source/main'."
            ),
          source: z.string().describe("The new ABAP source code to write."),
          lockHandle: z
            .string()
            .describe("Lock handle obtained from sap_lock."),
          transport: z
            .string()
            .optional()
            .describe("Transport request number, e.g. 'DEVK900123'."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          await client.setObjectSource(
            args.objectSourceUrl,
            args.source,
            args.lockHandle,
            args.transport
          );
          return this.success({
            message: "Source code updated successfully",
            objectSourceUrl: args.objectSourceUrl,
          });
        });
      }
    );
  }
}
