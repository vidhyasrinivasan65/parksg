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

/**
 * Distances just under a kilometre used to be rounded to the nearest 50 m and then
 * labelled in metres, so 997 m was shown as "1000 m" while 1052 m on the next card
 * was shown as "1.1 km". The rounded value now decides the unit, so a distance is
 * never displayed as a four-digit number of metres.
 */
function formatDistance(meters: number): string {
  const roundedMeters = Math.max(50, Math.round(meters / 50) * 50);
  if (roundedMeters < 1000) {
    return `${roundedMeters} m`;
  }
  return `${(roundedMeters / 1000).toFixed(1)} km`;
}

/**
 * LTA returns some carparks more than once under different CarParkIDs — for example
 * BLK 14A FARRER PARK ROAD appears as KJM2 with lots available and KJML with zero.
 * Both copies were being shown, so a carpark with space could be displayed as FULL,
 * and the two copies carry different coordinates, so the distance could be wrong too.
 * Collapse records that name the same development, keeping the one reporting lots.
 */
function dedupeByDevelopment(records: NormalizedRecord[]): NormalizedRecord[] {
  const bestByName = new Map<string, NormalizedRecord>();

  for (const record of records) {
    const key = record.name.trim().toUpperCase().replace(/\s+/g, ' ');
    const existing = bestByName.get(key);
    if (!existing || record.lots > existing.lots) {
      bestByName.set(key, record);
    }
  }

  return Array.from(bestByName.values());
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

  const deduped = dedupeByDevelopment(normalized);

  cachedRecords = deduped;
  lastCacheTime = now;
  return deduped;
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

  const hasCoordinates =
    queryLat !== null && queryLng !== null && !Number.isNaN(queryLat) && !Number.isNaN(queryLng);

  /**
   * An unrecognised zone used to fall through to the Orchard default, and the response
   * was then labelled "Orchard" — so a request for a zone that does not exist came back
   * as a confident list of Orchard carparks rather than an error. A zone the system does
   * not know is now refused, and the names it does accept are returned with the refusal.
   */
  if (!hasCoordinates && queryZone && !ZONE_CENTRES[queryZone]) {
    return res.status(400).json({
      error: `Unknown zone "${queryZone}". No carparks were looked up.`,
      validZones: Object.keys(ZONE_CENTRES),
    });
  }

  let centerLat: number;
  let centerLng: number;
  let targetZone = queryZone;

  if (hasCoordinates) {
    centerLat = queryLat as number;
    centerLng = queryLng as number;
    targetZone = queryZone && ZONE_CENTRES[queryZone] ? queryZone : 'Custom';
  } else if (queryZone) {
    centerLat = ZONE_CENTRES[queryZone].lat;
    centerLng = ZONE_CENTRES[queryZone].lng;
  } else {
    // No zone and no coordinates were asked for, so fall back to Orchard
    targetZone = 'Orchard';
    centerLat = ZONE_CENTRES.Orchard.lat;
    centerLng = ZONE_CENTRES.Orchard.lng;
  }

  try {
    const allRecords = await fetchAllLtaRecords(accountKey);

    const matched = allRecords
      .map((item) => {
        const distanceKm = haversineDistanceKm(centerLat, centerLng, item.lat, item.lng);
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
