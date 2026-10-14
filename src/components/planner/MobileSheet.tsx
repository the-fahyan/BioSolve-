"use client";
import React from "react";
import { usePlannerStore } from "@/stores/planner-store";
import { ChevronUp, ChevronDown, Search, Leaf, Zap, Scale } from "lucide-react";
import { formatDuration, formatDistance } from "@/lib/format";
import { AqiBadge } from "@/components/ui/AqiBadge";
import clsx from "clsx";

interface MobileSheetProps {
  children: React.ReactNode;
}

export function MobileSheet({ children }: MobileSheetProps) {
  const {
    isMobileSheetExpanded,
    setIsMobileSheetExpanded,
    toggleMobileSheet,
    routesResult,
    selectedRouteId,
    sheet,
    pickMode,
  } = usePlannerStore();

  // If in pick mode on map, keep sheet collapsed so user can tap map freely
  const effectiveExpanded = isMobileSheetExpanded && pickMode === null;

  // Selected route summary for the collapsed bar
  const selectedRoute =
    routesResult?.routes.find((r) => r.id === selectedRouteId) ??
    routesResult?.routes[0];

  return (
    <div
      className={clsx(
        "lg:hidden fixed bottom-0 inset-x-0 z-30 pointer-events-none transition-all duration-300 ease-in-out",
        "md:max-w-xl md:mx-auto md:px-4 md:bottom-2"
      )}
    >
      <div
        className={clsx(
          "pointer-events-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out",
          effectiveExpanded
            ? "max-h-[80dvh] h-[75dvh]"
            : "h-[88px] overflow-hidden"
        )}
      >
        {/* Drag / Tap Handle Header (44px min touch target) */}
        <button
          type="button"
          onClick={toggleMobileSheet}
          aria-expanded={effectiveExpanded}
          aria-controls="mobile-sheet-content"
          aria-label={effectiveExpanded ? "Collapse route planner to view map" : "Expand route planner"}
          className="w-full pt-2 pb-1.5 px-4 flex flex-col items-center justify-center shrink-0 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer select-none border-b border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset"
        >
          {/* Visual Grab Bar */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-1" aria-hidden />

          {/* Expanded Top Bar with quick close */}
          {effectiveExpanded && (
            <div className="w-full flex items-center justify-between py-1 px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {sheet === "results" ? "Route Comparison" : "Trip Planner"}
              </span>
              <div className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                <span>View Map</span>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
              </div>
            </div>
          )}
        </button>

        {/* Collapsed State Bar Content (shown only when collapsed) */}
        {!effectiveExpanded && (
          <div
            onClick={() => setIsMobileSheetExpanded(true)}
            className="flex-1 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {routesResult && selectedRoute ? (
              // Collapsed state with computed routes
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedRoute.tags.includes("cleanest") ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 shrink-0">
                      <Leaf className="w-3 h-3 text-teal-600" aria-hidden />
                      Cleanest
                    </span>
                  ) : selectedRoute.tags.includes("fastest") ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 shrink-0">
                      <Zap className="w-3 h-3 text-blue-600" aria-hidden />
                      Fastest
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 shrink-0">
                      <Scale className="w-3 h-3 text-purple-600" aria-hidden />
                      Balanced
                    </span>
                  )}
                  <div className="text-xs text-slate-900 font-bold truncate">
                    {formatDuration(selectedRoute.durationS)}
                    <span className="text-slate-400 font-normal ml-1">
                      · {formatDistance(selectedRoute.distanceM)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedRoute.avgExposure !== null && selectedRoute.exposureCategory !== null && (
                    <AqiBadge
                      category={selectedRoute.exposureCategory}
                      value={selectedRoute.avgExposure}
                      compact
                    />
                  )}
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                    <span>{routesResult.routes.length} routes</span>
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden />
                  </div>
                </div>
              </div>
            ) : (
              // Collapsed state before search
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">
                      Where to?
                    </p>
                    <p className="text-xs text-slate-500 leading-tight">
                      Plan a clean-air walking route
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-full">
                  <span>Enter trip</span>
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Content Body (shown when expanded) */}
        {effectiveExpanded && (
          <div
            id="mobile-sheet-content"
            className="flex-1 overflow-y-auto overscroll-contain flex flex-col"
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
