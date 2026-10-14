"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global critical error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans text-slate-900">
        <div
          role="alert"
          className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-red-200 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Critical System Error</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A critical error interrupted the application lifecycle.
          </p>
          <button
            onClick={() => reset()}
            type="button"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-teal-700 text-white font-medium text-sm hover:bg-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px] w-full"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
