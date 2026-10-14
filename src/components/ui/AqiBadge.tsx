import React from "react";
import { clsx } from "clsx";

export type AqiCategoryType =
  | "good"
  | "moderate"
  | "usg"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export interface AqiBadgeConfig {
  label: string;
  shortLabel: string;
  fill: string;
  text: string;
  border: string;
}

export const aqiCategoryDetails: Record<AqiCategoryType, AqiBadgeConfig> = {
  good: {
    label: "Good",
    shortLabel: "Good",
    fill: "bg-[#15803D]",
    text: "text-white",
    border: "border-[#15803D]",
  },
  moderate: {
    label: "Moderate",
    shortLabel: "Mod",
    fill: "bg-[#EAB308]",
    text: "text-[#1C1917]",
    border: "border-[#CA8A04]",
  },
  usg: {
    label: "Unhealthy for sensitive groups",
    shortLabel: "USG",
    fill: "bg-[#C2410C]",
    text: "text-white",
    border: "border-[#C2410C]",
  },
  unhealthy: {
    label: "Unhealthy",
    shortLabel: "Unhealthy",
    fill: "bg-[#B91C1C]",
    text: "text-white",
    border: "border-[#B91C1C]",
  },
  very_unhealthy: {
    label: "Very unhealthy",
    shortLabel: "V. Unhealthy",
    fill: "bg-[#7E22CE]",
    text: "text-white",
    border: "border-[#7E22CE]",
  },
  hazardous: {
    label: "Hazardous",
    shortLabel: "Hazardous",
    fill: "bg-[#7F1D1D]",
    text: "text-white",
    border: "border-[#7F1D1D]",
  },
};

interface AqiBadgeProps {
  value?: number | null;
  category?: AqiCategoryType | null;
  compact?: boolean;
  className?: string;
  showCategoryLabel?: boolean;
}

export function AqiBadge({
  value,
  category = "good",
  compact = false,
  className,
  showCategoryLabel = true,
}: AqiBadgeProps) {
  const activeCategory: AqiCategoryType = category ?? "good";
  const config = aqiCategoryDetails[activeCategory];
  const roundedValue = value !== null && value !== undefined ? Math.round(value) : null;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-semibold rounded-md border shadow-2xs tabular-nums",
        config.fill,
        config.text,
        config.border,
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className
      )}
      aria-label={`Air Quality Index: ${roundedValue ?? "Unavailable"}, Category: ${config.label}`}
    >
      {roundedValue !== null && (
        <span className="font-bold tracking-tight">{roundedValue}</span>
      )}
      {showCategoryLabel && (
        <span className={clsx(compact ? "text-[11px]" : "text-xs", "font-medium opacity-95")}>
          {compact ? config.shortLabel : config.label}
        </span>
      )}
    </span>
  );
}
