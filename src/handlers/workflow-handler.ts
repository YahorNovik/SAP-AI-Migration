import { z } from "zod";
import { ADTClient, objectPath, isCreatableTypeId } from "abap-adt-api";
import type { CreatableTypeIds } from "abap-adt-api";
import { BaseHandler } from "./base-handler.js";

export class WorkflowHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_write_and_check",
      {
        description:
          "Composite tool that handles the full write-and-check loop for an ABAP object in one call. " +
          "Automatically checks if the object exists (creates it if not), locks it, writes source code, " +
          "and runs a syntax check. Returns structured results with lock handle for iterative fixing. " +
          "Workflow: call sap_write_and_check → if hasErrors, fix source and call again with same lockHandle → " +
          "when clean, call sap_activate then sap_unlock to finish.",
        inputSchema: {
          objtype: z
            .string()
            .describe(
              "Creatable type ID, e.g. 'PROG/P' (program), 'CLAS/OC' (class), 'INTF/OI' (interface), " +
              "'FUGR/F' (function group), 'TABL/DT' (table), 'DDLS/DF' (CDS view)."
            ),
          name: z
            .string()
            .describe(
              "Object name, e.g. 'ZMY_REPORT'. Must follow SAP naming conventions."
            ),
          parentName: z
            .string()
            .describe("Parent package name, e.g. '$TMP' or 'ZPACKAGE'."),
          parentPath: z
            .string()
            .describe(
              "Parent package URI, e.g. '/sap/bc/adt/packages/%24tmp'."
            ),
          description: z
            .string()
            .describe(
              "Object description (used when creating a new object)."
            ),
          source: z
            .string()
            .describe("ABAP source code to write."),
          transport: z
            .string()
            .optional()
            .describe(
              "Transport request number, e.g. 'DEVK900123'. Required for non-local packages."
            ),
          lockHandle: z
            .string()
            .optional()
            .describe(
              "Lock handle from a previous sap_write_and_check call. " +
              "Provide this to skip re-locking when iterating on syntax fixes."
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
          const typeId = args.objtype as CreatableTypeIds;

          // 1. Resolve object URL from type + name
          const objectUrl = objectPath(typeId, args.name, args.parentName);

          // 2. Check existence via searchObject, create if needed
          let created = false;
          const results = await client.searchObject(args.name, typeId, 1);
          const exactMatch = results.some(
            (r) => r["adtcore:name"]?.toUpperCase() === args.name.toUpperCase()
          );

          if (!exactMatch) {
            await client.createObject(
              typeId,
              args.name,
              args.parentName,
              args.description,
              args.parentPath,
              undefined,
              args.transport
            );
            created = true;
          }

          // 3. Get object structure to find source URL
          const structure = await client.objectStructure(objectUrl);
          const sourceUrl = ADTClient.mainInclude(structure);

          if (!sourceUrl) {
            return this.failure(
              new Error(
                `Could not determine source URL for ${args.name}. ` +
                "The object structure did not contain a main include or sourceUri."
              )
            );
          }

          // 4. Lock (or reuse existing lock handle)
          let lockHandle = args.lockHandle;
          if (!lockHandle) {
            const lock = await client.lock(objectUrl);
            lockHandle = lock.LOCK_HANDLE;
          }

          // 5. Write source
          await client.setObjectSource(
            sourceUrl,
            args.source,
            lockHandle,
            args.transport
          );

          // 6. Syntax check
          const checkResults = await client.syntaxCheck(
            sourceUrl,
            sourceUrl,
            args.source
          );

          // 7. Annotate errors with source lines for context
          const sourceLines = args.source.split("\n");
          const syntaxMessages = checkResults.map((r) => ({
            ...r,
            sourceLine:
              r.line > 0 && r.line <= sourceLines.length
                ? sourceLines[r.line - 1]
                : undefined,
          }));

          const hasErrors = syntaxMessages.some(
            (e) => e.severity === "E" || e.severity === "A"
          );

          // 8. Return structured result
          return this.success({
            created,
            objectUrl,
            sourceUrl,
            lockHandle,
            hasErrors,
            syntaxMessages,
            nextStep: hasErrors
              ? "Fix the errors in source and call sap_write_and_check again with the same lockHandle."
              : "Source is clean. Call sap_activate then sap_unlock to finish.",
          });
        });
      }
    );
  }
}
