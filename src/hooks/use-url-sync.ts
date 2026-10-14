"use client";
import { useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { usePlannerStore } from "@/stores/planner-store";
import { Place } from "@/lib/schemas";

/**
 * Syncs planner state to/from URL query params.
 * Params: ?o=lat,lng&d=lat,lng&on=name&dn=name&dl=strict|standard|flexible
 */
export function useUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const hasRestoredRef = useRef(false);
  const {
    origin,
    destination,
    detourLimit,
    setOrigin,
    setDestination,
    setDetourLimit,
  } = usePlannerStore();

  // ── Restore from URL on mount ──────────────────────────────────────────
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const oParam = searchParams.get("o");
    const dParam = searchParams.get("d");
    const onParam = searchParams.get("on");
    const dnParam = searchParams.get("dn");
    const dlParam = searchParams.get("dl");

    if (oParam) {
      const parts = oParam.split(",");
      const lat = parseFloat(parts[0] ?? "");
      const lng = parseFloat(parts[1] ?? "");
      if (!isNaN(lat) && !isNaN(lng)) {
        setOrigin({ lat, lng, label: onParam ?? undefined });
      }
    }

    if (dParam) {
      const parts = dParam.split(",");
      const lat = parseFloat(parts[0] ?? "");
      const lng = parseFloat(parts[1] ?? "");
      if (!isNaN(lat) && !isNaN(lng)) {
        setDestination({ lat, lng, label: dnParam ?? undefined });
      }
    }

    if (dlParam === "strict" || dlParam === "standard" || dlParam === "flexible") {
      setDetourLimit(dlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Encode store state to URL ──────────────────────────────────────────
  const buildUrl = useCallback(
    (o: Place | null, d: Place | null, dl: string) => {
      const params = new URLSearchParams();
      if (o) {
        params.set("o", `${o.lat.toFixed(6)},${o.lng.toFixed(6)}`);
        if (o.label) params.set("on", o.label);
      }
      if (d) {
        params.set("d", `${d.lat.toFixed(6)},${d.lng.toFixed(6)}`);
        if (d.label) params.set("dn", d.label);
      }
      if (dl !== "standard") params.set("dl", dl);
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname]
  );

  // Sync on submit (push = new history entry)
  const pushUrl = useCallback(() => {
    router.push(buildUrl(origin, destination, detourLimit));
  }, [router, buildUrl, origin, destination, detourLimit]);

  // Sync on detour change (replace = no new history entry)
  const prevDetourRef = useRef(detourLimit);
  useEffect(() => {
    if (prevDetourRef.current !== detourLimit) {
      prevDetourRef.current = detourLimit;
      if (origin || destination) {
        router.replace(buildUrl(origin, destination, detourLimit));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detourLimit]);

  return { pushUrl };
}
