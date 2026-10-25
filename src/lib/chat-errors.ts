export interface ErrorStrings {
  apiError: string;
  rateLimited: string;
  notConfigured: string;
  providersUnavailable: string;
}

/**
 * The chat message for a failed /api/teach call. The server sends a stable
 * `code` with every error; the wording shown to students stays in the UI's
 * own language.
 */
export function errorText(strings: ErrorStrings, status: number, code: unknown): string {
  if (status === 429 || code === "rate_limited") return strings.rateLimited;
  if (code === "not_configured") return strings.notConfigured;
  if (code === "providers_unavailable") return strings.providersUnavailable;
  return strings.apiError;
}
