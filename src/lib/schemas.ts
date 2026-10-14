import { z } from "zod";

// ==========================================
// 1. Primitive Geospatial & Core Schemas
// ==========================================

export const LatLngSchema = z.object({
  lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90),
  lng: z.number().min(-180, "Longitude must be between -180 and 180").max(180),
});

export const PlaceSchema = LatLngSchema.extend({
  label: z.string().trim().max(120, "Label cannot exceed 120 characters").optional(),
});

export const DetourLimitSchema = z.enum(["strict", "standard", "flexible"]);

export const AqiCategorySchema = z.enum([
  "good",
  "moderate",
  "usg",
  "unhealthy",
  "very_unhealthy",
  "hazardous",
]);

export const RouteTagSchema = z.enum(["fastest", "cleanest", "balanced"]);

// ==========================================
// 2. Route Computation API Contracts
// ==========================================

export const RoutesRequestSchema = z
  .object({
    origin: PlaceSchema,
    destination: PlaceSchema,
    detourLimit: DetourLimitSchema.default("standard"),
  })
  .strict();

export const GeoJsonLineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

export const RouteVsFastestSchema = z.object({
  extraSeconds: z.number().int(),
  extraMeters: z.number().int(),
  exposureReductionPct: z.number().nullable(),
});

export const RouteResultSchema = z.object({
  id: z.string().min(1),
  tags: z.array(RouteTagSchema).min(1),
  distanceM: z.number().nonnegative(),
  durationS: z.number().nonnegative(),
  avgExposure: z.number().nonnegative().nullable(),
  maxExposure: z.number().nonnegative().nullable(),
  exposureCategory: AqiCategorySchema.nullable(),
  nearTrafficPct: z.number().min(0).max(100).nullable(),
  vsFastest: RouteVsFastestSchema,
  geometry: GeoJsonLineStringSchema,
  exposure: z.array(z.number().int().nonnegative()).nullable(),
});

export const BackgroundAqiSchema = z.object({
  usAqi: z.number().min(0).max(500),
  category: AqiCategorySchema,
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  observedAt: z.string().datetime(),
  source: z.literal("open-meteo-cams"),
  gridSamples: z.number().int().min(1),
});

export const RoutesMetaSchema = z.object({
  modelVersion: z.string(),
  exposureModel: z.string(),
  providers: z.object({
    routing: z.string(),
    aqi: z.string(),
    roads: z.string(),
  }),
  candidatesEvaluated: z.number().int(),
  degraded: z.array(z.string()),
  mocked: z.boolean(),
  cache: z.object({
    routing: z.enum(["hit", "miss"]),
    aqi: z.enum(["hit", "miss"]),
    roads: z.enum(["hit", "miss"]),
  }),
  computeMs: z.number().nonnegative(),
});

export const RoutesResponseSchema = z.object({
  requestId: z.string().min(1),
  generatedAt: z.string().datetime(),
  origin: PlaceSchema,
  destination: PlaceSchema,
  background: BackgroundAqiSchema.nullable(),
  recommendedRouteId: z.string().min(1),
  routes: z.array(RouteResultSchema).min(1).max(3),
  meta: RoutesMetaSchema,
});

// ==========================================
// 3. Geocoding API Contracts
// ==========================================

export const GeocodeResultItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  secondaryLabel: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  kind: z.string().optional(),
});

export const GeocodeResponseSchema = z.object({
  provider: z.enum(["photon", "nominatim"]),
  results: z.array(GeocodeResultItemSchema),
});

export const ReverseGeocodeResponseSchema = z.object({
  place: PlaceSchema.nullable(),
});

// ==========================================
// 4. Standalone Air Quality Contract
// ==========================================

export const AqiReadingSchema = z.object({
  usAqi: z.number().min(0).max(500),
  category: AqiCategorySchema,
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  observedAt: z.string().datetime(),
  source: z.literal("open-meteo-cams"),
});

// ==========================================
// 5. Health Check API Contracts
// ==========================================

export const ProviderHealthCheckSchema = z.object({
  ok: z.boolean(),
  ms: z.number().nonnegative(),
  error: z.string().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  uptimeS: z.number().nonnegative(),
  mocked: z.boolean(),
  providers: z.record(z.string(), ProviderHealthCheckSchema).optional(),
});

// ==========================================
// 6. Unified Error Envelope Contract
// ==========================================

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "METHOD_NOT_ALLOWED",
  "PAYLOAD_TOO_LARGE",
  "ROUTE_TOO_SHORT",
  "ROUTE_TOO_LONG",
  "NO_ROUTE_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_ERROR",
  "ROUTING_UNAVAILABLE",
  "AQI_UNAVAILABLE",
  "GEOCODING_UNAVAILABLE",
  "UPSTREAM_TIMEOUT",
  "INTERNAL",
]);

export const ErrorDetailIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z
      .object({
        issues: z.array(ErrorDetailIssueSchema).optional(),
        retryAfterSeconds: z.number().optional(),
      })
      .passthrough()
      .optional(),
    requestId: z.string(),
  }),
});

// ==========================================
// 7. Client Storage Schemas (localStorage)
// ==========================================

export const RecentPlaceItemSchema = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  ts: z.number(),
});

export const ClientRecentsStorageSchema = z.array(RecentPlaceItemSchema).max(8);

export const ClientPrefsStorageSchema = z.object({
  detourLimit: DetourLimitSchema.default("standard"),
});

// Type Inferences
export type LatLng = z.infer<typeof LatLngSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type DetourLimit = z.infer<typeof DetourLimitSchema>;
export type AqiCategory = z.infer<typeof AqiCategorySchema>;
export type RouteTag = z.infer<typeof RouteTagSchema>;
export type RoutesRequest = z.infer<typeof RoutesRequestSchema>;
export type RouteResult = z.infer<typeof RouteResultSchema>;
export type RoutesResponse = z.infer<typeof RoutesResponseSchema>;
export type GeocodeResultItem = z.infer<typeof GeocodeResultItemSchema>;
export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>;
export type ReverseGeocodeResponse = z.infer<typeof ReverseGeocodeResponseSchema>;
export type AqiReading = z.infer<typeof AqiReadingSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type RecentPlaceItem = z.infer<typeof RecentPlaceItemSchema>;
export type ClientPrefsStorage = z.infer<typeof ClientPrefsStorageSchema>;
