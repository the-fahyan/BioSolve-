import { create } from "zustand";
import { Place, DetourLimit, RoutesResponse, RouteResult } from "@/lib/schemas";

export type PlannerSheet = "search" | "results";

interface PlannerState {
  origin: Place | null;
  destination: Place | null;
  detourLimit: DetourLimit;
  selectedRouteId: string | null;
  pickMode: "origin" | "destination" | null;
  sheet: PlannerSheet;
  routesResult: RoutesResponse | null;
  isLoadingRoutes: boolean;
  routeError: string | null;

  setOrigin: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  setDetourLimit: (limit: DetourLimit) => void;
  setSelectedRouteId: (id: string | null) => void;
  enterPickMode: (field: "origin" | "destination") => void;
  exitPickMode: () => void;
  setSheet: (sheet: PlannerSheet) => void;
  swapOriginDestination: () => void;
  setRoutesResult: (result: RoutesResponse | null) => void;
  setIsLoadingRoutes: (v: boolean) => void;
  setRouteError: (err: string | null) => void;
  reset: () => void;
}

const initialState = {
  origin: null,
  destination: null,
  detourLimit: "standard" as DetourLimit,
  selectedRouteId: null,
  pickMode: null,
  sheet: "search" as PlannerSheet,
  routesResult: null,
  isLoadingRoutes: false,
  routeError: null,
};

export const usePlannerStore = create<PlannerState>((set) => ({
  ...initialState,

  setOrigin: (place) => set({ origin: place }),
  setDestination: (place) => set({ destination: place }),
  setDetourLimit: (limit) => set({ detourLimit: limit }),
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  enterPickMode: (field) => set({ pickMode: field }),
  exitPickMode: () => set({ pickMode: null }),
  setSheet: (sheet) => set({ sheet }),
  swapOriginDestination: () =>
    set((state) => ({
      origin: state.destination,
      destination: state.origin,
    })),
  setRoutesResult: (result) =>
    set({
      routesResult: result,
      selectedRouteId: result?.recommendedRouteId ?? null,
    }),
  setIsLoadingRoutes: (v) => set({ isLoadingRoutes: v }),
  setRouteError: (err) => set({ routeError: err }),
  reset: () => set(initialState),
}));

export type { RouteResult };
