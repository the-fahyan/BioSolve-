import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";

describe("Health API Route Handler (src/app/api/health/route.ts)", () => {
  it("returns 200 with basic liveness payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/health");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBe("1.0.0");
    expect(body.uptimeS).toBeGreaterThanOrEqual(0);
  });

  it("handles deep health check (?deep=1) gracefully", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      return new Response("{}", { status: 200 });
    });

    const req = new NextRequest("http://localhost:3000/api/health?deep=1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.providers).toBeDefined();
  });
});
