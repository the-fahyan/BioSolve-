import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getProviders } from "@/server/providers/registry";
import {
  checkRateLimit,
  getClientIp,
  createErrorResponse,
  generateRequestId,
  ServerTimingTracker,
} from "@/server/http/api-handler";
import { serverEnv } from "@/server/config/env";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timing = new ServerTimingTracker();
  const clientIp = getClientIp(req);

  // Rate limiting (40 req/min)
  const rl = checkRateLimit(clientIp, "geocode", serverEnv.RATE_LIMIT_GEOCODE_PER_MIN);
  if (!rl.allowed) {
    return createErrorResponse(
      429,
      "RATE_LIMITED",
      "Rate limit exceeded. Please wait before retrying.",
      requestId,
      { retryAfterSeconds: rl.resetSeconds },
      { "Retry-After": String(rl.resetSeconds) }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return createErrorResponse(
      400,
      "VALIDATION_ERROR",
      "Query parameter 'q' must be at least 2 characters.",
      requestId,
      { issues: [{ path: "q", message: "Must be >= 2 characters" }] }
    );
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(10, Math.max(1, parseInt(limitParam, 10) || 5)) : 5;

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  let bias: { lat: number; lng: number } | undefined;
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) {
      bias = { lat, lng };
    }
  }

  const explicit = searchParams.get("explicit") === "1" || searchParams.get("explicit") === "true";

  timing.start("geocode");
  try {
    const providers = getProviders();
    const result = await providers.geocoding.search({
      query: q,
      limit,
      bias,
      explicit,
    });
    timing.end("geocode");

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Request-Id": requestId,
        "Server-Timing": timing.getHeaderString(),
        "Cache-Control": "private, max-age=300",
        "X-RateLimit-Limit": String(serverEnv.RATE_LIMIT_GEOCODE_PER_MIN),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetSeconds),
      },
    });
  } catch {
    timing.end("geocode");
    return createErrorResponse(
      503,
      "GEOCODING_UNAVAILABLE",
      "Geocoding service is temporarily unavailable. Please try picking a location on the map.",
      requestId
    );
  }
}
