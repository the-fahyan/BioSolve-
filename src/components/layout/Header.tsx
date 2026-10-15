import Link from "next/link";
import { Wind, HelpCircle } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:text-teal-700 transition-colors duration-150 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1"
          aria-label="BreatheWay Home"
        >
          <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center text-white shadow-sm shrink-0">
            <Wind className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="tracking-tight text-slate-900 font-bold text-[15px]">BreatheWay</span>
            <span className="text-[10px] font-medium text-teal-600 tracking-wide hidden sm:block">
              Clean-air walking routes
            </span>
          </div>
        </Link>

        {/* Right side */}
        <nav aria-label="Main Navigation" className="flex items-center gap-1">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold mr-1">
            <span className="live-dot" aria-hidden="true" />
            <span>Live AQI</span>
          </div>

          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span className="hidden sm:inline">How it works</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
