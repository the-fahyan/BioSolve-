import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  createErrorResponse,
  generateRequestId,
} from "@/server/http/api-handler";
import { serverEnv } from "@/server/config/env";
import { HealthResponse, ProviderHealthCheckSchema } from "@/lib/schemas";
import { z } from "zod";

type ProviderCheckResult = z.infer<typeof ProviderHealthCheckSchema>;

async function pingProvider(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: string
): Promise<ProviderCheckResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": serverEnv.UPSTREAM_USER_AGENT,
        ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(4000),
    });

    const ms = Math.round(performance.now() - start);
    return {
      ok: res.ok,
      ms,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err: unknown) {
    const ms = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : "Network error";
    return {
      ok: false,
      ms,
      error: message,
    };
  }
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(req.url);
  const isDeep = searchParams.get("deep") === "1" || searchParams.get("deep") === "true";

  if (isDeep) {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(clientIp, "health_deep", 5);
    if (!rl.allowed) {
      return createErrorResponse(
        429,
        "RATE_LIMITED",
        "Deep health check rate limit exceeded (max 5/min).",
        requestId,
        { retryAfterSeconds: rl.resetSeconds }
      );
    }

    const providers: Record<string, ProviderCheckResult> = {};

    if (serverEnv.USE_MOCK_PROVIDERS) {
      providers["mock"] = { ok: true, ms: 1 };
    } else {
      const [photonRes, osrmRes, aqiRes, overpassRes] = await Promise.all([
        pingProvider(`${serverEnv.PHOTON_BASE_URL}/api/?q=berlin&limit=1`),
        pingProvider(
          `${serverEnv.OSRM_BASE_URL}/route/v1/driving/13.40,52.52;13.41,52.52?overview=false`
        ),
        pingProvider(
          `${serverEnv.OPEN_METEO_BASE_URL}/v1/air-quality?latitude=52.52&longitude=13.41&current=us_aqi`
        ),
        pingProvider(
          serverEnv.OVERPASS_PRIMARY_URL,
          "POST",
          "data=[out:json][timeout:5];node(52.52,13.40,52.521,13.401);out count;"
        ),
      ]);

      providers["photon"] = photonRes;
      providers["osrm"] = osrmRes;
      providers["openMeteo"] = aqiRes;
      providers["overpass"] = overpassRes;
    }

    const allOk = Object.values(providers).every((p) => p.ok);
    const responsePayload: HealthResponse = {
      status: allOk ? "ok" : "degraded",
      version: "1.0.0",
      uptimeS: Math.round(process.uptime()),
      mocked: serverEnv.USE_MOCK_PROVIDERS,
      providers,
    };

    return new NextResponse(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Request-Id": requestId,
        "Cache-Control": "no-store",
      },
    });
  }

  // Basic liveness check
  const livenessPayload: HealthResponse = {
    status: "ok",
    version: "1.0.0",
    uptimeS: Math.round(process.uptime()),
    mocked: serverEnv.USE_MOCK_PROVIDERS,
  };

  return new NextResponse(JSON.stringify(livenessPayload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
      "Cache-Control": "no-store",
    },
  });
}
