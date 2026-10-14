import { describe, it, expect } from "vitest";
import { loadEnv } from "@/server/config/env";

describe("Server Environment Validation (T-22)", () => {
  it("loads valid default configuration in development", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      USE_MOCK_PROVIDERS: "false",
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.USE_MOCK_PROVIDERS).toBe(false);
    expect(env.PHOTON_BASE_URL).toBe("https://photon.komoot.io");
  });

  it("throws initialization error if USE_MOCK_PROVIDERS=true in production (T-22)", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        USE_MOCK_PROVIDERS: "true",
      })
    ).toThrow(/USE_MOCK_PROVIDERS is strictly prohibited when NODE_ENV=production/);
  });
});
