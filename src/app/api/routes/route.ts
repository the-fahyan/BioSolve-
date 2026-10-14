import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  RoutesRequestSchema,
  RoutesResponseSchema,
  RoutesResponse,
} from "@/lib/schemas";
import { haversineDistance } from "@/lib/geo";
import {
  getClientIp,
  checkRateLimit,
  createErrorResponse,
  generateRequestId,
  ServerTimingTracker,
} from "@/server/http/api-handler";
import { getProviders } from "@/server/providers/registry";
import { planRoutes } from "@/server/domain/route-planner";



const RATE_LIMIT = 10; // 10 req/min per IP
const MAX_DISTANCE_M = 15000;
const MIN_DISTANCE_M = 50;
const MAX_BODY_BYTES = 8 * 1024; // 8 KB

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const timing = new ServerTimingTracker();
  const ip = getClientIp(req);

  // ── Rate limiting ─────────────────────────────────────────────────────
  const rl = checkRateLimit(ip, "routes", RATE_LIMIT);
  if (!rl.allowed) {
    return createErrorResponse(
      429,
      "RATE_LIMITED",
      "Too many requests. Please wait before retrying.",
      requestId,
      { retryAfterSeconds: rl.resetSeconds },
      {
        "X-RateLimit-Limit": String(RATE_LIMIT),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rl.resetSeconds),
        "Retry-After": String(rl.resetSeconds),
      }
    );
  }

  // ── Body size check ────────────────────────────────────────────────────
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return createErrorResponse(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 8 KB limit.", requestId);
  }

  // ── Parse & validate body ──────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse(400, "VALIDATION_ERROR", "Invalid JSON body.", requestId);
  }

  let parsed: ReturnType<typeof RoutesRequestSchema.parse>;
  try {
    parsed = RoutesRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return createErrorResponse(
        400,
        "VALIDATION_ERROR",
        "Request validation failed.",
        requestId,
        {
          issues: err.issues.map((e) => ({
            path: e.path.map(String).join("."),
            message: e.message,
          })),
        }
      );
    }
    return createErrorResponse(400, "VALIDATION_ERROR", "Invalid request body.", requestId);
  }

  const { origin, destination, detourLimit } = parsed;

  // ── Distance validation ────────────────────────────────────────────────
  const distanceM = haversineDistance(origin, destination);

  if (distanceM < MIN_DISTANCE_M) {
    return createErrorResponse(
      422,
      "ROUTE_TOO_SHORT",
      `Origin and destination are too close (${Math.round(distanceM)}m). Minimum distance is 50m.`,
      requestId
    );
  }

  if (distanceM > MAX_DISTANCE_M) {
    return createErrorResponse(
      422,
      "ROUTE_TOO_LONG",
      `Straight-line distance (${Math.round(distanceM)}m) exceeds the 15km maximum.`,
      requestId
    );
  }

  // ── Plan routes ────────────────────────────────────────────────────────
  timing.start("total_compute");
  const providers = getProviders();

  let plannerOutput: Awaited<ReturnType<typeof planRoutes>>;
  try {
    plannerOutput = await planRoutes(
      { origin, destination, detourLimit, requestId },
      providers
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Route planning failed.";
    const code =
      err instanceof Error && "code" in err
        ? (err as { code: string }).code
        : undefined;

    if (code === "NO_ROUTE_FOUND") {
      return createErrorResponse(422, "NO_ROUTE_FOUND", message, requestId);
    }

    if (code === "ROUTING_UNAVAILABLE") {
      return createErrorResponse(503, "ROUTING_UNAVAILABLE", message, requestId);
    }

    console.error("[routes] Unexpected error:", message);
    return createErrorResponse(500, "INTERNAL", "An unexpected error occurred.", requestId);
  }

  timing.end("total_compute");

  const { response, timings } = plannerOutput;

  // ── Build final response ───────────────────────────────────────────────
  const responseBody: RoutesResponse = {
    requestId,
    generatedAt: new Date().toISOString(),
    ...response,
  };

  // Validate output schema (dev safeguard)
  if (process.env.NODE_ENV === "development") {
    RoutesResponseSchema.parse(responseBody);
  }

  const serverTimingParts: string[] = [];
  for (const [label, dur] of Object.entries(timings)) {
    serverTimingParts.push(`${label};dur=${dur}`);
  }
  serverTimingParts.push(`total;dur=${Math.round(performance.now())}`);

  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
    "Cache-Control": "no-store",
    "Server-Timing": serverTimingParts.join(", "),
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.resetSeconds),
  });

  return new NextResponse(JSON.stringify(responseBody), {
    status: 200,
    headers,
  });
}

export function GET() {
  return createErrorResponse(405, "METHOD_NOT_ALLOWED", "Use POST to compute routes.", generateRequestId());
}
