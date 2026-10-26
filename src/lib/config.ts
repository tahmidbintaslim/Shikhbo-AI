// Which external services this deployment can use, read from env vars.
// Values are trimmed: a key pasted into a host's settings with a trailing
// newline or space otherwise fails every call with a 401.

type Env = Record<string, string | undefined>;

/** The chat provider keys, in the order the tutor tries them. */
export const CHAT_KEY_NAMES = ["OPENROUTER_API_KEY", "HF_API_KEY", "GROQ_API_KEY"] as const;

export interface ServiceConfig {
  openrouterKey: string | null;
  /** Hugging Face: the second chat provider and the question embeddings. */
  hfKey: string | null;
  groqKey: string | null;
  vector: { url: string; token: string } | null;
  /**
   * Settings that are set but cannot work, as log lines that name the
   * variable. Never the value: a token pasted into a URL variable is common.
   */
  problems: string[];
}

function value(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/**
 * True for an `https://` URL with no user name or password, the only shape an
 * Upstash REST endpoint has. The Upstash Vector client accepts any string and
 * fails on every query instead, and Node's fetch error quotes the URL, so a
 * token or a `redis://user:password@...` URL would reach the logs.
 */
export function isRestUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.username === "" && url.password === "" && url.hostname !== "";
}

export function readServiceConfig(env: Env = process.env): ServiceConfig {
  const vectorUrl = value(env.UPSTASH_VECTOR_REST_URL);
  const vectorToken = value(env.UPSTASH_VECTOR_REST_TOKEN);
  const problems: string[] = [];
  let vector: ServiceConfig["vector"] = null;
  if (vectorUrl && vectorToken) {
    if (isRestUrl(vectorUrl)) {
      vector = { url: vectorUrl, token: vectorToken };
    } else {
      problems.push(
        "textbook retrieval disabled (not an https REST URL without credentials), check UPSTASH_VECTOR_REST_URL",
      );
    }
  }
  return {
    openrouterKey: value(env.OPENROUTER_API_KEY),
    hfKey: value(env.HF_API_KEY),
    groqKey: value(env.GROQ_API_KEY),
    vector,
    problems,
  };
}

export interface ConfigStatus {
  /** True when at least one chat provider key is set. */
  ok: boolean;
  chatProviders: number;
  /** Textbook lookup needs the vector index and the Hugging Face key. */
  textbookRetrieval: boolean;
}

/** What /api/health reports. Never includes a key or URL. */
export function configStatus(config: ServiceConfig): ConfigStatus {
  const chatProviders = [config.openrouterKey, config.hfKey, config.groqKey].filter(Boolean).length;
  return {
    ok: chatProviders > 0,
    chatProviders,
    textbookRetrieval: Boolean(config.vector && config.hfKey),
  };
}

/**
 * Builds a client from config, or returns null and logs which setting to
 * check. A malformed value (a `redis://` URL where an https REST URL is
 * expected, say) must not throw while the route module loads: that turns
 * every request into a bare HTTP 500.
 */
export function createOptional<T>(label: string, settings: string, build: () => T): T | null {
  try {
    return build();
  } catch (err) {
    // The error name only: client constructors quote the value they were
    // given, and a token pasted into the wrong variable must not reach logs.
    const reason = err instanceof Error ? err.name : "unknown error";
    console.error(`[config] ${label} disabled (${reason}), check ${settings}`);
    return null;
  }
}
