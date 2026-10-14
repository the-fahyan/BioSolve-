"use client";
import { useCallback, Suspense } from "react";
import { usePlannerStore, PlannerSheet } from "@/stores/planner-store";
import { useRouteMutation } from "@/hooks/use-planner-data";
import { useUrlSync } from "@/hooks/use-url-sync";
import { SearchForm } from "@/components/planner/SearchForm";
import { ResultsPanel } from "@/components/planner/ResultsPanel";
import { MobileSheet } from "@/components/planner/MobileSheet";
import { MapContainerLazy } from "@/components/map/MapContainerLazy";
import { CopyLinkButton } from "@/components/planner/CopyLinkButton";
import { saveRecentPlace } from "@/lib/storage";
import { RoutesResponse } from "@/lib/schemas";
import { Sparkles } from "lucide-react";

interface PanelContentProps {
  sheet: PlannerSheet;
  routesResult: RoutesResponse | null;
  isLoadingRoutes: boolean;
  routeError: string | null;
  onSearch: () => void;
  onBackToSearch: () => void;
}

function PanelContent({
  sheet,
  routesResult,
  isLoadingRoutes,
  routeError,
  onSearch,
  onBackToSearch,
}: PanelContentProps) {
  if (sheet === "results" && routesResult) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <ResultsPanel
          result={routesResult}
          onBack={onBackToSearch}
        />
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex justify-end shrink-0">
          <CopyLinkButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden />
          <span>Eco-Route Walking Navigation</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">
          Plan your clean-air walk
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Compare pedestrian routes scored by real-time air quality and road traffic proximity.
        </p>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        <SearchForm onSubmit={onSearch} isLoading={isLoadingRoutes} />

        {routeError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {routeError}
          </div>
        )}

        <div className="mt-auto pt-4 text-xs text-slate-400 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span>Powered by OSM &amp; Open-Meteo</span>
          <span className="tabular-nums">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

// Inner component wrapped in Suspense for useSearchParams
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
    pushUrl(); // Sync URL with current query parameters

    try {
      const result = await fetchRoutes({ origin, destination, detourLimit });
      setRoutesResult(result);
      setSheet("results");

      // Save valid named locations to recents
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
  }, [
    origin,
    destination,
    detourLimit,
    fetchRoutes,
    pushUrl,
    setIsLoadingRoutes,
    setRouteError,
    setRoutesResult,
    setSheet,
  ]);

  return (
    <main
      id="main-content"
      className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-3.5rem)] relative overflow-hidden"
    >
      {/* ── Desktop Side Panel (Hidden on Mobile/Tablet, visible >= 1024px) ── */}
      <aside
        id="results-panel"
        aria-label="Trip Planner & Routes"
        className="hidden lg:flex lg:w-[420px] xl:w-[460px] shrink-0 bg-white border-r border-slate-200 flex-col h-full overflow-hidden z-10 shadow-xs"
      >
        <PanelContent
          sheet={sheet}
          routesResult={routesResult}
          isLoadingRoutes={isLoadingRoutes}
          routeError={routeError}
          onSearch={handleSearch}
          onBackToSearch={() => setSheet("search")}
        />
      </aside>

      {/* ── Interactive Map Viewport (Fills screen on mobile & fills right column on desktop) ── */}
      <section
        id="map-section"
        aria-label="Interactive Route Map"
        className="flex-1 h-full w-full relative bg-slate-100 map-isolate z-0"
      >
        <MapContainerLazy />
      </section>

      {/* ── Mobile & Tablet Bottom Sheet (Visible < 1024px) ── */}
      <MobileSheet>
        <PanelContent
          sheet={sheet}
          routesResult={routesResult}
          isLoadingRoutes={isLoadingRoutes}
          routeError={routeError}
          onSearch={handleSearch}
          onBackToSearch={() => setSheet("search")}
        />
      </MobileSheet>
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
