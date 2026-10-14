"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GeocodeResponse, ReverseGeocodeResponse, LatLng, RoutesRequest, RoutesResponse } from "@/lib/schemas";
import { useState, useEffect, useRef, useCallback } from "react";

// ──────────────────────────────────────────────────────────────────────────
// Geocode Search Hook (debounced typeahead)
// ──────────────────────────────────────────────────────────────────────────

interface GeocodeSearchOptions {
  query: string;
  bias?: LatLng;
  explicit?: boolean;
  enabled?: boolean;
}

export function useGeocodeSearch({ query, bias, explicit, enabled = true }: GeocodeSearchOptions) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (!explicit && query.length < 3) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query, explicit]);

  return useQuery<GeocodeResponse>({
    queryKey: ["geocode", "search", debouncedQuery, bias, explicit],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ q: debouncedQuery });
      if (bias) {
        params.set("lat", String(bias.lat));
        params.set("lng", String(bias.lng));
      }
      if (explicit) params.set("explicit", "1");

      const res = await fetch(`/api/geocode?${params.toString()}`, { signal });
      if (!res.ok) throw new Error("Geocode search failed");
      return res.json() as Promise<GeocodeResponse>;
    },
    enabled: enabled && debouncedQuery.length >= 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Reverse Geocode Hook
// ──────────────────────────────────────────────────────────────────────────

export function useReverseGeocode(coord: LatLng | null) {
  return useQuery<ReverseGeocodeResponse>({
    queryKey: ["geocode", "reverse", coord],
    queryFn: async ({ signal }) => {
      if (!coord) throw new Error("No coordinate");
      const params = new URLSearchParams({
        lat: String(coord.lat),
        lng: String(coord.lng),
      });
      const res = await fetch(`/api/geocode/reverse?${params.toString()}`, { signal });
      if (!res.ok) throw new Error("Reverse geocode failed");
      return res.json() as Promise<ReverseGeocodeResponse>;
    },
    enabled: coord !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// AQI Hook
// ──────────────────────────────────────────────────────────────────────────

export function useAqi(coord: LatLng | null) {
  return useQuery({
    queryKey: ["aqi", coord],
    queryFn: async ({ signal }) => {
      if (!coord) throw new Error("No coordinate");
      const params = new URLSearchParams({
        lat: String(coord.lat),
        lng: String(coord.lng),
      });
      const res = await fetch(`/api/aqi?${params.toString()}`, { signal });
      if (!res.ok) throw new Error("AQI fetch failed");
      return res.json();
    },
    enabled: coord !== null,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 20,
    refetchInterval: 1000 * 60 * 30, // 30 min refresh
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Route Mutation Hook
// ──────────────────────────────────────────────────────────────────────────

export function useRouteMutation() {
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation<RoutesResponse, Error, RoutesRequest>({
    mutationFn: async (request) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const message =
          (errBody as { error?: { message?: string } })?.error?.message ??
          `Route request failed (${res.status})`;
        throw new Error(message);
      }

      return res.json() as Promise<RoutesResponse>;
    },
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...mutation, cancel };
}

// ──────────────────────────────────────────────────────────────────────────
// Geolocation Hook
// ──────────────────────────────────────────────────────────────────────────

interface GeolocationState {
  position: LatLng | null;
  error: string | null;
  loading: boolean;
  getCurrentPosition: () => void;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. You can pick your location on the map instead.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Please try again.");
        } else {
          setError("Unable to determine your location.");
        }
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  return { position, error, loading, getCurrentPosition };
}
