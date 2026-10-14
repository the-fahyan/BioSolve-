import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  USE_MOCK_PROVIDERS: z
    .union([z.string().transform((val) => val === "true"), z.boolean()])
    .default(false),
  PHOTON_BASE_URL: z.string().url().default("https://photon.komoot.io"),
  NOMINATIM_BASE_URL: z.string().url().default("https://nominatim.openstreetmap.org"),
  OSRM_BASE_URL: z.string().url().default("https://routing.openstreetmap.de/routed-foot"),
  OPEN_METEO_BASE_URL: z.string().url().default("https://air-quality-api.open-meteo.com"),
  OVERPASS_PRIMARY_URL: z.string().url().default("https://overpass-api.de/api/interpreter"),
  OVERPASS_MIRROR_URL: z.string().url().default("https://overpass.private.coffee/api/interpreter"),
  UPSTREAM_USER_AGENT: z.string().min(5).default("BreatheWay/1.0 (contact: info@breatheway.local)"),
  RATE_LIMIT_ROUTES_PER_MIN: z.coerce.number().default(10),
  RATE_LIMIT_GEOCODE_PER_MIN: z.coerce.number().default(40),
  RATE_LIMIT_REVERSE_PER_MIN: z.coerce.number().default(20),
  RATE_LIMIT_AQI_PER_MIN: z.coerce.number().default(30),
  OVERPASS_SOFT_TIMEOUT_MS: z.coerce.number().default(12000),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

export function loadEnv(rawEnv: Record<string, unknown> = process.env): ServerEnv {
  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Server Environment Configuration Validation Failed: ${errorDetails}`);
  }

  const env = parsed.data;

  // Rule 1.3 / T-22: Mocks strictly prohibited in production
  if (env.NODE_ENV === "production" && env.USE_MOCK_PROVIDERS === true) {
    throw new Error(
      "Configuration Error: USE_MOCK_PROVIDERS is strictly prohibited when NODE_ENV=production."
    );
  }

  return env;
}

export const serverEnv = loadEnv();
