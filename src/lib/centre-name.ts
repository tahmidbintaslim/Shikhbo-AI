import { cache } from "react";
import { readServiceConfig } from "./config";
import { createStore } from "./store";

/**
 * A coaching centre's display name, or null when there is no such centre
 * (or no store). Cached per request, so the page and its metadata share one
 * call. A store failure throws, so an outage shows the error page, not a 404.
 */
export const centreName = cache(async (slug: string): Promise<string | null> => {
  const { store } = readServiceConfig();
  if (!store || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return null;
  return createStore(store).centreInfo(slug);
});
