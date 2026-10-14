import { Sparkles, MapPin, Wind } from "lucide-react";

export default function HomePage() {
  return (
    <main id="main-content" className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Planning Panel (Desktop >= 1024px) */}
      <section
        id="results-panel"
        aria-label="Trip Planner & Routes"
        className="w-full lg:w-[420px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto z-10 shadow-xs"
      >
        <div className="p-5 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
            <span>Eco-Route Walking Navigation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
            Plan your clean-air walk
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Compare pedestrian routes scored by real-time air quality and road traffic proximity.
          </p>
        </div>

        {/* Placeholder trip planner container to be wired in Phase 5 */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-600 text-sm">
              <MapPin className="w-5 h-5 text-teal-600 shrink-0" aria-hidden="true" />
              <span>Select starting location</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-600 text-sm">
              <MapPin className="w-5 h-5 text-slate-600 shrink-0" aria-hidden="true" />
              <span>Select destination</span>
            </div>
          </div>

          <div className="mt-auto pt-6 text-xs text-slate-400 border-t border-slate-100 flex items-center justify-between">
            <span>Powered by OpenStreetMap & Open-Meteo</span>
            <span className="tabular-nums">v1.0.0</span>
          </div>
        </div>
      </section>

      {/* Map Viewport Container */}
      <section
        id="map-container"
        aria-label="Interactive Route Map"
        className="flex-1 h-full relative bg-slate-100 flex items-center justify-center map-isolate"
      >
        <div className="text-center p-6 text-slate-400 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
            <Wind className="w-6 h-6 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-base">Interactive Map Engine</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Enter your origin and destination to preview walking paths and air quality layers.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
