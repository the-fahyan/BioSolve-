"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RoutesResponse } from "@/lib/schemas";
import { usePlannerStore } from "@/stores/planner-store";
import { getAqiMeta } from "@/lib/aqi";
import { categorizeAqi } from "@/lib/aqi";
import clsx from "clsx";

// Fix Leaflet default marker icons in webpack builds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createMarkerIcon(color: string, letter: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);background:${color};
        border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:white;font-size:11px;
          font-weight:700;font-family:sans-serif;line-height:1;">${letter}</span>
      </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const ORIGIN_ICON = createMarkerIcon("#0F766E", "A");
const DEST_ICON = createMarkerIcon("#475569", "B");

// ── Pick Mode Handler ─────────────────────────────────────────────────────

interface PickModeHandlerProps {
  onPick: (lat: number, lng: number) => void;
  isActive: boolean;
}

function PickModeHandler({ onPick, isActive }: PickModeHandlerProps) {
  const map = useMap();

  useEffect(() => {
    map.getContainer().style.cursor = isActive ? "crosshair" : "";
  }, [isActive, map]);

  useMapEvents({
    click: (e) => {
      if (isActive) onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// ── Fit Bounds Controller ─────────────────────────────────────────────────

interface FitBoundsProps {
  result: RoutesResponse | null;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}

function FitBoundsController({ result, origin, destination }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    const paddingBottom = isMobile ? 116 : 48;

    if (result) {
      const coords: L.LatLngTuple[] = [];
      for (const route of result.routes) {
        for (const [lng, lat] of route.geometry.coordinates) {
          coords.push([lat, lng]);
        }
      }
      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords), {
          paddingTopLeft: [48, 48],
          paddingBottomRight: [48, paddingBottom],
        });
      }
    } else if (origin && destination) {
      map.fitBounds(
        L.latLngBounds([[origin.lat, origin.lng], [destination.lat, destination.lng]]),
        {
          paddingTopLeft: [64, 64],
          paddingBottomRight: [64, paddingBottom],
        }
      );
    } else if (origin) {
      map.setView([origin.lat, origin.lng], 15);
    }
  }, [result, origin, destination, map]);

  return null;
}

// ── Route Polylines ───────────────────────────────────────────────────────

interface RoutePolylinesProps {
  result: RoutesResponse;
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
}

function RoutePolylines({ result, selectedRouteId, onSelectRoute }: RoutePolylinesProps) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    for (const layer of layersRef.current) map.removeLayer(layer);
    layersRef.current = [];

    for (const route of result.routes) {
      const isSelected = route.id === selectedRouteId;
      const latLngs: L.LatLngTuple[] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      if (isSelected && route.exposure && route.exposure.length > 0) {
        const coords = route.geometry.coordinates;
        const exposures = route.exposure;
        for (let i = 0; i < Math.min(coords.length - 1, exposures.length); i++) {
          const [lng1, lat1] = coords[i]!;
          const [lng2, lat2] = coords[i + 1]!;
          const meta = getAqiMeta(categorizeAqi(exposures[i] ?? 0));

          const casing = L.polyline([[lat1, lng1], [lat2, lng2]], {
            color: "white", weight: 9, opacity: 0.85,
          });
          map.addLayer(casing);
          layersRef.current.push(casing);

          const line = L.polyline([[lat1, lng1], [lat2, lng2]], {
            color: meta.fill, weight: 5, opacity: 1,
          });
          line.on("click", () => onSelectRoute(route.id));
          map.addLayer(line);
          layersRef.current.push(line);
        }
      } else {
        const casing = L.polyline(latLngs, { color: "white", weight: 7, opacity: 0.6 });
        map.addLayer(casing);
        layersRef.current.push(casing);

        const line = L.polyline(latLngs, {
          color: isSelected ? "#0F766E" : "#94A3B8",
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 1 : 0.6,
          dashArray: isSelected ? undefined : "6 4",
        });
        line.on("click", () => onSelectRoute(route.id));
        map.addLayer(line);
        layersRef.current.push(line);
      }
    }

    return () => {
      for (const layer of layersRef.current) map.removeLayer(layer);
      layersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selectedRouteId]);

  return null;
}

