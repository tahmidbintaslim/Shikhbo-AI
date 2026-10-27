// Model IDs are config, not code: providers retire IDs often. Defaults were
// checked against each provider's model list on 2026-10-19.

export const DEFAULT_MODELS = {
  /** OpenRouter, tried second. A free-tier model. */
  openrouter: "google/gemma-4-31b-it:free",
  /** Hugging Face Inference Providers, tried last. */
  huggingface: "google/gemma-4-26B-A4B-it",
  /** Groq, tried first. */
  groq: "openai/gpt-oss-120b",
} as const;

export type ModelConfig = { [K in keyof typeof DEFAULT_MODELS]: string };

type Env = Record<string, string | undefined>;

function pick(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function getModelConfig(env: Env = process.env): ModelConfig {
  return {
    openrouter: pick(env.OPENROUTER_MODEL, DEFAULT_MODELS.openrouter),
    huggingface: pick(env.HF_CHAT_MODEL, DEFAULT_MODELS.huggingface),
    groq: pick(env.GROQ_MODEL, DEFAULT_MODELS.groq),
  };
}
