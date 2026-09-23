import { Carpark } from '../types.ts';
import { ALMOST_FULL_LOTS_THRESHOLD, HEALTHY_AVAILABILITY_THRESHOLD } from './constants.ts';

/**
 * Calculates great-circle distance between two points in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats meters into human-friendly strings like "400 m" or "1.2 km".
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    // Round to nearest 50 meters for quick readability
    const rounded = Math.max(50, Math.round(meters / 50) * 50);
    return `${rounded} m`;
  }
  const km = Math.round(meters / 100) / 10;
  return `${km.toFixed(1)} km`;
}

export interface NearbyAlternativeResult {
  id: string;
  name: string;
  lots: number;
  distanceMeters: number;
  distanceFormatted: string;
}

/**
 * Finds the closest carpark with healthy availability.
 * Avoids suggesting itself and carparks with missing coordinates.
 */
export function findNearbyAlternative(
  target: Carpark,
  allCarparks: Carpark[],
  minHealthyLots: number = HEALTHY_AVAILABILITY_THRESHOLD
): NearbyAlternativeResult | null {
  if (target.lat === null || target.lng === null) {
    return null;
  }

  let best: { carpark: Carpark; distanceMeters: number } | null = null;

  // First pass: search for carparks with >= HEALTHY_AVAILABILITY_THRESHOLD lots
  for (const cp of allCarparks) {
    if (cp.id === target.id) continue;
    if (cp.lat === null || cp.lng === null) continue;
    if (cp.lots < minHealthyLots) continue;

    const dist = calculateDistanceMeters(target.lat, target.lng, cp.lat, cp.lng);
    if (!best || dist < best.distanceMeters) {
      best = { carpark: cp, distanceMeters: dist };
    }
  }

  // Second fallback: if no carpark has >= minHealthyLots, pick any that is not almost full (> ALMOST_FULL_LOTS_THRESHOLD)
  if (!best) {
    for (const cp of allCarparks) {
      if (cp.id === target.id) continue;
      if (cp.lat === null || cp.lng === null) continue;
      if (cp.lots <= ALMOST_FULL_LOTS_THRESHOLD) continue;

      const dist = calculateDistanceMeters(target.lat, target.lng, cp.lat, cp.lng);
      if (!best || dist < best.distanceMeters) {
        best = { carpark: cp, distanceMeters: dist };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    id: best.carpark.id,
    name: best.carpark.name,
    lots: best.carpark.lots,
    distanceMeters: best.distanceMeters,
    distanceFormatted: formatDistance(best.distanceMeters),
  };
}
