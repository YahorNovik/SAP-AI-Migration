export interface SettingsMap {
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  globalMigrationRules: string;
}

export type SettingKey = keyof SettingsMap;

export const LLM_PROVIDERS = [
  { value: "anthropic", label: "Anthropic", defaultModel: "claude-sonnet-4-20250514" },
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4o" },
  { value: "google", label: "Google", defaultModel: "gemini-2.0-flash" },
  { value: "mistral", label: "Mistral", defaultModel: "mistral-large-latest" },
] as const;

export type LlmProviderId = (typeof LLM_PROVIDERS)[number]["value"];
