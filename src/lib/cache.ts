"use client";

/**
 * Simple in-memory cache for client-side data fetching.
 * Data is cached with a configurable TTL. On subsequent navigations,
 * stale data is returned immediately while a revalidation happens in background.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

type PendingRequest = Promise<any>;

const cache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, PendingRequest>();

const DEFAULT_TTL = 30_000; // 30 seconds

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function isStale(key: string, ttlMs = DEFAULT_TTL): boolean {
  const entry = cache.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > ttlMs;
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Fetch with deduplication and stale-while-revalidate caching.
 * - Returns cached data immediately if available.
 * - Deduplicates in-flight requests with the same key.
 * - Revalidates in the background if data is stale.
 */
export async function cachedFetch<T>(
  key: string,
  url: string,
  ttlMs = DEFAULT_TTL
): Promise<T> {
  // Return cached value immediately if fresh
  if (!isStale(key, ttlMs)) {
    const cached = getCached<T>(key);
    if (cached !== null) return cached;
  }

  // Deduplicate in-flight requests
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const request = fetch(url)
    .then((res) => res.json())
    .then((data) => {
      setCached(key, data);
      pendingRequests.delete(key);
      return data as T;
    })
    .catch((err) => {
      pendingRequests.delete(key);
      throw err;
    });

  pendingRequests.set(key, request);

  // If we have stale data, return it immediately and let revalidation happen
  const staleData = getCached<T>(key);
  if (staleData !== null) {
    return staleData;
  }

  return request;
}
