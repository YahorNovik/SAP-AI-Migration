import { z } from "zod";
import type { NodeParents } from "abap-adt-api";
import { isNodeParent } from "abap-adt-api";
import { BaseHandler } from "./base-handler.js";

export class SearchHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_search_object",
      {
        description:
          "Search for ABAP objects by name pattern. Returns matching objects with their type, URI, and package. " +
          "Use objType to filter by object type (e.g., 'PROG', 'CLAS', 'FUGR').",
        inputSchema: {
          query: z
            .string()
            .describe(
              "Search query string. Case sensitive in older systems, no wildcard added automatically."
            ),
          objType: z
            .string()
            .optional()
            .describe(
              "Object type filter, e.g. 'PROG', 'CLAS', 'FUGR', 'INTF'. Only the first part is used."
            ),
          max: z
            .number()
            .optional()
            .default(100)
            .describe("Maximum number of results to return (default 100)."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const results = await client.searchObject(
            args.query,
            args.objType,
            args.max
          );
          return this.success({
            count: results.length,
            results,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_node_contents",
      {
        description:
          "Get the contents (child nodes) of a package or object in the ABAP repository tree. " +
          "Use this to browse the object hierarchy. parent_type must be one of: DEVC/K, PROG/P, FUGR/F, PROG/PI.",
        inputSchema: {
          parent_type: z
            .string()
            .describe(
              "Parent node type: 'DEVC/K' (package), 'PROG/P' (program), 'FUGR/F' (function group), or 'PROG/PI' (program include)."
            ),
          parent_name: z
            .string()
            .optional()
            .describe("Parent object name. Omit for root-level contents."),
          user_name: z.string().optional().describe("Filter by user name."),
          parent_tech_name: z
            .string()
            .optional()
            .describe("Technical name of the parent."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          if (!isNodeParent(args.parent_type)) {
            return this.failure(
              new Error(
                `Invalid parent_type: ${args.parent_type}. Must be one of: DEVC/K, PROG/P, FUGR/F, PROG/PI`
              )
            );
          }
          const client = await this.clientManager.ensureLoggedIn();
          const result = await client.nodeContents(
            args.parent_type as NodeParents,
            args.parent_name,
            args.user_name,
            args.parent_tech_name
          );
          return this.success(result);
        });
      }
    );

    this.server.registerTool(
      "sap_object_structure",
      {
        description:
          "Get the detailed structure of an ABAP object, including metadata, links, and (for classes) includes. " +
          "The objectUrl is typically obtained from search results or node contents.",
        inputSchema: {
          objectUrl: z
            .string()
            .describe(
              "The ADT URI of the object, e.g. '/sap/bc/adt/programs/programs/zmy_program'."
            ),
          version: z
            .enum(["active", "inactive", "workingArea"])
            .optional()
            .describe(
              "Object version to retrieve. Defaults to active version."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const result = await client.objectStructure(
            args.objectUrl,
            args.version
          );
          return this.success(result);
        });
      }
    );

    this.server.registerTool(
      "sap_find_object_path",
      {
        description:
          "Find the full path of an ABAP object in the repository tree. " +
          "Returns the hierarchy of packages/folders from root to the object.",
        inputSchema: {
          objectUrl: z.string().describe("The ADT URI of the object."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const path = await client.findObjectPath(args.objectUrl);
          return this.success(path);
        });
      }
    );

    this.server.registerTool(
      "sap_object_types",
      {
        description:
          "List all available ABAP object types in the system. " +
          "Returns type descriptors with name, description, and usage information.",
      },
      async () => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const types = await client.objectTypes();
          return this.success(types);
        });
      }
    );
  }
}
