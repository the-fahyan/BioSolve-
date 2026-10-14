"use client";
import { useState, useRef, useEffect, useId, KeyboardEvent } from "react";
import { MapPin, LocateFixed, X, Loader2, Clock } from "lucide-react";
import { Place, GeocodeResultItem } from "@/lib/schemas";
import { useGeocodeSearch, useGeolocation } from "@/hooks/use-planner-data";
import { getRecentPlaces } from "@/lib/storage";
import clsx from "clsx";

interface LocationInputProps {
  id: string;
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  onPickOnMap: () => void;
  placeholder?: string;
  markerColor?: "teal" | "slate";
}

export function LocationInput({
  id,
  label,
  value,
  onChange,
  onPickOnMap,
  placeholder = "Search for a place…",
  markerColor = "teal",
}: LocationInputProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const geo = useGeolocation();
  const recents = getRecentPlaces();

  const { data: searchData, isFetching } = useGeocodeSearch({
    query: inputValue,
    enabled: isOpen && inputValue.length >= 3,
  });

  const suggestions: GeocodeResultItem[] =
    inputValue.length >= 3
      ? (searchData?.results ?? [])
      : recents.map((r, i) => ({
          id: `recent-${i}`,
          label: r.label,
          lat: r.lat,
          lng: r.lng,
          kind: "recent",
        }));

  // Sync input with external value changes during render
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value?.label ?? "");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
    if (!e.target.value) {
      onChange(null);
    }
  }

  function handleSelect(item: GeocodeResultItem) {
    onChange({ lat: item.lat, lng: item.lng, label: item.label });
    setInputValue(item.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleClear() {
    setInputValue("");
    onChange(null);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  function handleLocate() {
    geo.getCurrentPosition((pos) => {
      onChange({
        lat: pos.lat,
        lng: pos.lng,
        label: "My location",
      });
      setInputValue("My location");
    });
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        listboxRef.current &&
        !listboxRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-full">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        {/* Marker icon */}
        <span
          className={clsx(
            "absolute left-3 w-4 h-4 shrink-0 pointer-events-none",
            markerColor === "teal" ? "text-teal-600" : "text-slate-500"
          )}
          aria-hidden
        >
          <MapPin className="w-4 h-4" />
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          className="w-full pl-9 pr-20 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-slate-400 text-slate-900 transition-all"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Action buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {isFetching && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" aria-label="Searching…" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={`Clear ${label}`}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleLocate}
            disabled={geo.loading}
            aria-label="Use my current location"
            title="Use my current location"
            className="p-1 rounded-md hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            {geo.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onPickOnMap}
            aria-label={`Pick ${label} on map`}
            title="Pick on map"
            className="p-1 rounded-md hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Geolocation error */}
      {geo.error && (
        <p role="status" className="mt-1 text-xs text-amber-600">
          {geo.error}
        </p>
      )}

      {/* Dropdown listbox */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto"
        >
          {suggestions.map((item, idx) => (
            <div
              key={item.id}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              onMouseDown={() => handleSelect(item)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={clsx(
                "flex items-start gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                idx === activeIndex
                  ? "bg-teal-50 text-teal-900"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              {item.kind === "recent" ? (
                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden />
              ) : (
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-500" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{item.label}</div>
                {item.secondaryLabel && (
                  <div className="text-xs text-slate-400 truncate">{item.secondaryLabel}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
