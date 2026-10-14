import { AqiCategory } from "./schemas";

export interface AqiMeta {
  category: AqiCategory;
  label: string;
  shortLabel: string;
  fill: string;
  text: string;
  min: number;
  max: number;
}

export const AQI_BREAKPOINTS: Record<AqiCategory, AqiMeta> = {
  good: {
    category: "good",
    label: "Good",
    shortLabel: "Good",
    fill: "#15803D",
    text: "#FFFFFF",
    min: 0,
    max: 50,
  },
  moderate: {
    category: "moderate",
    label: "Moderate",
    shortLabel: "Mod",
    fill: "#EAB308",
    text: "#1C1917",
    min: 51,
    max: 100,
  },
  usg: {
    category: "usg",
    label: "Unhealthy for sensitive groups",
    shortLabel: "USG",
    fill: "#C2410C",
    text: "#FFFFFF",
    min: 101,
    max: 150,
  },
  unhealthy: {
    category: "unhealthy",
    label: "Unhealthy",
    shortLabel: "Unhealthy",
    fill: "#B91C1C",
    text: "#FFFFFF",
    min: 151,
    max: 200,
  },
  very_unhealthy: {
    category: "very_unhealthy",
    label: "Very unhealthy",
    shortLabel: "V. Unhealthy",
    fill: "#7E22CE",
    text: "#FFFFFF",
    min: 201,
    max: 300,
  },
  hazardous: {
    category: "hazardous",
    label: "Hazardous",
    shortLabel: "Hazardous",
    fill: "#7F1D1D",
    text: "#FFFFFF",
    min: 301,
    max: 500,
  },
};

/**
 * Categorize a numeric US AQI / Exposure Index value into one of the 6 standard EPA categories.
 * Values are rounded to the nearest integer and clamped within [0, 500].
 */
export function categorizeAqi(rawVal: number): AqiCategory {
  const val = Math.round(Math.max(0, Math.min(500, rawVal)));

  if (val <= 50) return "good";
  if (val <= 100) return "moderate";
  if (val <= 150) return "usg";
  if (val <= 200) return "unhealthy";
  if (val <= 300) return "very_unhealthy";
  return "hazardous";
}

/**
 * Retrieve metadata (colors, labels, range) for an AQI category.
 */
export function getAqiMeta(category: AqiCategory): AqiMeta {
  return AQI_BREAKPOINTS[category];
}
