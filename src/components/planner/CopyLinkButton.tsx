"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the URL
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      aria-label={copied ? "Link copied!" : "Copy shareable link"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-all active:scale-95"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-teal-600" aria-hidden />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" aria-hidden />
          <span>Copy link</span>
        </>
      )}
    </button>
  );
}
