import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { settingService } from "../setting-service";
import type { LlmProviderId } from "@/types/settings";

const providerFactories: Record<
  LlmProviderId,
  (apiKey: string, model: string) => LanguageModel
> = {
  anthropic: (apiKey, model) => createAnthropic({ apiKey })(model),
  openai: (apiKey, model) => createOpenAI({ apiKey })(model),
  google: (apiKey, model) => createGoogleGenerativeAI({ apiKey })(model),
  mistral: (apiKey, model) => createMistral({ apiKey })(model),
};

const DEFAULT_MODELS: Record<LlmProviderId, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
};

export async function getModel(): Promise<LanguageModel> {
  const provider = (await settingService.get("llmProvider")) as LlmProviderId | null;
  const apiKey = await settingService.get("llmApiKey");
  const model = await settingService.get("llmModel");

  if (!provider) {
    throw new Error(
      "LLM provider not configured. Go to Settings → AI Configuration."
    );
  }
  if (!apiKey) {
    throw new Error(
      "LLM API key not configured. Go to Settings → AI Configuration."
    );
  }

  const factory = providerFactories[provider];
  if (!factory) {
    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  const modelId = model || DEFAULT_MODELS[provider] || "default";
  return factory(apiKey, modelId);
}
