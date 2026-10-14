export const EXPOSURE_CONFIG = {
  modelVersion: "1.0.0",
  exposureModel: "CAMS-IDW-RoadDecay-v1",

  // Roadside uplift factor (alpha)
  roadsideUplift: 0.8,

  // Exponential traffic factor distance decay length in meters
  decayLengthMeters: 60,

  // Road proximity search radius in meters
  searchRadiusMeters: 250,

  // Road hierarchy base weights W(r)
  roadWeights: {
    motorway: 1.0,
    trunk: 1.0,
    primary: 0.85,
    secondary: 0.65,
    tertiary: 0.4,
  } as const,

  // Multiplier applied to link roads (*_link)
  linkRoadMultiplier: 0.8,

  // Minimum denominator distance in meters for IDW 2D background interpolation
  idwMinDistanceMeters: 1000,

  // Detour bounds relative to fastest route
  detourLimits: {
    strict: 0.15, // <= 15%
    standard: 0.3, // <= 30%
    flexible: 0.5, // <= 50%
  } as const,

  // Minimum buffer added to fastest duration for short trips (seconds)
  minDetourBufferSeconds: 120,

  // Hard maximum detour cap (20 minutes in seconds)
  maxDetourSecondsCap: 1200,

  // Minimum exposure index reduction required to show cleanest route separately (%)
  minExposureReductionPct: 3,

  // Balanced route cost weights and eligibility threshold
  balancedRoute: {
    timeWeight: 0.5,
    exposureWeight: 0.5,
    maxCost: 1.0,
    minReductionPct: 2,
  },
} as const;

export type ExposureConfig = typeof EXPOSURE_CONFIG;
