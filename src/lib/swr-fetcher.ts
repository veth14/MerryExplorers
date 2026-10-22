/**
 * src/lib/swr-fetcher.ts
 *
 * Shared SWR fetcher and configuration for all admin/teacher pages.
 * - Automatically injects the Firebase ID token into every API request
 * - Throws on HTTP errors (SWR won't cache error states correctly otherwise)
 * - 30-second deduplication window: navigating back to a page within 30s
 *   serves data from memory instantly with no network round-trip.
 */

import { auth } from "@/lib/firebase";

/**
 * Core fetch function for SWR. Injects Firebase auth token and throws on
 * non-OK responses so SWR treats them as errors (not empty data).
 */
export const swrFetcher = async (url: string): Promise<any> => {
  await auth.authStateReady();
  const currentUser = auth.currentUser;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
};

/**
 * Default SWR config for admin data — balances freshness with speed.
 *
 * - dedupingInterval: 30s — same URL won't re-fetch within 30 seconds,
 *   so navigating away and back is instant.
 * - revalidateOnFocus: false — prevents a re-fetch every time the user
 *   switches tabs, which is annoying in an admin tool.
 * - shouldRetryOnError: false — admin routes return structured errors;
 *   retrying automatically adds confusing delays.
 */
export const SWR_ADMIN_CONFIG = {
  dedupingInterval: 30_000,
  revalidateOnFocus: false,
  shouldRetryOnError: false,
} as const;

/**
 * SWR config for more frequently-changing data (attendance, clock status).
 */
export const SWR_LIVE_CONFIG = {
  dedupingInterval: 10_000,
  revalidateOnFocus: true,
  refreshInterval: 60_000, // auto-refresh every 60s
  shouldRetryOnError: false,
} as const;
