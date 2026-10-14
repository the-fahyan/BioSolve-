"use client";
import { useCallback, Suspense } from "react";
import { usePlannerStore } from "@/stores/planner-store";
import { useRouteMutation } from "@/hooks/use-planner-data";
import { useUrlSync } from "@/hooks/use-url-sync";
import { SearchForm } from "@/components/planner/SearchForm";
import { ResultsPanel } from "@/components/planner/ResultsPanel";
import { MapContainerLazy } from "@/components/map/MapContainerLazy";
import { CopyLinkButton } from "@/components/planner/CopyLinkButton";
import { saveRecentPlace } from "@/lib/storage";
import { Sparkles } from "lucide-react";

// Inner component that uses useSearchParams (wrapped in Suspense)
function PlannerContent() {
  const {
    origin,
    destination,
    detourLimit,
    routesResult,
    isLoadingRoutes,
    routeError,
    sheet,
    setRoutesResult,
    setIsLoadingRoutes,
    setRouteError,
    setSheet,
  } = usePlannerStore();

  const { mutateAsync: fetchRoutes } = useRouteMutation();
  const { pushUrl } = useUrlSync();

  const handleSearch = useCallback(async () => {
    if (!origin || !destination) return;

    setIsLoadingRoutes(true);
    setRouteError(null);
    pushUrl(); // Update URL with current state

    try {
      const result = await fetchRoutes({ origin, destination, detourLimit });
      setRoutesResult(result);
      setSheet("results");

      // Save to recents
      if (origin.label)
        saveRecentPlace({ label: origin.label, lat: origin.lat, lng: origin.lng });
      if (destination.label)
        saveRecentPlace({ label: destination.label, lat: destination.lat, lng: destination.lng });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setRouteError(msg);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [origin, destination, detourLimit, fetchRoutes, pushUrl, setIsLoadingRoutes, setRouteError, setRoutesResult, setSheet]);

  return (
    <main
      id="main-content"
      className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      {/* ── Left Panel ── */}
      <section
        id="results-panel"
        aria-label="Trip Planner & Routes"
        className="w-full lg:w-[420px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden z-10 shadow-xs"
      >
        {sheet === "results" && routesResult ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <ResultsPanel
              result={routesResult}
              onBack={() => setSheet("search")}
            />
            <div className="px-4 pb-3 border-t border-slate-100 flex justify-end">
              <CopyLinkButton />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden />
                <span>Eco-Route Walking Navigation</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
                Plan your clean-air walk
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Compare pedestrian routes scored by real-time air quality and
                road traffic proximity.
              </p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <SearchForm onSubmit={handleSearch} isLoading={isLoadingRoutes} />

              {routeError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
                >
                  {routeError}
                </div>
              )}

              <div className="mt-auto pt-4 text-xs text-slate-400 border-t border-slate-100 flex items-center justify-between">
                <span>Powered by OpenStreetMap &amp; Open-Meteo</span>
                <span className="tabular-nums">v1.0.0</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Map Viewport ── */}
      <section
        id="map-section"
        aria-label="Interactive Route Map"
        className="flex-1 h-full relative bg-slate-100 map-isolate"
      >
        <MapContainerLazy />
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <PlannerContent />
    </Suspense>
  );
}
