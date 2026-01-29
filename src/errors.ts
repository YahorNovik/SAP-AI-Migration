import { isAdtError, isAdtException } from "abap-adt-api";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function adtErrorToResult(error: unknown): CallToolResult {
  if (isAdtError(error)) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `ADT Error: ${error.message}\nType: ${error.type}\nNamespace: ${error.namespace ?? "unknown"}`,
        },
      ],
    };
  }

  if (isAdtException(error)) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `ADT Exception: ${error.message}`,
        },
      ],
    };
  }

  if (error instanceof Error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Unknown error: ${String(error)}`,
      },
    ],
  };
}