// ── Marker Layer ──────────────────────────────────────────────────────────

interface MarkerLayerProps {
  origin: { lat: number; lng: number; label?: string } | null;
  destination: { lat: number; lng: number; label?: string } | null;
}

function MarkerLayer({ origin, destination }: MarkerLayerProps) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    for (const m of markersRef.current) map.removeLayer(m);
    markersRef.current = [];

    if (origin) {
      const m = L.marker([origin.lat, origin.lng], { icon: ORIGIN_ICON }).addTo(map);
      if (origin.label) m.bindTooltip(origin.label, { direction: "top", offset: [0, -30] });
      markersRef.current.push(m);
    }
    if (destination) {
      const m = L.marker([destination.lat, destination.lng], { icon: DEST_ICON }).addTo(map);
      if (destination.label)
        m.bindTooltip(destination.label, { direction: "top", offset: [0, -30] });
      markersRef.current.push(m);
    }

    return () => {
      for (const m of markersRef.current) map.removeLayer(m);
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return null;
}

// ── AQI Legend ────────────────────────────────────────────────────────────

function AqiLegend({ isHiddenOnMobile }: { isHiddenOnMobile: boolean }) {
  const CATS = [
    { label: "Good (0–50)", color: "#15803D" },
    { label: "Moderate (51–100)", color: "#EAB308" },
    { label: "Sensitive (101–150)", color: "#C2410C" },
    { label: "Unhealthy (151–200)", color: "#B91C1C" },
    { label: "Very unhealthy (201–300)", color: "#7E22CE" },
    { label: "Hazardous (301+)", color: "#7F1D1D" },
  ];
  return (
    <div
      className={clsx(
        "absolute bottom-[98px] lg:bottom-6 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 px-2.5 py-2 max-w-[170px] select-none transition-all",
        isHiddenOnMobile ? "hidden lg:block" : "block"
      )}
    >
      <p className="text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">AQI Scale</p>
      <div className="flex flex-col gap-1">
        {CATS.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: c.color }} aria-hidden />
            <span className="text-[9px] text-slate-600 leading-tight font-medium">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main MapView ──────────────────────────────────────────────────────────

export default function MapView() {
  const {
    origin,
    destination,
    routesResult,
    selectedRouteId,
    setSelectedRouteId,
    pickMode,
    exitPickMode,
    setOrigin,
    setDestination,
    isMobileSheetExpanded,
  } = usePlannerStore();

  function handleMapPick(lat: number, lng: number) {
    const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (pickMode === "origin") setOrigin({ lat, lng, label });
    else if (pickMode === "destination") setDestination({ lat, lng, label });
    exitPickMode();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && pickMode) exitPickMode();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickMode, exitPickMode]);

  const center: L.LatLngTuple = origin
    ? [origin.lat, origin.lng]
    : [51.505, -0.09];

  return (
    <div className="relative w-full h-full">
      {pickMode && (
        <div
          role="status"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] bg-teal-800 text-white px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-xl flex items-center gap-2 max-w-[92vw] text-center"
        >
          <span className="truncate">
            Click map to set {pickMode === "origin" ? "origin" : "destination"}
          </span>
          <button
            type="button"
            onClick={exitPickMode}
            className="ml-1 text-teal-200 hover:text-white underline text-xs shrink-0"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <PickModeHandler isActive={pickMode !== null} onPick={handleMapPick} />
        <FitBoundsController result={routesResult} origin={origin} destination={destination} />
        <MarkerLayer origin={origin} destination={destination} />
        {routesResult && (
          <RoutePolylines
            result={routesResult}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
          />
        )}
      </MapContainer>

      {routesResult && <AqiLegend isHiddenOnMobile={isMobileSheetExpanded} />}
    </div>
  );
}
