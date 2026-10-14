import "server-only";
import { LRUCache } from "lru-cache";

interface CacheEntryOptions {
  ttlMs: number;
}

type CacheValue = NonNullable<unknown>;

export class LruCacheStore {
  private cache: LRUCache<string, CacheValue>;
  private inFlightMap = new Map<string, Promise<unknown>>();

  constructor(maxEntries: number = 2000, defaultTtlMs: number = 1000 * 60 * 30) {
    this.cache = new LRUCache<string, CacheValue>({
      max: maxEntries,
      ttl: defaultTtlMs,
      allowStale: false,
      updateAgeOnGet: false,
    });
  }

  public get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  public set<T extends CacheValue>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs !== undefined) {
      this.cache.set(key, value, { ttl: ttlMs });
    } else {
      this.cache.set(key, value);
    }
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.inFlightMap.clear();
  }

  /**
   * Single-flight async execution with LRU caching.
   * If a computation with the same key is already in-flight, subsequent calls join the existing promise (T-21).
   */
  public async fetchOrCompute<T extends CacheValue>(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheEntryOptions
  ): Promise<{ data: T; cacheHit: boolean }> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return { data: cached, cacheHit: true };
    }

    // Check if there is an in-flight computation
    const inFlight = this.inFlightMap.get(key) as Promise<T> | undefined;
    if (inFlight) {
      const data = await inFlight;
      return { data, cacheHit: true };
    }

    // Launch single-flight execution
    const executionPromise = (async () => {
      try {
        const result = await computeFn();
        this.set(key, result, options?.ttlMs);
        return result;
      } finally {
        this.inFlightMap.delete(key);
      }
    })();

    this.inFlightMap.set(key, executionPromise as Promise<unknown>);

    const data = await executionPromise;
    return { data, cacheHit: false };
  }
}

// Global server singleton cache store
export const serverCacheStore = new LruCacheStore(2000, 1000 * 60 * 30);
