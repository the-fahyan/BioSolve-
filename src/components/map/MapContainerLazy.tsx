"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  ),
});

export function MapContainerLazy() {
  return <MapView />;
}
