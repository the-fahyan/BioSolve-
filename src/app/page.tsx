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
import { Sparkles, Wind, Leaf, Zap } from "lucide-react";

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
      <div className="flex-1 overflow-y-auto custom-scroll flex flex-col min-h-0 animate-fade-in">
        <ResultsPanel
          result={routesResult}
          onBack={onBackToSearch}
        />
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">Share this route</p>
          <CopyLinkButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scroll flex flex-col min-h-0">
      {/* Hero header */}
      <div className="p-5 sm:p-6 shrink-0 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(13,148,136,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          {/* Eco badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold mb-3 select-none">
            <Sparkles className="w-3 h-3 text-teal-500" aria-hidden />
            <span>Eco-Route Walking Navigation</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 leading-tight">
            Plan your{" "}
            <span className="gradient-text">clean-air</span>{" "}
            walk
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
            Compare pedestrian routes scored by real-time air quality and road proximity.
          </p>

          {/* Feature pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[
              { icon: Zap, label: "Fastest", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: Leaf, label: "Cleanest", color: "text-teal-700", bg: "bg-teal-50" },
              { icon: Wind, label: "Balanced", color: "text-violet-600", bg: "bg-violet-50" },
            ].map(({ icon: Icon, label, color, bg }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${bg} ${color}`}
              >
                <Icon className="w-2.5 h-2.5" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-5" />

      {/* Search form */}
      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        <SearchForm onSubmit={onSearch} isLoading={isLoadingRoutes} />

        {/* Error state */}
        {routeError && (
          <div
            role="alert"
            className="animate-fade-in p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5"
          >
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{routeError}</span>
          </div>
        )}

        {/* Footer credit */}
        <div className="mt-auto pt-4 text-xs text-slate-400 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1">
            <span className="live-dot" aria-hidden />
            Powered by OSM &amp; Open-Meteo
          </span>
          <span className="tabular-nums font-mono">v1.0.0</span>
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
      {/* ── Desktop Side Panel ────────────────────────────────────── */}
      <aside
        id="results-panel"
        aria-label="Trip Planner & Routes"
        className="hidden lg:flex lg:w-[400px] xl:w-[440px] shrink-0 bg-white border-r border-slate-200 flex-col h-full overflow-hidden z-10"
        style={{ boxShadow: "2px 0 16px -4px rgba(0,0,0,0.06)" }}
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

      {/* ── Interactive Map ──────────────────────────────────────── */}
      <section
        id="map-section"
        aria-label="Interactive Route Map"
        className="flex-1 h-full w-full relative bg-slate-100 map-isolate z-0"
      >
        <MapContainerLazy />
      </section>

      {/* ── Mobile / Tablet Bottom Sheet ────────────────────────── */}
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
