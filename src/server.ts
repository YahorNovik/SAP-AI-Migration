import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ClientManager } from "./client-manager.js";
import type { SapConfig } from "./config.js";

import { AuthHandler } from "./handlers/auth-handler.js";
import { SearchHandler } from "./handlers/search-handler.js";
import { SourceHandler } from "./handlers/source-handler.js";
import { LifecycleHandler } from "./handlers/lifecycle-handler.js";
import { LockHandler } from "./handlers/lock-handler.js";
import { ActivationHandler } from "./handlers/activation-handler.js";
import { TransportHandler } from "./handlers/transport-handler.js";
import { CodeAnalysisHandler } from "./handlers/code-analysis-handler.js";
import { WorkflowHandler } from "./handlers/workflow-handler.js";

export class SapAdtMcpServer {
  readonly mcpServer: McpServer;
  readonly clientManager: ClientManager;

  constructor(config: SapConfig) {
    this.mcpServer = new McpServer({
      name: "sap-adt-mcp-server",
      version: "1.0.0",
    });

    this.clientManager = new ClientManager(config);

    // Self-registering handlers
    new AuthHandler(this.mcpServer, this.clientManager);
    new SearchHandler(this.mcpServer, this.clientManager);
    new SourceHandler(this.mcpServer, this.clientManager);
    new LifecycleHandler(this.mcpServer, this.clientManager);
    new LockHandler(this.mcpServer, this.clientManager);
    new ActivationHandler(this.mcpServer, this.clientManager);
    new TransportHandler(this.mcpServer, this.clientManager);
    new CodeAnalysisHandler(this.mcpServer, this.clientManager);
    new WorkflowHandler(this.mcpServer, this.clientManager);
  }
}
