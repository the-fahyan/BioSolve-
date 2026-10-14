"use client";
import { RoutesResponse } from "@/lib/schemas";
import { usePlannerStore } from "@/stores/planner-store";
import { RouteCard } from "./RouteCard";
import { AqiBadge } from "@/components/ui/AqiBadge";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { ArrowLeft } from "lucide-react";

interface ResultsPanelProps {
  result: RoutesResponse;
  onBack: () => void;
}

export function ResultsPanel({ result, onBack }: ResultsPanelProps) {
  const { selectedRouteId, setSelectedRouteId } = usePlannerStore();

  const degradedFlags = result.meta.degraded;
  const isMocked = result.meta.mocked;

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to trip search"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {result.routes.length} route{result.routes.length > 1 ? "s" : ""} found
          </h2>
          <p className="text-xs text-slate-500">
            {result.origin.label ?? "Origin"} → {result.destination.label ?? "Destination"}
          </p>
        </div>
      </div>

      {/* Degradation banners */}
      <div className="px-4 pt-3 space-y-2">
        {isMocked && (
          <StatusBanner variant="warning">
            Demo mode: using mock data providers, not live APIs.
          </StatusBanner>
        )}
        {degradedFlags.includes("aqi_unavailable") && (
          <StatusBanner variant="warning">
            Air quality data is currently unavailable. Showing fastest route only.
          </StatusBanner>
        )}
        {degradedFlags.includes("roads_unavailable") && (
          <StatusBanner variant="info">
            Road proximity data is unavailable. Exposure scores use regional air quality only.
          </StatusBanner>
        )}
        {degradedFlags.includes("alternatives_unavailable") && (
          <StatusBanner variant="info">
            Only one route candidate was found for this trip.
          </StatusBanner>
        )}
      </div>

      {/* Background AQI summary */}
      {result.background && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <AqiBadge category={result.background.category} value={result.background.usAqi} compact />
          <div>
            <p className="text-xs font-semibold text-slate-700">Area air quality</p>
            <p className="text-xs text-slate-500">
              Regional AQI avg from {result.background.gridSamples} grid samples
            </p>
          </div>
        </div>
      )}

      {/* Route cards */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        aria-live="polite"
        aria-atomic="false"
      >
        {result.routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteId === route.id}
            isRecommended={result.recommendedRouteId === route.id}
            onSelect={setSelectedRouteId}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
        <span>
          {result.meta.candidatesEvaluated} candidates evaluated in {result.meta.computeMs}ms
        </span>
        <span className={result.meta.cache.routing === "hit" ? "text-teal-600" : ""}>
          {result.meta.cache.routing === "hit" ? "Cached" : "Fresh"}
        </span>
      </div>
    </div>
  );
}
