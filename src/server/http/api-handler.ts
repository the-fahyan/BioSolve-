import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ErrorCode, ErrorEnvelope } from "@/lib/schemas";

// In-memory sliding-window rate limiter
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export function checkRateLimit(
  ip: string,
  bucketKey: string,
  limitPerMinute: number
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const key = `${bucketKey}:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within sliding 60-second window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limitPerMinute) {
    const oldest = record.timestamps[0] ?? now;
    const resetMs = Math.max(1000, oldest + windowMs - now);
    const resetSeconds = Math.ceil(resetMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = limitPerMinute - record.timestamps.length;
  const resetSeconds = 60;

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}

export class ServerTimingTracker {
  private timings: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  private totalStart: number;

  constructor() {
    this.totalStart = performance.now();
  }

  public start(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  public end(label: string): void {
    const start = this.startTimes.get(label);
    if (start !== undefined) {
      this.timings.set(label, Math.round(performance.now() - start));
      this.startTimes.delete(label);
    }
  }

  public getHeaderString(): string {
    const parts: string[] = [];
    for (const [label, dur] of this.timings.entries()) {
      parts.push(`${label};dur=${dur}`);
    }
    const total = Math.round(performance.now() - this.totalStart);
    parts.push(`total;dur=${total}`);
    return parts.join(", ");
  }
}

export function createErrorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): NextResponse<ErrorEnvelope> {
  const payload: ErrorEnvelope = {
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  };

  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
    "Cache-Control": "no-store",
    ...(extraHeaders || {}),
  });

  return new NextResponse(JSON.stringify(payload), {
    status,
    headers,
  });
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
