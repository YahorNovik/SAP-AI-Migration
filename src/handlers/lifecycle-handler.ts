import { z } from "zod";
import type { CreatableTypeIds, ValidateOptions } from "abap-adt-api";
import { isCreatableTypeId } from "abap-adt-api";
import { BaseHandler } from "./base-handler.js";

export class LifecycleHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_create_object",
      {
        description:
          "Create a new ABAP object (program, class, function group, etc.). " +
          "Use sap_validate_new_object first to check if the object can be created. " +
          "Common objtype values: PROG/P (program), CLAS/OC (class), INTF/OI (interface), " +
          "FUGR/F (function group), FUGR/FF (function module), DEVC/K (package), TABL/DT (table), " +
          "DTEL/DE (data element), DDLS/DF (CDS view).",
        inputSchema: {
          objtype: z
            .string()
            .describe(
              "Creatable type ID, e.g. 'PROG/P', 'CLAS/OC', 'INTF/OI', 'FUGR/F', 'DEVC/K'."
            ),
          name: z
            .string()
            .describe(
              "Object name, e.g. 'ZMY_PROGRAM'. Must follow SAP naming conventions."
            ),
          parentName: z
            .string()
            .describe("Parent package name, e.g. '$TMP' or 'ZPACKAGE'."),
          description: z
            .string()
            .describe("Object description text."),
          parentPath: z
            .string()
            .describe(
              "Parent path URI, e.g. '/sap/bc/adt/packages/%24tmp'. Use sap_find_object_path to find paths."
            ),
          responsible: z
            .string()
            .optional()
            .describe("Responsible user. Defaults to current user."),
          transport: z
            .string()
            .optional()
            .describe(
              "Transport request number. Required for non-local packages."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          if (!isCreatableTypeId(args.objtype)) {
            return this.failure(
              new Error(`Invalid object type: ${args.objtype}`)
            );
          }
          const client = await this.clientManager.ensureLoggedIn();
          await client.createObject(
            args.objtype as CreatableTypeIds,
            args.name,
            args.parentName,
            args.description,
            args.parentPath,
            args.responsible,
            args.transport
          );
          return this.success({
            message: `Object ${args.name} of type ${args.objtype} created successfully`,
            name: args.name,
            objtype: args.objtype,
            parentName: args.parentName,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_validate_new_object",
      {
        description:
          "Validate whether a new ABAP object can be created with the given parameters. " +
          "Check this before calling sap_create_object. Returns success/failure with validation messages.",
        inputSchema: {
          objtype: z
            .string()
            .describe("Object type ID, e.g. 'PROG/P', 'CLAS/OC'."),
          objname: z.string().describe("Proposed object name."),
          description: z.string().describe("Object description."),
          packagename: z
            .string()
            .describe(
              "Package name where the object will be created."
            ),
          fugrname: z
            .string()
            .optional()
            .describe(
              "Function group name (required for group types like FUGR/FF)."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const options: ValidateOptions = args.fugrname
            ? {
                objtype: args.objtype as "FUGR/FF" | "FUGR/I",
                objname: args.objname,
                description: args.description,
                fugrname: args.fugrname,
              }
            : {
                objtype: args.objtype as any,
                objname: args.objname,
                description: args.description,
                packagename: args.packagename,
              };

          const result = await client.validateNewObject(options);
          return this.success(result);
        });
      }
    );

    this.server.registerTool(
      "sap_delete_object",
      {
        description:
          "Delete an ABAP object. Requires an active lock (use sap_lock first). " +
          "Optionally specify a transport request for transportable objects.",
        inputSchema: {
          objectUrl: z
            .string()
            .describe("The ADT URI of the object to delete."),
          lockHandle: z
            .string()
            .describe("Lock handle obtained from sap_lock."),
          transport: z
            .string()
            .optional()
            .describe("Transport request number for transportable objects."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          await client.deleteObject(
            args.objectUrl,
            args.lockHandle,
            args.transport
          );
          return this.success({
            message: "Object deleted successfully",
            objectUrl: args.objectUrl,
          });
        });
      }
    );
  }
}
