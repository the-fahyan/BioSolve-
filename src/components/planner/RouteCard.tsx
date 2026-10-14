"use client";
import { RouteResult } from "@/lib/schemas";
import { AqiBadge } from "@/components/ui/AqiBadge";
import { formatDistance, formatDuration } from "@/lib/format";
import { Zap, Leaf, Scale, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

interface RouteCardProps {
  route: RouteResult;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (id: string) => void;
}

const TAG_CONFIG = {
  fastest: {
    icon: Zap,
    label: "Fastest",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  cleanest: {
    icon: Leaf,
    label: "Cleanest",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  balanced: {
    icon: Scale,
    label: "Balanced",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
} as const;

export function RouteCard({ route, isSelected, isRecommended, onSelect }: RouteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasFastest = route.tags.includes("fastest");
  const hasCleanest = route.tags.includes("cleanest");

  return (
    <div
      id={`route-card-${route.id}`}
      className={clsx(
        "rounded-2xl border-2 transition-all cursor-pointer overflow-hidden",
        isSelected
          ? "border-teal-500 bg-teal-50/30 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      )}
      onClick={() => onSelect(route.id)}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {route.tags.map((tag) => {
              const cfg = TAG_CONFIG[tag];
              const Icon = cfg.icon;
              return (
                <span
                  key={tag}
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                    cfg.bg,
                    cfg.text,
                    cfg.border
                  )}
                >
                  <Icon className="w-3 h-3" aria-hidden />
                  {cfg.label}
                </span>
              );
            })}
            {isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-600 text-white">
                Recommended
              </span>
            )}
          </div>

          {/* Selection indicator */}
          <div
            className={clsx(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
              isSelected ? "border-teal-600 bg-teal-600" : "border-slate-300"
            )}
            aria-hidden
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                <path d="M4 6.5L2 4.5l-1 1L4 8.5l6-6-1-1L4 6.5z" />
              </svg>
            )}
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Duration</p>
            <p className="text-lg font-bold text-slate-900">
              {formatDuration(route.durationS)}
            </p>
            {route.vsFastest.extraSeconds > 0 && (
              <p className="text-xs text-slate-400">
                +{formatDuration(route.vsFastest.extraSeconds)} vs fastest
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Distance</p>
            <p className="text-lg font-bold text-slate-900">
              {formatDistance(route.distanceM)}
            </p>
          </div>
        </div>

        {/* AQI exposure */}
        {route.avgExposure !== null && route.exposureCategory !== null ? (
          <div className="flex items-center gap-3">
            <AqiBadge category={route.exposureCategory} value={route.avgExposure} compact />
            <div>
              <p className="text-xs text-slate-500">Avg air quality exposure</p>
              {route.vsFastest.exposureReductionPct !== null &&
                route.vsFastest.exposureReductionPct > 0 && (
                  <p className="text-xs font-semibold text-teal-700">
                    {route.vsFastest.exposureReductionPct}% cleaner than fastest
                  </p>
                )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Air quality data unavailable</p>
        )}
      </div>

      {/* Expandable details */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          aria-expanded={expanded}
          aria-controls={`route-details-${route.id}`}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <span>{expanded ? "Hide details" : "Show details"}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>

        {expanded && (
          <div
            id={`route-details-${route.id}`}
            className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm"
          >
            {route.maxExposure !== null && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Peak exposure</p>
                <p className="font-semibold text-slate-800">AQI {route.maxExposure}</p>
              </div>
            )}
            {route.nearTrafficPct !== null && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Near traffic</p>
                <p className="font-semibold text-slate-800">{route.nearTrafficPct}% of route</p>
              </div>
            )}
            {hasFastest && hasCleanest && (
              <div className="col-span-2">
                <p className="text-xs text-teal-700 font-medium">
                  This is both the fastest and cleanest available route.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
