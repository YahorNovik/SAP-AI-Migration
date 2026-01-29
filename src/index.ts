#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { SapAdtMcpServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const server = new SapAdtMcpServer(config);
  const transport = new StdioServerTransport();
  await server.mcpServer.connect(transport);
  console.error("SAP ADT MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
