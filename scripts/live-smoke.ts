#!/usr/bin/env tsx
/**
 * BreatheWay Live Smoke Test (T-35)
 * Validates live external providers and asserts walking speed plausibility (3–7 km/h).
 *
 * Usage: npx tsx scripts/live-smoke.ts
 * Requires a running BreatheWay server at BASE_URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
export {};

// Well-known walking pair: London (Trafalgar Square → Covent Garden ~650m)
interface TestPair {
  name: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
}

const TEST_PAIRS: TestPair[] = [
  {
    name: "London: Trafalgar Sq → Covent Garden",
    origin: { lat: 51.50802, lng: -0.12814, label: "Trafalgar Square" },
    destination: { lat: 51.51218, lng: -0.12354, label: "Covent Garden" },
  },
  {
    name: "London: St Paul's → Bank Station",
    origin: { lat: 51.51385, lng: -0.09854, label: "St Paul's Cathedral" },
    destination: { lat: 51.51325, lng: -0.08896, label: "Bank Station" },
  },
];

const MIN_WALK_SPEED_KMH = 3;
const MAX_WALK_SPEED_KMH = 7;

async function runSmoke() {
  console.log(`\n🔬 BreatheWay Live Smoke Test`);
  console.log(`📡 Target: ${BASE_URL}\n`);

  // 1. Health check
  console.log("1. Checking /api/health...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed: HTTP ${healthRes.status}`);
  }
  const health = await healthRes.json();
  console.log(`   ✓ Status: ${health.status}, Mocked: ${health.mocked}\n`);

  // 2. Route plausibility tests
  let passed = 0;
  let failed = 0;

  for (const pair of TEST_PAIRS) {
    console.log(`2. Testing: ${pair.name}`);
    const start = Date.now();

    try {
      const res = await fetch(`${BASE_URL}/api/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: pair.origin,
          destination: pair.destination,
          detourLimit: "standard",
        }),
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`   ✗ HTTP ${res.status}: ${JSON.stringify(err)}`);
        failed++;
        continue;
      }

      const data = await res.json();
      const fastestRoute = data.routes.find((r: { tags: string[] }) => r.tags.includes("fastest"));

      if (!fastestRoute) {
        console.error("   ✗ No fastest route in response");
        failed++;
        continue;
      }

      // Assert walking speed: distance / duration
      const speedKmh =
        (fastestRoute.distanceM / 1000) / (fastestRoute.durationS / 3600);

      const speedOk = speedKmh >= MIN_WALK_SPEED_KMH && speedKmh <= MAX_WALK_SPEED_KMH;

      console.log(
        `   ${speedOk ? "✓" : "✗"} Distance: ${Math.round(fastestRoute.distanceM)}m, ` +
        `Duration: ${Math.round(fastestRoute.durationS)}s, ` +
        `Speed: ${speedKmh.toFixed(2)} km/h, ` +
        `Latency: ${latencyMs}ms`
      );
      console.log(
        `   Routes returned: ${data.routes.length}, ` +
        `Candidates evaluated: ${data.meta.candidatesEvaluated}, ` +
        `Degraded: [${data.meta.degraded.join(", ") || "none"}]`
      );

      if (speedOk) {
        passed++;
      } else {
        console.error(
          `   ✗ Walking speed ${speedKmh.toFixed(2)} km/h outside expected range [${MIN_WALK_SPEED_KMH}, ${MAX_WALK_SPEED_KMH}]`
        );
        failed++;
      }
    } catch (err) {
      console.error(`   ✗ Request failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    console.log();
  }

  // Summary
  console.log(`\n📊 Smoke Test Summary`);
  console.log(`   Passed: ${passed}/${TEST_PAIRS.length}`);
  console.log(`   Failed: ${failed}/${TEST_PAIRS.length}`);

  if (failed > 0) {
    console.error("\n❌ Smoke test FAILED\n");
    process.exit(1);
  } else {
    console.log("\n✅ Smoke test PASSED\n");
    process.exit(0);
  }
}

runSmoke().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
