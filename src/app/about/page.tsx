import Link from "next/link";
import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <main id="main-content" className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 mb-6 group focus-visible:rounded-md"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span>Back to Planner</span>
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
          How BreatheWay Works
        </h1>
        <p className="text-base text-slate-600 leading-relaxed mb-8">
          BreatheWay is an eco-route air quality navigation tool designed to help pedestrians minimize their exposure to vehicular air pollutants while walking in urban environments.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 mb-10">
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-slate-900 mb-1">Scientific Methodology</h2>
            <p className="text-sm text-slate-600">
              Combines Copernicus CAMS background air quality with an exponential roadside traffic proximity decay model.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-slate-900 mb-1">Zero-PII Privacy</h2>
            <p className="text-sm text-slate-600">
              Your searches and locations are never stored or tracked. All coordinate telemetry is truncated in memory.
            </p>
          </div>
        </div>

        <section id="methodology" className="border-t border-slate-200 pt-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Exposure Index Formula</h2>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-sm overflow-x-auto mb-4">
            EI(p) = clamp(bg(p) * (1 + alpha * tf(p)), 0, 500)
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Where <code>bg(p)</code> represents the 2D Inverse Distance Weighted background AQI from Copernicus regional forecasts, <code>alpha = 0.8</code> represents roadside traffic uplift, and <code>tf(p)</code> reflects proximity to major roadway classifications.
          </p>
        </section>

        <section id="attribution" className="border-t border-slate-200 pt-8 text-xs text-slate-500 space-y-2">
          <p className="font-semibold text-slate-700">Open Data Attributions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Map data and road classifications &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">OpenStreetMap contributors</a> (ODbL).</li>
            <li>Air quality forecasts provided by <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Open-Meteo</a> (Copernicus Atmosphere Monitoring Service).</li>
            <li>Geocoding provided by <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Photon</a> and <a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">Nominatim</a>.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
