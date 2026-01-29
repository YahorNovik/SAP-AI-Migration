import { ADTClient, createSSLConfig, session_types } from "abap-adt-api";
import type { SapConfig } from "./config.js";

export class ClientManager {
  private client: ADTClient | null = null;
  private config: SapConfig;

  constructor(config: SapConfig) {
    this.config = config;
  }

  getClient(): ADTClient {
    if (!this.client) {
      const options = this.config.allowUnauthorizedCerts
        ? createSSLConfig(true)
        : {};

      this.client = new ADTClient(
        this.config.url,
        this.config.user,
        this.config.password,
        this.config.client,
        this.config.language,
        options
      );
    }
    return this.client;
  }

  async ensureLoggedIn(): Promise<ADTClient> {
    const client = this.getClient();
    if (!client.loggedin) {
      await client.login();
      client.stateful = session_types.stateful;
    }
    return client;
  }

  async login(): Promise<ADTClient> {
    const client = this.getClient();
    await client.login();
    client.stateful = session_types.stateful;
    return client;
  }

  async logout(): Promise<void> {
    if (this.client && this.client.loggedin) {
      await this.client.logout();
      this.client = null;
    }
  }

  async dropSession(): Promise<void> {
    if (this.client && this.client.loggedin) {
      await this.client.dropSession();
    }
  }

  get isLoggedIn(): boolean {
    return this.client?.loggedin ?? false;
  }

  get sessionId(): string {
    if (!this.client) return "";
    const id = this.client.sessionID;
    return Array.isArray(id) ? id.join(", ") : id;
  }
}
