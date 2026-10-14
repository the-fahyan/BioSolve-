/**
 * Format a distance in meters into a human-readable string.
 * Example: 450 m, 1.4 km
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration in seconds into a human-readable walking time string.
 * Example: "14 min", "1 hr 5 min"
 */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 1) {
    return "< 1 min";
  }
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format extra seconds compared to fastest route.
 */
export function formatExtraTime(extraSeconds: number): string {
  if (extraSeconds <= 30) {
    return "Same time";
  }
  const minutes = Math.round(extraSeconds / 60);
  return `+${minutes} min`;
}

/**
 * Format extra distance in meters compared to fastest route.
 */
export function formatExtraDistance(extraMeters: number): string {
  if (extraMeters <= 20) {
    return "Same distance";
  }
  if (extraMeters < 1000) {
    return `+${Math.round(extraMeters)} m`;
  }
  return `+${(extraMeters / 1000).toFixed(1)} km`;
}

/**
 * Format exposure reduction percentage.
 */
export function formatExposureReduction(pct: number | null): string {
  if (pct === null || pct === undefined || pct <= 0) {
    return "Similar exposure";
  }
  return `${Math.round(pct)}% cleaner`;
}
