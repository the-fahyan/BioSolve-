import { describe, it, expect, vi } from "vitest";
import { LruCacheStore } from "@/server/cache/lru-cache-store";

describe("LRU Cache & Single-Flight Store (src/server/cache/lru-cache-store.ts)", () => {
  it("stores and retrieves cached entries (T-20)", async () => {
    const store = new LruCacheStore(10, 1000);
    store.set("test_key", { value: 42 });

    expect(store.has("test_key")).toBe(true);
    expect(store.get("test_key")).toEqual({ value: 42 });
  });

  it("coalesces concurrent identical in-flight requests into 1 execution (T-21)", async () => {
    const store = new LruCacheStore(10, 5000);
    const mockCompute = vi.fn(async () => {
      // Simulate upstream network delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { result: "upstream_data" };
    });

    // Fire 5 identical concurrent requests
    const promises = Array.from({ length: 5 }, () =>
      store.fetchOrCompute("single_flight_key", mockCompute)
    );

    const results = await Promise.all(promises);

    // Assert compute was called exactly ONCE
    expect(mockCompute).toHaveBeenCalledTimes(1);

    // All callers received the data
    for (const r of results) {
      expect(r.data).toEqual({ result: "upstream_data" });
    }

    // Subsequent call is a cache hit
    const subsequent = await store.fetchOrCompute("single_flight_key", mockCompute);
    expect(subsequent.cacheHit).toBe(true);
    expect(mockCompute).toHaveBeenCalledTimes(1);
  });

  it("evicts oldest entries when capacity is exceeded", () => {
    const store = new LruCacheStore(2, 5000);
    store.set("k1", "v1");
    store.set("k2", "v2");
    store.set("k3", "v3"); // Evicts k1

    expect(store.has("k1")).toBe(false);
    expect(store.has("k2")).toBe(true);
    expect(store.has("k3")).toBe(true);
  });
});
