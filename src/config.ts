import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SapConfig {
  url: string;
  user: string;
  password: string;
  client?: string;
  language?: string;
  allowUnauthorizedCerts?: boolean;
}

interface ConfigFile {
  url?: string;
  user?: string;
  password?: string;
  client?: string;
  language?: string;
  allowUnauthorizedCerts?: boolean;
}

function loadConfigFile(): ConfigFile {
  const candidates = [
    join(process.cwd(), "config.json"),
    join(process.cwd(), ".sap-adt-config.json"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw) as ConfigFile;
      } catch {
        // ignore parse errors, fall through to env vars
      }
    }
  }
  return {};
}

export function loadConfig(): SapConfig {
  const file = loadConfigFile();

  const url = process.env.SAP_URL || file.url;
  const user = process.env.SAP_USER || file.user;
  const password = process.env.SAP_PASSWORD || file.password;
  const client = process.env.SAP_CLIENT || file.client;
  const language = process.env.SAP_LANGUAGE || file.language;
  const allowUnauthorizedCerts = file.allowUnauthorizedCerts ?? false;

  if (!url || !user || !password) {
    throw new Error(
      "SAP connection requires url, user, and password. " +
        "Set SAP_URL, SAP_USER, SAP_PASSWORD env vars or provide config.json."
    );
  }

  return { url, user, password, client, language, allowUnauthorizedCerts };
}
