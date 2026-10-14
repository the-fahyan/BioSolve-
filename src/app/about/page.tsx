import type { Metadata } from "next";
import { Wind, Leaf, Shield, Database, ExternalLink, Target } from "lucide-react";
import { EXPOSURE_CONFIG } from "@/lib/exposure-config";

export const metadata: Metadata = {
  title: "About BreatheWay — Methodology & Data Sources",
  description:
    "Learn how BreatheWay scores walking routes for air quality using the CAMS exposure model, road proximity weighting, and open data from OpenStreetMap and Open-Meteo.",
};

export default function AboutPage() {
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">

      {/* Hero */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-4">
          <Wind className="w-3.5 h-3.5" aria-hidden />
          Transparent Methodology
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
          How BreatheWay works
        </h1>
        <p className="text-slate-600 text-base leading-relaxed">
          BreatheWay is a free, open-source pedestrian navigation tool that compares
          walking routes not just by speed, but by estimated air quality exposure.
          This page explains the methodology, data sources, and limitations so you
          can make informed choices.
        </p>
      </div>

      {/* Methodology */}
      <section id="methodology" aria-labelledby="methodology-heading" className="mb-12">
        <h2 id="methodology-heading" className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-teal-600" aria-hidden />
          Scoring methodology
        </h2>

        <div className="prose prose-slate max-w-none text-sm">
          <h3 className="font-semibold text-slate-800 mt-6 mb-2">Exposure Index (EI) formula</h3>
          <p className="text-slate-600 mb-3">
            For each vertex <em>p</em> along a candidate route, BreatheWay computes:
          </p>
          <div className="bg-slate-900 text-green-400 rounded-xl px-5 py-4 font-mono text-sm mb-4 overflow-x-auto">
            EI(p) = clamp(bg(p) × (1 + α × tf(p)), 0, 500)
          </div>
          <p className="text-slate-600 mb-1">Where:</p>
          <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-4">
            <li>
              <strong>α = {EXPOSURE_CONFIG.roadsideUplift}</strong> — roadside uplift factor
              (max {Math.round(EXPOSURE_CONFIG.roadsideUplift * 100)}% uplift near major roads)
            </li>
            <li>
              <strong>bg(p)</strong> — background US AQI at point <em>p</em>, computed via
              Inverse Distance Weighting (IDW) from a 3×3 grid of CAMS samples at{" "}
              {EXPOSURE_CONFIG.searchRadiusMeters / 1000} km spacing
            </li>
            <li>
              <strong>tf(p)</strong> — traffic factor from nearby road segments within{" "}
              {EXPOSURE_CONFIG.searchRadiusMeters}m, using exponential decay:{" "}
              max(W(r) × exp(−d / {EXPOSURE_CONFIG.decayLengthMeters}))
            </li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-6 mb-2">Road class weights W(r)</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Road type</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-700">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(EXPOSURE_CONFIG.roadWeights).map(([road, weight]) => (
                  <tr key={road}>
                    <td className="px-4 py-2 text-slate-700 font-mono">{road}</td>
                    <td className="px-4 py-2 text-right text-slate-700 tabular-nums">{weight}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2 text-slate-500 font-mono">*_link</td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    {EXPOSURE_CONFIG.linkRoadMultiplier}× parent weight
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold text-slate-800 mt-6 mb-2">Route selection rules</h3>
          <ul className="list-disc pl-5 text-slate-600 space-y-1 mb-2">
            <li>
              <strong>Fastest</strong>: minimum walking duration
            </li>
            <li>
              <strong>Cleanest</strong>: minimum average EI within detour budget. Only shown
              separately if exposure reduction ≥{" "}
              {EXPOSURE_CONFIG.minExposureReductionPct}% vs fastest
            </li>
            <li>
              <strong>Balanced</strong>: optimal blend of time and clean air
              (cost = {EXPOSURE_CONFIG.balancedRoute.timeWeight} × time_ratio + {EXPOSURE_CONFIG.balancedRoute.exposureWeight} × exposure_ratio &lt; 1.0)
            </li>
          </ul>

          <h3 className="font-semibold text-slate-800 mt-6 mb-2">Detour limits</h3>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li>
              <strong>Strict</strong>: ≤{Math.round(EXPOSURE_CONFIG.detourLimits.strict * 100)}% longer
            </li>
            <li>
              <strong>Standard</strong>: ≤{Math.round(EXPOSURE_CONFIG.detourLimits.standard * 100)}% longer
            </li>
            <li>
              <strong>Flexible</strong>: ≤{Math.round(EXPOSURE_CONFIG.detourLimits.flexible * 100)}% longer
            </li>
          </ul>
        </div>
      </section>

      {/* Data Sources */}
      <section id="data-sources" aria-labelledby="data-sources-heading" className="mb-12">
        <h2 id="data-sources-heading" className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-600" aria-hidden />
          Data sources &amp; licenses
        </h2>

        <div className="space-y-4">
          {[
            {
              name: "Open-Meteo CAMS Air Quality",
              url: "https://open-meteo.com/en/docs/air-quality-api",
              license: "CC BY 4.0 (non-commercial use)",
              description: "Real-time European and global CAMS AQI forecasts providing PM2.5, PM10, NO₂, and US AQI values.",
            },
            {
              name: "OpenStreetMap + Overpass API",
              url: "https://wiki.openstreetmap.org/wiki/Overpass_API",
              license: "ODbL 1.0",
              description: "Road geometry (motorway, trunk, primary, secondary, tertiary) used to compute traffic proximity proximity index.",
            },
            {
              name: "OSRM Foot Router (FOSSGIS)",
              url: "https://routing.openstreetmap.de/",
              license: "ODbL 1.0 / Fair use",
              description: "Open Source Routing Machine provides pedestrian walking routes from OSM data.",
            },
            {
              name: "Photon Geocoder (Komoot)",
              url: "https://photon.komoot.io/",
              license: "CC BY-SA / Fair use",
              description: "Free geocoding API for place search typeahead, powered by OSM and Komoot.",
            },
            {
              name: "Nominatim (OSM)",
              url: "https://nominatim.openstreetmap.org/",
              license: "ODbL 1.0 (max 1 req/sec)",
              description: "OSM geocoder used for explicit place searches and reverse geocoding.",
            },
            {
              name: "OpenStreetMap Tile Server",
              url: "https://www.openstreetmap.org/copyright",
              license: "ODbL 1.0",
              description: "Raster map tiles rendered by the OSM tile infrastructure.",
            },
          ].map((src) => (
            <div key={src.name} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-slate-800 text-sm">{src.name}</h3>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-800 shrink-0"
                  aria-label={`${src.name} (opens in new tab)`}
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              </div>
              <p className="text-xs text-slate-500 mb-1">{src.description}</p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                {src.license}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section id="limitations" aria-labelledby="limitations-heading" className="mb-12">
        <h2 id="limitations-heading" className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" aria-hidden />
          Limitations
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li>
            AQI data is based on <strong>regional CAMS model grids</strong>, not
            street-level sensors. Local pollution hotspots (e.g., construction sites,
            vehicle queues) may not be captured.
          </li>
          <li>
            Walking speed is assumed at approximately 5 km/h (OSRM foot profile).
            Your actual travel time will vary.
          </li>
          <li>
            The model does not account for wind direction, building canyon effects,
            or temporal pollution spikes in real time.
          </li>
          <li>
            Route alternatives depend on OSM pedestrian network completeness.
            Paths may be missing in newly mapped or rural areas.
          </li>
          <li>
            BreatheWay is intended as a <strong>comparative planning tool</strong>,
            not a substitute for professional environmental health advice.
          </li>
        </ul>
      </section>

      {/* Privacy */}
      <section id="privacy" aria-labelledby="privacy-heading" className="mb-12">
        <h2 id="privacy-heading" className="text-xl font-bold text-slate-800 mb-4">
          Privacy
        </h2>
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            BreatheWay does not store or log any personal data. Coordinates are
            truncated to 2 decimal places (~1.1 km resolution) in server logs.
            Client IP addresses are used only for in-memory rate limiting and are
            never written to disk.
          </p>
          <p>
            Recent searches are stored only in your browser&apos;s{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">localStorage</code>.
            No data is transmitted to third-party analytics services.
          </p>
        </div>
      </section>

      {/* SDG alignment */}
      <section id="sdg" aria-labelledby="sdg-heading" className="mb-10">
        <h2 id="sdg-heading" className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-600" aria-hidden />
          UN SDG 3 alignment
        </h2>
        <p className="text-sm text-slate-600">
          BreatheWay directly supports{" "}
          <strong>UN Sustainable Development Goal 3 (Good Health and Well-Being)</strong>,
          specifically target 3.9: substantially reduce the number of deaths and illnesses
          from air pollution by 2030. By empowering pedestrians to make informed decisions
          about their walking routes, BreatheWay contributes to reducing ambient air
          pollution exposure at the individual level.
        </p>
      </section>

      {/* Footer credit */}
      <div className="border-t border-slate-200 pt-6 text-xs text-slate-400 text-center">
        BreatheWay — open source pedestrian air quality navigator.
        Built with OpenStreetMap, Open-Meteo, OSRM, and Next.js.
      </div>
    </main>
  );
}
