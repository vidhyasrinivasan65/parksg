/**
 * api/health.js
 * Plain JavaScript health check endpoint
 */

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  const rawKey = process.env.LTA_ACCOUNT_KEY;
  const keyConfigured = typeof rawKey === 'string' && rawKey.trim().length > 0;
  let upstreamStatus = 'untested';

  if (keyConfigured) {
    try {
      const response = await fetch('https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2?$skip=0', {
        headers: {
          AccountKey: rawKey.trim(),
          accept: 'application/json',
        },
      });
      upstreamStatus = response.status;
    } catch (err) {
      upstreamStatus = 'unreachable';
    }
  } else {
    upstreamStatus = 'missing_key';
  }

  return sendJson(res, 200, {
    keyConfigured,
    upstreamStatus,
    checkedAt: new Date().toISOString(),
  });
}
