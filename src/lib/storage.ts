import {
  ClientRecentsStorageSchema,
  ClientPrefsStorageSchema,
  RecentPlaceItem,
  ClientPrefsStorage,
} from "./schemas";

const RECENTS_KEY = "bw:v1:recents";
const PREFS_KEY = "bw:v1:prefs";
const MAX_RECENTS = 8;

function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    const testKey = "__bw_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely retrieve saved recent places from localStorage.
 * If data is corrupt or storage is unavailable, returns an empty array.
 */
export function getRecentPlaces(): RecentPlaceItem[] {
  if (!isLocalStorageAvailable()) return [];

  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const result = ClientRecentsStorageSchema.safeParse(parsed);
    if (!result.success) {
      // Corrupt data: reset safely
      window.localStorage.removeItem(RECENTS_KEY);
      return [];
    }
    return result.data;
  } catch {
    return [];
  }
}

/**
 * Save a recent place. De-duplicates by coordinates rounded to 5 decimal places (~1m resolution).
 * Maintains maximum 8 items ordered by most recent first.
 */
export function saveRecentPlace(place: {
  label: string;
  lat: number;
  lng: number;
}): RecentPlaceItem[] {
  if (!isLocalStorageAvailable()) return [];

  try {
    const current = getRecentPlaces();
    const latRounded = Number(place.lat.toFixed(5));
    const lngRounded = Number(place.lng.toFixed(5));

    const filtered = current.filter((item) => {
      const itemLat = Number(item.lat.toFixed(5));
      const itemLng = Number(item.lng.toFixed(5));
      return !(itemLat === latRounded && itemLng === lngRounded);
    });

    const newItem: RecentPlaceItem = {
      label: place.label.trim(),
      lat: place.lat,
      lng: place.lng,
      ts: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clear all recent places.
 */
export function clearRecentPlaces(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Retrieve user client preferences.
 */
export function getClientPrefs(): ClientPrefsStorage {
  const defaults: ClientPrefsStorage = { detourLimit: "standard" };
  if (!isLocalStorageAvailable()) return defaults;

  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw);
    const result = ClientPrefsStorageSchema.safeParse(parsed);
    if (!result.success) {
      window.localStorage.removeItem(PREFS_KEY);
      return defaults;
    }
    return result.data;
  } catch {
    return defaults;
  }
}

/**
 * Save client preferences.
 */
export function saveClientPrefs(prefs: Partial<ClientPrefsStorage>): void {
  if (!isLocalStorageAvailable()) return;

  try {
    const current = getClientPrefs();
    const updated = { ...current, ...prefs };
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
