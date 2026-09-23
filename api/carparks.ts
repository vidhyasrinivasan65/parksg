/**
 * api/carparks.ts
 * Proxies LTA DataMall CarParkAvailabilityv2 with in-memory caching and coordinate/zone querying.
 */
import type { Request, Response } from 'express';

const ZONE_CENTRES: Record<string, { lat: number; lng: number }> = {
  Orchard: { lat: 1.3048, lng: 103.8318 },
  Marina: { lat: 1.2903, lng: 103.857 },
  Harbfront: { lat: 1.2653, lng: 103.822 },
  JurongLakeDistrict: { lat: 1.3329, lng: 103.7436 },
};

interface RawLtaRecord {
  CarParkID: string;
  Area?: string;
  Development: string;
  Location: string;
  AvailableLots: string | number;
  LotType: string;
  Agency: string;
}

interface NormalizedRecord {
  id: string;
  name: string;
  agency: string;
  lots: number;
  lat: number;
  lng: number;
}

// In-memory cache for raw LTA records to prevent hammering LTA DataMall (TTL: 45 seconds)
let cachedRecords: NormalizedRecord[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 45000;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.max(50, Math.round(meters / 50) * 50);
    return `${rounded} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

async function fetchAllLtaRecords(accountKey: string): Promise<NormalizedRecord[]> {
  const now = Date.now();
  if (cachedRecords && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedRecords;
  }

  const skips = [0, 500, 1000, 1500, 2000, 2500];
  const allRawRecords: RawLtaRecord[] = [];

  for (const skip of skips) {
    const endpoint = `https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2?$skip=${skip}`;
    const upstreamRes = await fetch(endpoint, {
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!upstreamRes.ok) {
      // If we have stale cache, return it on upstream failure
      if (cachedRecords && cachedRecords.length > 0) {
        return cachedRecords;
      }
      const error = new Error(`Upstream LTA DataMall returned status ${upstreamRes.status}`);
      (error as unknown as { status: number }).status = upstreamRes.status >= 400 && upstreamRes.status < 500 ? 502 : upstreamRes.status;
      throw error;
    }

    const data = (await upstreamRes.json()) as { value?: RawLtaRecord[] };
    const records = Array.isArray(data.value) ? data.value : [];
    allRawRecords.push(...records);

    if (records.length < 500) {
      break;
    }
  }

  // Filter LotType === "C" (cars) and parse Location string "lat lng"
  const normalized: NormalizedRecord[] = [];
  for (const record of allRawRecords) {
    if (record.LotType !== 'C' || !record.Location || typeof record.Location !== 'string') {
      continue;
    }
    const parts = record.Location.trim().split(' ');
    if (parts.length < 2) continue;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    normalized.push({
      id: `${record.CarParkID}-${record.LotType}`,
      name: record.Development || 'Carpark',
      agency: record.Agency || 'LTA',
      lots: Number(record.AvailableLots) || 0,
      lat,
      lng,
    });
  }

  cachedRecords = normalized;
  lastCacheTime = now;
  return normalized;
}

export default async function carparksHandler(req: Request, res: Response) {
  const accountKey = process.env.LTA_ACCOUNT_KEY?.trim();
  if (!accountKey) {
    return res.status(500).json({
      error: 'LTA_ACCOUNT_KEY is not configured or is blank',
    });
  }

  const queryZone = (req.query?.zone as string) || '';
  const queryLat = req.query?.lat ? parseFloat(req.query.lat as string) : null;
  const queryLng = req.query?.lng ? parseFloat(req.query.lng as string) : null;
  const radiusKm = req.query?.radius ? Math.min(15, Math.max(0.5, parseFloat(req.query.radius as string))) : 2.5;

  let centerLat: number | null = null;
  let centerLng: number | null = null;
  let targetZone = queryZone;

  if (queryLat !== null && queryLng !== null && !Number.isNaN(queryLat) && !Number.isNaN(queryLng)) {
    centerLat = queryLat;
    centerLng = queryLng;
  } else if (queryZone && ZONE_CENTRES[queryZone]) {
    centerLat = ZONE_CENTRES[queryZone].lat;
    centerLng = ZONE_CENTRES[queryZone].lng;
  } else {
    // Default to Orchard if neither is provided
    targetZone = 'Orchard';
    centerLat = ZONE_CENTRES.Orchard.lat;
    centerLng = ZONE_CENTRES.Orchard.lng;
  }

  try {
    const allRecords = await fetchAllLtaRecords(accountKey);

    const matched = allRecords
      .map((item) => {
        const distanceKm = haversineDistanceKm(centerLat!, centerLng!, item.lat, item.lng);
        const distanceMeters = Math.round(distanceKm * 1000);
        return {
          ...item,
          zone: targetZone || 'Custom',
          distanceKm: Math.round(distanceKm * 10) / 10,
          distanceMeters,
          distanceFormatted: formatDistance(distanceMeters),
        };
      })
      .filter((item) => item.distanceKm <= radiusKm);

    // Sort by available lots descending
    matched.sort((a, b) => b.lots - a.lots);

    return res.status(200).json({
      zone: targetZone || 'Custom',
      center: { lat: centerLat, lng: centerLng },
      fetchedAt: new Date().toISOString(),
      count: matched.length,
      carparks: matched,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 502;
    const message = (err as Error)?.message || 'Failed to contact LTA DataMall service';
    return res.status(status).json({
      error: message,
    });
  }
}
