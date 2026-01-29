import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class LockHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_lock",
      {
        description:
          "Lock an ABAP object for editing. Returns a lock handle needed for " +
          "write operations (sap_set_source, sap_delete_object). " +
          "Also returns transport info if the object is in a transportable package.",
        inputSchema: {
          objectUrl: z
            .string()
            .describe(
              "The ADT URI of the object to lock, e.g. '/sap/bc/adt/programs/programs/zmy_program'."
            ),
          accessMode: z
            .string()
            .optional()
            .describe("Lock access mode. Defaults to 'MODIFY'."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const lock = await client.lock(args.objectUrl, args.accessMode);
          return this.success({
            lockHandle: lock.LOCK_HANDLE,
            transportNumber: lock.CORRNR,
            transportUser: lock.CORRUSER,
            transportText: lock.CORRTEXT,
            isLocal: lock.IS_LOCAL,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_unlock",
      {
        description:
          "Unlock a previously locked ABAP object. " +
          "Always unlock objects after finishing edits to avoid blocking other developers.",
        inputSchema: {
          objectUrl: z
            .string()
            .describe("The ADT URI of the object to unlock."),
          lockHandle: z
            .string()
            .describe("The lock handle obtained from sap_lock."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          await client.unLock(args.objectUrl, args.lockHandle);
          return this.success({
            message: "Object unlocked successfully",
            objectUrl: args.objectUrl,
          });
        });
      }
    );
  }
}
