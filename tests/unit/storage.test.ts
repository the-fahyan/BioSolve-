import { describe, it, expect, beforeEach } from "vitest";
import {
  getRecentPlaces,
  saveRecentPlace,
  clearRecentPlaces,
  getClientPrefs,
  saveClientPrefs,
} from "@/lib/storage";

describe("Client Storage Resiliency (src/lib/storage.ts / T-33)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("handles empty localStorage gracefully", () => {
    expect(getRecentPlaces()).toEqual([]);
    expect(getClientPrefs()).toEqual({ detourLimit: "standard" });
  });

  it("saves and deduplicates recent places within 5 decimal places", () => {
    saveRecentPlace({ label: "Alexanderplatz", lat: 52.521921, lng: 13.413211 });
    // Same coordinate rounded to 5 decimals (52.52192, 13.41321)
    saveRecentPlace({ label: "Alexanderplatz Station", lat: 52.521924, lng: 13.413214 });

    const recents = getRecentPlaces();
    expect(recents.length).toBe(1);
    expect(recents[0]!.label).toBe("Alexanderplatz Station");
  });

  it("handles corrupt, non-JSON localStorage without crashing (T-33)", () => {
    window.localStorage.setItem("bw:v1:recents", "{malformed_not_json");
    expect(() => getRecentPlaces()).not.toThrow();
    expect(getRecentPlaces()).toEqual([]);
  });

  it("handles malformed JSON schema in localStorage without crashing", () => {
    window.localStorage.setItem(
      "bw:v1:recents",
      JSON.stringify([{ invalidField: true, lat: "not-a-number" }])
    );
    expect(getRecentPlaces()).toEqual([]);
  });

  it("saves and updates user client preferences safely", () => {
    saveClientPrefs({ detourLimit: "flexible" });
    expect(getClientPrefs().detourLimit).toBe("flexible");
  });

  it("clears recent places cleanly", () => {
    saveRecentPlace({ label: "Place 1", lat: 52.5, lng: 13.4 });
    expect(getRecentPlaces().length).toBe(1);
    clearRecentPlaces();
    expect(getRecentPlaces().length).toBe(0);
  });
});
