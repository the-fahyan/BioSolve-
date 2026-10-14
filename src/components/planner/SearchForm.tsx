"use client";
import { ArrowUpDown, Loader2, Wind } from "lucide-react";
import { usePlannerStore } from "@/stores/planner-store";
import { LocationInput } from "./LocationInput";
import { DetourSelector } from "./DetourSelector";
import clsx from "clsx";

interface SearchFormProps {
  onSubmit: () => void;
  isLoading: boolean;
}

export function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    swapOriginDestination,
    enterPickMode,
  } = usePlannerStore();

  const canSubmit = origin !== null && destination !== null && !isLoading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      {/* Origin input */}
      <div className="relative">
        <LocationInput
          id="origin-input"
          label="Starting location"
          value={origin}
          onChange={setOrigin}
          onPickOnMap={() => enterPickMode("origin")}
          placeholder="Where are you starting?"
          markerColor="teal"
        />
      </div>

      {/* Swap button */}
      <div className="flex justify-center -my-1">
        <button
          type="button"
          onClick={swapOriginDestination}
          aria-label="Swap origin and destination"
          className="p-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-500 hover:text-teal-600 transition-all hover:scale-110 active:scale-95"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Destination input */}
      <div className="relative">
        <LocationInput
          id="destination-input"
          label="Destination"
          value={destination}
          onChange={setDestination}
          onPickOnMap={() => enterPickMode("destination")}
          placeholder="Where are you going?"
          markerColor="slate"
        />
      </div>

      {/* Detour selector */}
      <DetourSelector />

      {/* Submit button */}
      <button
        id="find-routes-btn"
        type="submit"
        disabled={!canSubmit}
        className={clsx(
          "mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all",
          canSubmit
            ? "bg-teal-700 hover:bg-teal-800 text-white shadow-sm hover:shadow-md active:scale-[0.98]"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            <span>Finding clean routes…</span>
          </>
        ) : (
          <>
            <Wind className="w-4 h-4" aria-hidden />
            <span>Find clean-air routes</span>
          </>
        )}
      </button>

      {/* Quick-start demo walk */}
      {!origin && !destination && (
        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={() => {
              setOrigin({
                lat: 51.5055,
                lng: -0.0754,
                label: "Tower Bridge, London",
              });
              setDestination({
                lat: 51.5138,
                lng: -0.0984,
                label: "St Paul's Cathedral, London",
              });
            }}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer py-1"
          >
            <span>Try sample route: Tower Bridge → St Paul&apos;s</span>
          </button>
        </div>
      )}
    </form>
  );
}
