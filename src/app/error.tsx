"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to stdout or error reporting service in production
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <main id="main-content" className="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div
        role="alert"
        className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-red-200 shadow-xs"
      >
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          An unexpected error occurred while processing your request. Please try reloading the view.
        </p>
        <button
          onClick={() => reset()}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium text-sm hover:bg-teal-800 transition-colors focus-visible:rounded-md w-full min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Try again</span>
        </button>
      </div>
    </main>
  );
}
