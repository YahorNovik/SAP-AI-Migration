import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class CodeAnalysisHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_syntax_check",
      {
        description:
          "Perform a syntax check on ABAP source code. " +
          "Returns any errors/warnings with line numbers and descriptions. " +
          "For CDS sources, only the URL is needed. For ABAP, provide the main URL and source content.",
        inputSchema: {
          url: z
            .string()
            .describe(
              "URL of the object to check."
            ),
          mainUrl: z
            .string()
            .optional()
            .describe(
              "Main program URL (for includes). If omitted, treated as CDS check."
            ),
          content: z
            .string()
            .optional()
            .describe(
              "Source code content to check. Required for ABAP (non-CDS) checks."
            ),
          mainProgram: z
            .string()
            .optional()
            .describe("Main program name for context."),
          version: z
            .string()
            .optional()
            .describe("Version identifier."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          let results;
          if (args.mainUrl && args.content !== undefined) {
            results = await client.syntaxCheck(
              args.url,
              args.mainUrl,
              args.content,
              args.mainProgram,
              args.version
            );
          } else {
            results = await client.syntaxCheck(args.url);
          }
          return this.success({
            count: results.length,
            hasErrors: results.some((r) => r.severity === "E" || r.severity === "A"),
            results,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_code_completion",
      {
        description:
          "Get code completion proposals at a specific position in ABAP source code. " +
          "Returns a list of completion suggestions with their types and identifiers.",
        inputSchema: {
          sourceUrl: z
            .string()
            .describe("Source URL of the ABAP object."),
          source: z
            .string()
            .describe("Current source code content."),
          line: z
            .number()
            .describe("Line number (1-based) for completion position."),
          column: z
            .number()
            .describe("Column number (0-based) for completion position."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const proposals = await client.codeCompletion(
            args.sourceUrl,
            args.source,
            args.line,
            args.column
          );
          return this.success({
            count: proposals.length,
            proposals,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_find_definition",
      {
        description:
          "Find the definition location of an ABAP symbol (variable, method, class, etc.). " +
          "Returns the URL, line, and column where the symbol is defined.",
        inputSchema: {
          url: z
            .string()
            .describe("Source URL of the ABAP object containing the reference."),
          source: z
            .string()
            .describe("Current source code content."),
          line: z
            .number()
            .describe("Line number (1-based) where the symbol appears."),
          startCol: z
            .number()
            .describe(
              "Start column (0-based) of the symbol to look up."
            ),
          endCol: z
            .number()
            .describe(
              "End column (0-based) of the symbol to look up."
            ),
          implementation: z
            .boolean()
            .optional()
            .describe(
              "If true, navigate to implementation instead of definition."
            ),
          mainProgram: z
            .string()
            .optional()
            .describe("Main program name for context."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const location = await client.findDefinition(
            args.url,
            args.source,
            args.line,
            args.startCol,
            args.endCol,
            args.implementation,
            args.mainProgram
          );
          return this.success(location);
        });
      }
    );

    this.server.registerTool(
      "sap_usage_references",
      {
        description:
          "Find all usage references (where-used list) for an ABAP object or symbol. " +
          "Returns a list of locations where the object/symbol is referenced.",
        inputSchema: {
          url: z
            .string()
            .describe("ADT URI of the object to find references for."),
          line: z
            .number()
            .optional()
            .describe(
              "Line number (1-based) of the symbol. Omit for object-level references."
            ),
          column: z
            .number()
            .optional()
            .describe(
              "Column number (0-based) of the symbol. Omit for object-level references."
            ),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const references = await client.usageReferences(
            args.url,
            args.line,
            args.column
          );
          return this.success({
            count: references.length,
            references,
          });
        });
      }
    );
  }
}
