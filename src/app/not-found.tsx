import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The requested route or resource could not be found. Let&apos;s get you back on track to your clean-air journey.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium text-sm hover:bg-teal-800 transition-colors focus-visible:rounded-md w-full"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span>Return to Route Planner</span>
        </Link>
      </div>
    </main>
  );
}
