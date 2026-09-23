/**
 * api/geocode.ts
 * Reverse-geocoding, address search, and autocomplete proxy with Singapore POI fallbacks.
 */
import type { Request, Response } from 'express';

// Known Singapore POIs for instant autocomplete and fallback geocoding
const SINGAPORE_POIS = [
  { name: 'Orchard Road', area: 'Central Area', lat: 1.3048, lng: 103.8318 },
  { name: 'ION Orchard', area: '2 Orchard Turn', lat: 1.30403, lng: 103.83206 },
  { name: 'Ngee Ann City (Takashimaya)', area: '391 Orchard Road', lat: 1.30236, lng: 103.8349 },
  { name: 'Marina Bay Sands', area: '10 Bayfront Ave', lat: 1.2834, lng: 103.8607 },
  { name: 'Suntec City', area: '3 Temasek Blvd', lat: 1.2935, lng: 103.8572 },
  { name: 'Millenia Walk', area: '9 Raffles Blvd', lat: 1.2929, lng: 103.8596 },
  { name: 'VivoCity', area: '1 HarbourFront Walk', lat: 1.2644, lng: 103.8222 },
  { name: 'HarbourFront Centre', area: '1 Maritime Square', lat: 1.2653, lng: 103.822 },
  { name: 'Jurong Point', area: '1 Jurong West Central 2', lat: 1.3404, lng: 103.7058 },
  { name: 'Jem', area: '50 Jurong Gateway Rd', lat: 1.3332, lng: 103.7431 },
  { name: 'Westgate', area: '3 Gateway Dr', lat: 1.3344, lng: 103.7428 },
  { name: 'IMM Building', area: '2 Jurong East St 21', lat: 1.3351, lng: 103.7468 },
  { name: 'Bugis Junction', area: '200 Victoria St', lat: 1.3001, lng: 103.8552 },
  { name: 'Raffles City', area: '252 North Bridge Rd', lat: 1.2941, lng: 103.8532 },
  { name: 'Changi Airport Jewel', area: '78 Airport Blvd', lat: 1.3602, lng: 103.9897 },
  { name: 'Tampines Mall', area: '4 Tampines Central 5', lat: 1.3533, lng: 103.9452 },
  { name: 'Woodlands Civic Centre', area: '900 South Woodlands Dr', lat: 1.4361, lng: 103.7865 },
  { name: 'Novena Square / Velocity', area: '238 Thomson Rd', lat: 1.3204, lng: 103.8437 },
  { name: 'Great World City', area: '1 Kim Seng Promenade', lat: 1.2934, lng: 103.8322 },
  { name: 'Plaza Singapura', area: '68 Orchard Rd', lat: 1.3008, lng: 103.8453 },
];

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

export default async function geocodeHandler(req: Request, res: Response) {
  const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  const lat = req.query?.lat ? parseFloat(req.query.lat as string) : null;
  const lng = req.query?.lng ? parseFloat(req.query.lng as string) : null;
  const query = (req.query?.query as string || req.query?.address as string || '').trim();

  // Mode 1: Reverse geocoding (lat, lng provided)
  if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const upstream = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (upstream.ok) {
          const data = (await upstream.json()) as { results?: Array<{ formatted_address: string; address_components?: Array<{ long_name: string; types: string[] }> }> };
          if (data.results && data.results.length > 0) {
            // Find neighborhood or route
            const topResult = data.results[0];
            const subpremise = topResult.address_components?.find((c) => c.types.includes('route') || c.types.includes('neighborhood') || c.types.includes('sublocality'))?.long_name;
            const address = subpremise || topResult.formatted_address.split(',')[0];
            return res.status(200).json({
              lat,
              lng,
              address: address || 'Current Location',
              fullAddress: topResult.formatted_address,
            });
          }
        }
      } catch {
        // Fall back to nearest known Singapore POI
      }
    }

    // Fallback: match nearest Singapore POI
    let nearest = SINGAPORE_POIS[0];
    let minDistance = haversineDistanceKm(lat, lng, nearest.lat, nearest.lng);
    for (const poi of SINGAPORE_POIS) {
      const d = haversineDistanceKm(lat, lng, poi.lat, poi.lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = poi;
      }
    }

    const fallbackLabel = minDistance < 1.2 ? nearest.name : `Near ${nearest.name} (${minDistance.toFixed(1)} km)`;
    return res.status(200).json({
      lat,
      lng,
      address: fallbackLabel,
      fullAddress: `${fallbackLabel}, Singapore`,
    });
  }

  // Mode 2: Autocomplete / address search
  if (query) {
    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:sg&key=${apiKey}`;
        const upstream = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (upstream.ok) {
          const data = (await upstream.json()) as {
            predictions?: Array<{
              place_id: string;
              description: string;
              structured_formatting?: { main_text: string; secondary_text: string };
            }>;
          };
          if (data.predictions && data.predictions.length > 0) {
            // Map top 5
            const suggestions = data.predictions.slice(0, 6).map((p) => ({
              placeId: p.place_id,
              mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
              secondaryText: p.structured_formatting?.secondary_text || 'Singapore',
              description: p.description,
            }));
            return res.status(200).json({ suggestions });
          }
        }
      } catch {
        // Fallback to local filter
      }
    }

    // Local filter on Singapore POIs
    const qLower = query.toLowerCase();
    const matched = SINGAPORE_POIS.filter(
      (poi) => poi.name.toLowerCase().includes(qLower) || poi.area.toLowerCase().includes(qLower)
    ).slice(0, 6);

    const suggestions = matched.map((poi, idx) => ({
      placeId: `sg-poi-${idx}-${poi.name.replace(/\s+/g, '-').toLowerCase()}`,
      mainText: poi.name,
      secondaryText: poi.area,
      lat: poi.lat,
      lng: poi.lng,
      description: `${poi.name}, ${poi.area}, Singapore`,
    }));

    return res.status(200).json({ suggestions });
  }

  // If no params, return popular Singapore POIs as initial suggestions
  return res.status(200).json({
    suggestions: SINGAPORE_POIS.slice(0, 6).map((p, idx) => ({
      placeId: `sg-poi-${idx}`,
      mainText: p.name,
      secondaryText: p.area,
      lat: p.lat,
      lng: p.lng,
      description: `${p.name}, ${p.area}, Singapore`,
    })),
  });
}
