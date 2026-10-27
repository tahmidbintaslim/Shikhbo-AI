// Which external services this deployment can use, read from env vars.
// Values are trimmed: a key pasted into a host's settings with a trailing
// newline or space otherwise fails every call with a 401.

type Env = Record<string, string | undefined>;

/** The chat provider keys, in the order the tutor tries them. */
export const CHAT_KEY_NAMES = ["OPENROUTER_API_KEY", "HF_API_KEY", "GROQ_API_KEY"] as const;

export interface ServiceConfig {
  openrouterKey: string | null;
  /** Hugging Face: the second chat provider. */
  hfKey: string | null;
  groqKey: string | null;
  /** The shikhbo-api Edge Function: textbook search, answer cache, shared rate limit. */
  store: { url: string; secret: string } | null;
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
 * True for an `https://` URL with no user name or password, the only shape
 * the store endpoint has. Node's fetch error quotes the URL, so a secret
 * pasted into the URL variable would otherwise reach the logs.
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
  const storeUrl = value(env.SHIKHBO_STORE_URL);
  const storeSecret = value(env.SHIKHBO_STORE_SECRET);
  const problems: string[] = [];
  let store: ServiceConfig["store"] = null;
  if (storeUrl && storeSecret) {
    if (isRestUrl(storeUrl)) {
      store = { url: storeUrl, secret: storeSecret };
    } else {
      problems.push(
        "textbook retrieval, answer cache and shared rate limit disabled (not an https URL without credentials), check SHIKHBO_STORE_URL",
      );
    }
  } else if (storeUrl || storeSecret) {
    problems.push(
      `textbook retrieval, answer cache and shared rate limit disabled: ${storeUrl ? "SHIKHBO_STORE_SECRET" : "SHIKHBO_STORE_URL"} is not set (both are needed)`,
    );
  }
  return {
    openrouterKey: value(env.OPENROUTER_API_KEY),
    hfKey: value(env.HF_API_KEY),
    groqKey: value(env.GROQ_API_KEY),
    store,
    problems,
  };
}

export interface ConfigStatus {
  /** True when at least one chat provider key is set. */
  ok: boolean;
  chatProviders: number;
  /** Textbook lookup, the answer cache and the shared rate limit need the store. */
  textbookRetrieval: boolean;
}

/** What /api/health reports. Never includes a key or URL. */
export function configStatus(config: ServiceConfig): ConfigStatus {
  const chatProviders = [config.openrouterKey, config.hfKey, config.groqKey].filter(Boolean).length;
  return {
    ok: chatProviders > 0,
    chatProviders,
    textbookRetrieval: Boolean(config.store),
  };
}

/**
 * Builds a client from config, or returns null and logs which setting to
 * check. A malformed value must not throw while the route module loads:
 * that turns every request into a bare HTTP 500.
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
