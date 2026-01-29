import { z } from "zod";
import { BaseHandler } from "./base-handler.js";

export class AuthHandler extends BaseHandler {
  protected register(): void {
    this.server.registerTool(
      "sap_login",
      {
        description:
          "Log in to the SAP ADT server. Establishes a stateful session required for most operations. " +
          "Called automatically by other tools, but can be used explicitly to verify connectivity.",
      },
      async () => {
        return this.execute(async () => {
          const client = await this.clientManager.login();
          return this.success({
            message: "Successfully logged in to SAP ADT",
            baseUrl: client.baseUrl,
            user: client.username,
            sessionId: this.clientManager.sessionId,
          });
        }, false);
      }
    );

    this.server.registerTool(
      "sap_logout",
      {
        description:
          "Log out from the SAP ADT server. Terminates the current session. " +
          "After logout, a new client must be created to reconnect.",
      },
      async () => {
        return this.execute(async () => {
          await this.clientManager.logout();
          return this.success({ message: "Successfully logged out" });
        }, false);
      }
    );

    this.server.registerTool(
      "sap_drop_session",
      {
        description:
          "Drop the current stateful session without fully logging out. " +
          "Releases server-side session resources while keeping the client reusable.",
      },
      async () => {
        return this.execute(async () => {
          await this.clientManager.dropSession();
          return this.success({
            message: "Session dropped successfully",
          });
        }, false);
      }
    );
  }
}
