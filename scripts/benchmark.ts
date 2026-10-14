#!/usr/bin/env tsx
/**
 * BreatheWay Route Performance Benchmark
 * Measures cold vs warm latencies and exposure reduction statistics.
 *
 * Usage: npx tsx scripts/benchmark.ts
 * Requires a running BreatheWay server at BASE_URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
export {};
const PAIRS_TO_TEST = 20;

// London walking test pairs (varied distances)
const TEST_PAIRS = [
  { origin: { lat: 51.5074, lng: -0.1278 }, destination: { lat: 51.5155, lng: -0.0922 } },
  { origin: { lat: 51.5080, lng: -0.1281 }, destination: { lat: 51.5122, lng: -0.1235 } },
  { origin: { lat: 51.5033, lng: -0.1196 }, destination: { lat: 51.5074, lng: -0.1278 } },
  { origin: { lat: 51.5145, lng: -0.0726 }, destination: { lat: 51.5074, lng: -0.1278 } },
  { origin: { lat: 51.5001, lng: -0.1245 }, destination: { lat: 51.5155, lng: -0.0922 } },
  { origin: { lat: 51.5179, lng: -0.1031 }, destination: { lat: 51.5033, lng: -0.1196 } },
  { origin: { lat: 51.5074, lng: -0.1278 }, destination: { lat: 51.5001, lng: -0.1245 } },
  { origin: { lat: 51.5122, lng: -0.1235 }, destination: { lat: 51.5179, lng: -0.1031 } },
  { origin: { lat: 51.5155, lng: -0.0922 }, destination: { lat: 51.5145, lng: -0.0726 } },
  { origin: { lat: 51.5033, lng: -0.1196 }, destination: { lat: 51.5001, lng: -0.1245 } },
  { origin: { lat: 51.5080, lng: -0.1281 }, destination: { lat: 51.5179, lng: -0.1031 } },
  { origin: { lat: 51.5122, lng: -0.1235 }, destination: { lat: 51.5074, lng: -0.1278 } },
  { origin: { lat: 51.5001, lng: -0.1245 }, destination: { lat: 51.5033, lng: -0.1196 } },
  { origin: { lat: 51.5145, lng: -0.0726 }, destination: { lat: 51.5155, lng: -0.0922 } },
  { origin: { lat: 51.5074, lng: -0.1278 }, destination: { lat: 51.5080, lng: -0.1281 } },
  { origin: { lat: 51.5033, lng: -0.1196 }, destination: { lat: 51.5145, lng: -0.0726 } },
  { origin: { lat: 51.5179, lng: -0.1031 }, destination: { lat: 51.5155, lng: -0.0922 } },
  { origin: { lat: 51.5155, lng: -0.0922 }, destination: { lat: 51.5074, lng: -0.1278 } },
  { origin: { lat: 51.5080, lng: -0.1281 }, destination: { lat: 51.5001, lng: -0.1245 } },
  { origin: { lat: 51.5122, lng: -0.1235 }, destination: { lat: 51.5145, lng: -0.0726 } },
].slice(0, PAIRS_TO_TEST);

interface BenchmarkResult {
  pair: number;
  coldMs: number;
  warmMs: number;
  routeCount: number;
  exposureReductionPct: number | null;
  degraded: string[];
  error?: string;
}

async function callRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ latencyMs: number; data: Record<string, unknown> }> {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}/api/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, detourLimit: "standard" }),
  });
  const latencyMs = Math.round(performance.now() - start);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { latencyMs, data };
}

async function benchmark() {
  console.log(`\n⚡ BreatheWay Route Performance Benchmark`);
  console.log(`📡 Target: ${BASE_URL}`);
  console.log(`🔢 Pairs: ${PAIRS_TO_TEST}\n`);

  const results: BenchmarkResult[] = [];

  for (let i = 0; i < TEST_PAIRS.length; i++) {
    const pair = TEST_PAIRS[i]!;
    process.stdout.write(`Pair ${i + 1}/${PAIRS_TO_TEST}... `);

    try {
      // Cold call
      const cold = await callRoutes(pair.origin, pair.destination);
      // Warm call (should hit cache)
      const warm = await callRoutes(pair.origin, pair.destination);

      const routes = (cold.data["routes"] as Array<{
        tags: string[];
        avgExposure: number | null;
        vsFastest: { exposureReductionPct: number | null };
      }>) ?? [];
      const cleanest = routes.find((r) => r.tags.includes("cleanest") && !r.tags.includes("fastest"));
      const reductionPct = cleanest?.vsFastest.exposureReductionPct ?? null;

      results.push({
        pair: i + 1,
        coldMs: cold.latencyMs,
        warmMs: warm.latencyMs,
        routeCount: routes.length,
        exposureReductionPct: reductionPct,
        degraded: (cold.data["meta"] as { degraded: string[] })?.degraded ?? [],
      });

      console.log(`cold=${cold.latencyMs}ms warm=${warm.latencyMs}ms routes=${routes.length} reduction=${reductionPct ?? "N/A"}%`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        pair: i + 1,
        coldMs: -1,
        warmMs: -1,
        routeCount: 0,
        exposureReductionPct: null,
        degraded: [],
        error: msg,
      });
      console.log(`FAILED: ${msg}`);
    }
  }

  // Statistics
  const successful = results.filter((r) => !r.error);
  const coldLatencies = successful.map((r) => r.coldMs).sort((a, b) => a - b);
  const warmLatencies = successful.map((r) => r.warmMs).sort((a, b) => a - b);
  const reductions = successful
    .map((r) => r.exposureReductionPct)
    .filter((v): v is number => v !== null);

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const p50 = (arr: number[]) => arr[Math.floor(arr.length * 0.5)] ?? 0;
  const p95 = (arr: number[]) => arr[Math.floor(arr.length * 0.95)] ?? 0;

  console.log(`\n📊 Benchmark Results`);
  console.log(`   Successful: ${successful.length}/${results.length}`);
  console.log(`\n   Cold Latency:`);
  console.log(`     Avg: ${avg(coldLatencies)}ms | p50: ${p50(coldLatencies)}ms | p95: ${p95(coldLatencies)}ms`);
  console.log(`\n   Warm Latency:`);
  console.log(`     Avg: ${avg(warmLatencies)}ms | p50: ${p50(warmLatencies)}ms | p95: ${p95(warmLatencies)}ms`);
  console.log(`\n   Exposure Reduction (where cleanest ≠ fastest):`);
  console.log(`     Avg: ${avg(reductions)}% | Samples: ${reductions.length}`);

  console.log("\n✅ Benchmark complete\n");
}

benchmark().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
