import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ClientManager } from "../client-manager.js";
import { adtErrorToResult } from "../errors.js";

export abstract class BaseHandler {
  protected server: McpServer;
  protected clientManager: ClientManager;

  constructor(server: McpServer, clientManager: ClientManager) {
    this.server = server;
    this.clientManager = clientManager;
    this.register();
  }

  protected abstract register(): void;

  protected success(data: unknown): CallToolResult {
    return {
      content: [
        {
          type: "text",
          text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  protected failure(error: unknown): CallToolResult {
    return adtErrorToResult(error);
  }

  protected async execute(
    fn: () => Promise<CallToolResult>,
    requiresAuth = true
  ): Promise<CallToolResult> {
    try {
      if (requiresAuth) {
        await this.clientManager.ensureLoggedIn();
      }
      return await fn();
    } catch (error: unknown) {
      return this.failure(error);
    }
  }
}
