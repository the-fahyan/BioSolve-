import Link from "next/link";
import { Wind, HelpCircle } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:text-teal-700 transition-colors py-2 focus-visible:rounded-md"
        aria-label="BreatheWay Home"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
          <Wind className="w-5 h-5" aria-hidden="true" />
        </div>
        <span className="tracking-tight text-slate-900">BreatheWay</span>
      </Link>

      <nav aria-label="Main Navigation">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] text-sm font-medium text-slate-600 hover:text-teal-700 hover:bg-slate-50 rounded-lg transition-colors focus-visible:rounded-md"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>How it works</span>
        </Link>
      </nav>
    </header>
  );
}
