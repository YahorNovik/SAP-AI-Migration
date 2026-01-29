import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { systemService } from "./system-service";

interface McpConnection {
  client: Client;
  transport: StdioClientTransport;
  systemId: string;
  lastUsed: number;
}

class McpClientManager {
  private connections = new Map<string, McpConnection>();
  private connecting = new Map<string, Promise<McpConnection>>();

  async getConnection(systemId: string): Promise<Client> {
    const existing = this.connections.get(systemId);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.client;
    }

    // Prevent duplicate parallel connection attempts
    let pending = this.connecting.get(systemId);
    if (pending) {
      const conn = await pending;
      return conn.client;
    }

    const connectPromise = this.createConnection(systemId);
    this.connecting.set(systemId, connectPromise);

    try {
      const conn = await connectPromise;
      this.connections.set(systemId, conn);
      return conn.client;
    } finally {
      this.connecting.delete(systemId);
    }
  }

  private async createConnection(systemId: string): Promise<McpConnection> {
    const system = await systemService.getWithPassword(systemId);
    if (!system) throw new Error(`SAP system ${systemId} not found`);

    const serverPath = path.resolve(process.cwd(), "..", "build", "index.js");

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        SAP_URL: system.url,
        SAP_USER: system.user,
        SAP_PASSWORD: system.password,
        SAP_CLIENT: system.client || "",
        SAP_LANGUAGE: system.language || "EN",
        NODE_TLS_REJECT_UNAUTHORIZED: system.allowUnauthorizedCerts
          ? "0"
          : "1",
        PATH: process.env.PATH ?? "",
      },
    });

    const client = new Client(
      { name: "sap-migration-frontend", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    return { client, transport, systemId, lastUsed: Date.now() };
  }

  async callTool(
    systemId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const client = await this.getConnection(systemId);

    try {
      const result = await client.callTool({ name: toolName, arguments: args });
      const textContent = (result.content as Array<{ type: string; text?: string }>)?.find(
        (c) => c.type === "text"
      );
      return textContent?.text ?? JSON.stringify(result.content);
    } catch (err) {
      // Connection may have died — remove it so next call reconnects
      await this.closeConnection(systemId);
      throw err;
    }
  }

  async closeConnection(systemId: string): Promise<void> {
    const conn = this.connections.get(systemId);
    if (conn) {
      this.connections.delete(systemId);
      try {
        await conn.transport.close();
      } catch {
        // ignore cleanup errors
      }
    }
  }

  async closeAll(): Promise<void> {
    const ids = Array.from(this.connections.keys());
    await Promise.allSettled(ids.map((id) => this.closeConnection(id)));
  }
}

export const mcpClientManager = new McpClientManager();
