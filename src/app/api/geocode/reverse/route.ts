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
import { LatLngSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const timing = new ServerTimingTracker();
  const clientIp = getClientIp(req);

  // Rate limiting (20 req/min)
  const rl = checkRateLimit(clientIp, "geocode_reverse", serverEnv.RATE_LIMIT_REVERSE_PER_MIN);
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
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  const parsedCoord = LatLngSchema.safeParse({
    lat: latParam ? parseFloat(latParam) : NaN,
    lng: lngParam ? parseFloat(lngParam) : NaN,
  });

  if (!parsedCoord.success) {
    return createErrorResponse(
      400,
      "VALIDATION_ERROR",
      "Valid latitude (-90 to 90) and longitude (-180 to 180) are required.",
      requestId,
      {
        issues: parsedCoord.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      }
    );
  }

  timing.start("reverse");
  try {
    const providers = getProviders();
    const result = await providers.geocoding.reverse(parsedCoord.data);
    timing.end("reverse");

    return new NextResponse(
      JSON.stringify({
        place: result.place,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          "Server-Timing": timing.getHeaderString(),
          "Cache-Control": "private, max-age=300",
          "X-RateLimit-Limit": String(serverEnv.RATE_LIMIT_REVERSE_PER_MIN),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetSeconds),
        },
      }
    );
  } catch {
    timing.end("reverse");
    // Graceful fallback: return null place rather than 500
    return new NextResponse(
      JSON.stringify({
        place: {
          lat: parsedCoord.data.lat,
          lng: parsedCoord.data.lng,
          label: `Selected Location (${parsedCoord.data.lat.toFixed(4)}, ${parsedCoord.data.lng.toFixed(4)})`,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          "Server-Timing": timing.getHeaderString(),
        },
      }
    );
  }
}
