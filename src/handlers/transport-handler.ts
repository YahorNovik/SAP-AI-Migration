import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class TransportHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_transport_info",
      {
        description:
          "Get transport information for an ABAP object. " +
          "Returns available transports, package info, and whether a transport is required.",
        inputSchema: {
          objSourceUrl: z
            .string()
            .describe(
              "Source URL of the object, e.g. '/sap/bc/adt/programs/programs/zmy_program'."
            ),
          devClass: z
            .string()
            .optional()
            .describe("Development class (package) name."),
          operation: z
            .string()
            .optional()
            .describe("Operation type, e.g. 'INSERT' or 'MODIFY'."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const info = await client.transportInfo(
            args.objSourceUrl,
            args.devClass,
            args.operation
          );
          return this.success(info);
        });
      }
    );

    this.server.registerTool(
      "sap_create_transport",
      {
        description:
          "Create a new transport request. Returns the transport number (e.g. 'DEVK900123'). " +
          "Used when an object needs to be assigned to a transport for changes.",
        inputSchema: {
          objSourceUrl: z
            .string()
            .describe(
              "Source URL of the object the transport is for."
            ),
          description: z
            .string()
            .describe(
              "Description/text for the transport request."
            ),
          devClass: z
            .string()
            .describe("Development class (package) name, e.g. 'ZPACKAGE'."),
          transportLayer: z
            .string()
            .optional()
            .describe("Transport layer. Usually auto-determined from package."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const transportNumber = await client.createTransport(
            args.objSourceUrl,
            args.description,
            args.devClass,
            args.transportLayer
          );
          return this.success({
            message: "Transport created successfully",
            transportNumber,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_release_transport",
      {
        description:
          "Release a transport request. This moves the transport to the import queue. " +
          "Returns release report with status and any messages.",
        inputSchema: {
          transportNumber: z
            .string()
            .describe(
              "Transport number to release, e.g. 'DEVK900123'."
            ),
          ignoreLocks: z
            .boolean()
            .optional()
            .describe("Release even if objects are locked."),
          ignoreATC: z
            .boolean()
            .optional()
            .describe("Ignore ATC (ABAP Test Cockpit) check results."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const reports = await client.transportRelease(
            args.transportNumber,
            args.ignoreLocks,
            args.ignoreATC
          );
          return this.success({
            transportNumber: args.transportNumber,
            reports,
          });
        });
      }
    );

    this.server.registerTool(
      "sap_user_transports",
      {
        description:
          "List all transport requests for a user. " +
          "Returns workbench and customizing transports, grouped by target with modifiable and released requests.",
        inputSchema: {
          user: z
            .string()
            .describe(
              "SAP user name to list transports for. Use '*' for current user."
            ),
          targets: z
            .boolean()
            .optional()
            .describe("Include target system information. Defaults to false."),
        },
      },
      async (args) => {
        return this.execute(async () => {
          const client = await this.clientManager.ensureLoggedIn();
          const transports = await client.userTransports(
            args.user,
            args.targets
          );
          return this.success(transports);
        });
      }
    );
  }
}
