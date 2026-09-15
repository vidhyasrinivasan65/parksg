/**
 * api/carparks.js
 * Plain JavaScript serverless function for LTA DataMall CarParkAvailabilityv2
 */

// Zone centres for 1.5 km radius distance matching
const ZONE_CENTRES = {
  Orchard: { lat: 1.3048, lng: 103.8318 },
  Marina: { lat: 1.2903, lng: 103.8570 },
  Harbfront: { lat: 1.2653, lng: 103.8220 },
  JurongLakeDistrict: { lat: 1.3329, lng: 103.7436 },
};

/**
 * Haversine formula written inline to compute great-circle distance in kilometers.
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // 1. Validate environment key
  const accountKey = process.env.LTA_ACCOUNT_KEY?.trim();
  if (!accountKey) {
    return sendJson(res, 500, {
      error: 'LTA_ACCOUNT_KEY is not configured or is blank',
    });
  }

  // 2. Parse and validate zone parameter
  const urlObj = new URL(req.url, 'http://localhost');
  const zone = req.query?.zone || urlObj.searchParams.get('zone');

  if (!zone || !ZONE_CENTRES[zone]) {
    return sendJson(res, 400, {
      error: 'Invalid or missing zone parameter. Must be Orchard, Marina, Harbfront, or JurongLakeDistrict',
    });
  }

  // 3. PAGINATION: Call repeatedly with ?$skip=0, 500, 1000, 1500, 2000, 2500
  // and merge the "value" arrays. Stop early if a page returns fewer than 500 records.
  const skips = [0, 500, 1000, 1500, 2000, 2500];
  let allRecords = [];

  try {
    for (const skip of skips) {
      const endpoint = `https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2?$skip=${skip}`;
      const upstreamRes = await fetch(endpoint, {
        headers: {
          AccountKey: accountKey,
          accept: 'application/json',
        },
      });

      if (!upstreamRes.ok) {
        return sendJson(res, upstreamRes.status >= 400 && upstreamRes.status < 500 ? 502 : upstreamRes.status, {
          error: `Upstream LTA DataMall returned status ${upstreamRes.status}`,
        });
      }

      const data = await upstreamRes.json();
      const records = Array.isArray(data.value) ? data.value : [];
      allRecords.push(...records);

      if (records.length < 500) {
        break;
      }
    }
  } catch (err) {
    return sendJson(res, 502, {
      error: 'Failed to contact LTA DataMall service',
      details: err.message,
    });
  }

  // 4. FILTERING in order:
  // a) Keep only records where LotType === "C"
  const carLotRecords = allRecords.filter((r) => r && r.LotType === 'C');

  // b) Split Location string on a single space to get lat and lng as numbers.
  // If Location is an empty string, set lat and lng to null and drop that record.
  const recordsWithCoords = [];
  for (const record of carLotRecords) {
    if (!record.Location || typeof record.Location !== 'string' || record.Location.trim() === '') {
      continue;
    }
    const parts = record.Location.trim().split(' ');
    if (parts.length < 2) {
      continue;
    }
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }
    recordsWithCoords.push({
      ...record,
      _lat: lat,
      _lng: lng,
    });
  }

  // c) Match carparks by DISTANCE from zone centre (1.5 km radius)
  const centre = ZONE_CENTRES[zone];
  const matchedCarparks = [];

  for (const item of recordsWithCoords) {
    const distanceKm = haversineDistanceKm(centre.lat, centre.lng, item._lat, item._lng);
    if (distanceKm <= 1.5) {
      matchedCarparks.push({
        id: `${item.CarParkID}-${item.LotType}`,
        name: item.Development,
        zone: zone,
        agency: item.Agency,
        lots: Number(item.AvailableLots) || 0,
        lat: item._lat,
        lng: item._lng,
      });
    }
  }

  // Sort by lots, highest first
  matchedCarparks.sort((a, b) => b.lots - a.lots);

  // RETURN exactly this shape and nothing else:
  // { zone, fetchedAt, count, carparks: [ { id, name, zone, agency, lots, lat, lng } ] }
  return sendJson(res, 200, {
    zone,
    fetchedAt: new Date().toISOString(),
    count: matchedCarparks.length,
    carparks: matchedCarparks,
  });
}
