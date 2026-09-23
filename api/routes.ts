/**
 * api/routes.ts
 * Directions and route calculation service with Google Maps API and fallback routing engine.
 */
import type { Request, Response } from 'express';

interface Step {
  instruction: string;
  distanceText: string;
  durationText: string;
  turnType?: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'destination';
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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

export default async function routesHandler(req: Request, res: Response) {
  const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  const originLat = parseFloat(req.query.originLat as string);
  const originLng = parseFloat(req.query.originLng as string);
  const destLat = parseFloat(req.query.destLat as string);
  const destLng = parseFloat(req.query.destLng as string);
  const originLabel = (req.query.originLabel as string) || 'Current Location';
  const destLabel = (req.query.destLabel as string) || 'Carpark Destination';

  if (
    Number.isNaN(originLat) ||
    Number.isNaN(originLng) ||
    Number.isNaN(destLat) ||
    Number.isNaN(destLng)
  ) {
    return res.status(400).json({
      error: 'Invalid coordinates provided. originLat, originLng, destLat, and destLng must be valid numbers.',
    });
  }

  // Attempt Google Maps Directions API if API key is configured
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${apiKey}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (upstream.ok) {
        const data = (await upstream.json()) as {
          status: string;
          routes?: Array<{
            overview_polyline?: { points: string };
            legs?: Array<{
              distance?: { text: string; value: number };
              duration?: { text: string; value: number };
              steps?: Array<{
                html_instructions: string;
                distance?: { text: string; value: number };
                duration?: { text: string; value: number };
                maneuver?: string;
                start_location: { lat: number; lng: number };
                end_location: { lat: number; lng: number };
              }>;
            }>;
          }>;
        };

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const leg = data.routes[0].legs?.[0];
          if (leg) {
            const steps: Step[] = (leg.steps || []).map((s) => ({
              instruction: s.html_instructions.replace(/<[^>]*>?/gm, ''),
              distanceText: s.distance?.text || '',
              durationText: s.duration?.text || '',
              turnType: (s.maneuver?.includes('left')
                ? 'left'
                : s.maneuver?.includes('right')
                ? 'right'
                : 'straight') as Step['turnType'],
            }));

            // Path points: start, step ends, and dest
            const path: Array<{ lat: number; lng: number }> = [{ lat: originLat, lng: originLng }];
            leg.steps?.forEach((s) => {
              path.push({ lat: s.end_location.lat, lng: s.end_location.lng });
            });
            path.push({ lat: destLat, lng: destLng });

            return res.status(200).json({
              origin: { lat: originLat, lng: originLng, label: originLabel },
              destination: { lat: destLat, lng: destLng, label: destLabel },
              distanceMeters: leg.distance?.value || 0,
              distanceText: leg.distance?.text || '',
              durationSeconds: leg.duration?.value || 0,
              durationText: leg.duration?.text || '',
              steps,
              path,
            });
          }
        }
      }
    } catch {
      // Fall through to synthetic urban driving route generator
    }
  }

  // Fallback synthetic route based on Singapore urban road grid
  const directDistanceKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
  // Urban driving factor in Singapore (approx 1.25x - 1.35x direct line)
  const drivingDistanceKm = Math.max(0.2, directDistanceKm * 1.3);
  const distanceMeters = Math.round(drivingDistanceKm * 1000);
  const distanceText =
    distanceMeters < 1000
      ? `${Math.round(distanceMeters / 50) * 50} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;

  // Average city speed: ~28-35 km/h in Singapore
  const durationMinutes = Math.max(2, Math.round((drivingDistanceKm / 30) * 60));
  const durationSeconds = durationMinutes * 60;
  const durationText = `${durationMinutes} mins`;

  // Synthetic intermediate waypoint creating natural road-like path
  const midLat = (originLat + destLat) / 2 + (destLng - originLng) * 0.15;
  const midLng = (originLng + destLng) / 2 - (destLat - originLat) * 0.15;

  const steps: Step[] = [
    {
      instruction: `Head towards main road from ${originLabel}`,
      distanceText: `${Math.round(distanceMeters * 0.2)} m`,
      durationText: '1 min',
      turnType: 'straight',
    },
    {
      instruction: `Turn onto main arterial road towards ${destLabel}`,
      distanceText: `${Math.round(distanceMeters * 0.6)} m`,
      durationText: `${Math.max(1, durationMinutes - 2)} mins`,
      turnType: 'right',
    },
    {
      instruction: `Arrive at ${destLabel} carpark entrance on the left`,
      distanceText: `${Math.round(distanceMeters * 0.2)} m`,
      durationText: '1 min',
      turnType: 'destination',
    },
  ];

  return res.status(200).json({
    origin: { lat: originLat, lng: originLng, label: originLabel },
    destination: { lat: destLat, lng: destLng, label: destLabel },
    distanceMeters,
    distanceText,
    durationSeconds,
    durationText,
    steps,
    path: [
      { lat: originLat, lng: originLng },
      { lat: midLat, lng: midLng },
      { lat: destLat, lng: destLng },
    ],
  });
}
