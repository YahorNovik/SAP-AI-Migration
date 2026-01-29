import { tool } from "ai";
import { z } from "zod";
import { mcpClientManager } from "../mcp-client";

/**
 * Creates a set of Vercel AI SDK tools scoped to a specific SAP system.
 * Each tool delegates to the MCP server child process for that system.
 */
export function createSapTools(systemId: string) {
  return {
    sap_get_source: tool({
      description:
        "Retrieve the ABAP source code of an object from the SAP system.",
      inputSchema: z.object({
        objectSourceUrl: z
          .string()
          .describe("Source URL (e.g. /sap/bc/adt/programs/programs/zmy_prog/source/main)"),
        version: z
          .enum(["active", "inactive", "workingArea"])
          .optional()
          .describe("Object version to retrieve. Defaults to active."),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_get_source", args),
    }),

    sap_object_structure: tool({
      description:
        "Get the detailed structure of an ABAP object, including sub-objects and includes.",
      inputSchema: z.object({
        objectUrl: z.string().describe("ADT URI of the object"),
        version: z
          .enum(["active", "inactive", "workingArea"])
          .optional(),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_object_structure", args),
    }),

    sap_search_object: tool({
      description: "Search for ABAP objects by name pattern.",
      inputSchema: z.object({
        query: z.string().describe("Search query string"),
        objType: z
          .string()
          .optional()
          .describe("Object type filter (e.g. PROG, CLAS, FUGR, INTF)"),
        max: z.number().optional().describe("Max results (default 100)"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_search_object", args),
    }),

    sap_write_and_check: tool({
      description:
        "Write ABAP source code to the target system and run a syntax check. " +
        "Creates the object if it doesn't exist. Returns a lockHandle for iterative fixing.",
      inputSchema: z.object({
        objtype: z
          .string()
          .describe("Creatable type ID (e.g. PROG/P, CLAS/OC, INTF/OI)"),
        name: z.string().describe("Object name (e.g. ZMY_REPORT)"),
        parentName: z.string().describe("Parent package name (e.g. $TMP)"),
        parentPath: z
          .string()
          .describe("Parent package URI (e.g. /sap/bc/adt/packages/%24tmp)"),
        description: z
          .string()
          .describe("Object description (used when creating)"),
        source: z.string().describe("ABAP source code to write"),
        transport: z
          .string()
          .optional()
          .describe("Transport request number (required for non-local packages)"),
        lockHandle: z
          .string()
          .optional()
          .describe(
            "Lock handle from a previous call. Provide to skip re-locking when iterating on fixes."
          ),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_write_and_check", args),
    }),

    sap_activate: tool({
      description:
        "Activate an ABAP object (make inactive changes active in the system).",
      inputSchema: z.object({
        objectName: z.string().describe("Name of the object to activate"),
        objectUrl: z.string().describe("ADT URI of the object to activate"),
        mainInclude: z
          .string()
          .optional()
          .describe("Main include URL for includes belonging to a larger program"),
        preauditRequested: z
          .boolean()
          .optional()
          .describe("Whether to request pre-audit during activation"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_activate", args),
    }),

    sap_unlock: tool({
      description:
        "Unlock a previously locked ABAP object. Always call after finishing edits.",
      inputSchema: z.object({
        objectUrl: z.string().describe("ADT URI of the object to unlock"),
        lockHandle: z
          .string()
          .describe("Lock handle obtained from sap_write_and_check or sap_lock"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_unlock", args),
    }),

    sap_syntax_check: tool({
      description:
        "Perform a standalone syntax check on ABAP source code.",
      inputSchema: z.object({
        url: z.string().describe("URL of the object to check"),
        mainUrl: z
          .string()
          .optional()
          .describe("Main program URL (for includes)"),
        content: z
          .string()
          .optional()
          .describe("Source code content to check"),
        mainProgram: z
          .string()
          .optional()
          .describe("Main program name for context"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_syntax_check", args),
    }),

    sap_node_contents: tool({
      description:
        "Get contents (child nodes) of a package or object in the ABAP repository tree.",
      inputSchema: z.object({
        parent_type: z
          .string()
          .describe("Parent node type (e.g. DEVC/K, PROG/P, FUGR/F)"),
        parent_name: z
          .string()
          .optional()
          .describe("Parent object name. Omit for root-level contents."),
        user_name: z.string().optional().describe("Filter by user name"),
        parent_tech_name: z
          .string()
          .optional()
          .describe("Technical name of the parent"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_node_contents", args),
    }),

    sap_atc_run: tool({
      description:
        "Run ATC (ABAP Test Cockpit) checks on an activated object. " +
        "Returns findings with priorities. Priority 1 must be fixed; priority 2-3 should be fixed if possible.",
      inputSchema: z.object({
        objectUrl: z
          .string()
          .describe(
            "ADT URI of the object to check (e.g. /sap/bc/adt/programs/programs/zmy_report)"
          ),
        variant: z
          .string()
          .optional()
          .describe(
            "ATC check variant to use. Defaults to 'DEFAULT'."
          ),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum number of findings to return (default 100)"),
      }),
      execute: async (args) =>
        mcpClientManager.callTool(systemId, "sap_atc_run", args),
    }),
  };
}
