import {
  TREND_ESTIMATED_MINS_WARNING_THRESHOLD,
  TREND_HISTORY_RETENTION_MINUTES,
  TREND_MIN_DROP_RATE_PER_MINUTE,
  TREND_MIN_READINGS,
  TREND_MIN_TIME_SPAN_SECONDS,
} from './constants.ts';

export interface CarparkReading {
  timestamp: number;
  lots: number;
}

export interface TrendAnalysis {
  isFillingFast: boolean;
  estimatedMinutesLeft?: number;
  dropRatePerMin?: number;
  warningMessage?: string;
}

// In-memory history cache: carparkId -> array of readings
const readingsHistoryMap = new Map<string, CarparkReading[]>();

/**
 * Records a new reading for a carpark, pruning readings older than retention period.
 */
export function recordCarparkReading(
  carparkId: string,
  lots: number,
  timestampMs: number = Date.now()
): void {
  const retentionMs = TREND_HISTORY_RETENTION_MINUTES * 60 * 1000;
  const cutoff = timestampMs - retentionMs;

  const currentReadings = readingsHistoryMap.get(carparkId) || [];
  const validHistory = currentReadings.filter((r) => r.timestamp >= cutoff);

  // Avoid duplicate immediate entries with same lot count within 5 seconds
  const last = validHistory[validHistory.length - 1];
  if (!last || Math.abs(last.timestamp - timestampMs) >= 5000 || last.lots !== lots) {
    validHistory.push({ timestamp: timestampMs, lots });
  }

  readingsHistoryMap.set(carparkId, validHistory);
}

/**
 * Manually seeds simulated history for testing / demo purposes.
 */
export function seedSimulatedTrend(
  carparkId: string,
  initialLots: number,
  currentLots: number,
  minutesSpan: number
): void {
  const now = Date.now();
  const pastTime = now - minutesSpan * 60 * 1000;
  readingsHistoryMap.set(carparkId, [
    { timestamp: pastTime, lots: initialLots },
    { timestamp: now, lots: currentLots },
  ]);
}

/**
 * Analyzes the trend for a given carpark based on its in-memory history.
 * Returns a warning message like "Filling fast – about 10 min left" if declining rapidly.
 */
export function analyzeCarparkTrend(
  carparkId: string,
  currentLots: number,
  nowMs: number = Date.now()
): TrendAnalysis {
  // If already empty, no need to say "filling fast"
  if (currentLots <= 0) {
    return { isFillingFast: false };
  }

  const readings = readingsHistoryMap.get(carparkId);
  if (!readings || readings.length < TREND_MIN_READINGS) {
    return { isFillingFast: false };
  }

  // Retention filter
  const retentionMs = TREND_HISTORY_RETENTION_MINUTES * 60 * 1000;
  const cutoff = nowMs - retentionMs;
  const recent = readings.filter((r) => r.timestamp >= cutoff);

  if (recent.length < TREND_MIN_READINGS) {
    return { isFillingFast: false };
  }

  const oldest = recent[0];
  const newest = recent[recent.length - 1];

  const timeSpanSec = (newest.timestamp - oldest.timestamp) / 1000;
  if (timeSpanSec < TREND_MIN_TIME_SPAN_SECONDS) {
    return { isFillingFast: false };
  }

  const timeSpanMinutes = timeSpanSec / 60;
  const lotsDropped = oldest.lots - newest.lots;

  // If lots are increasing or flat, it's not filling fast
  if (lotsDropped <= 0) {
    return { isFillingFast: false };
  }

  const dropRatePerMin = lotsDropped / timeSpanMinutes;

  if (dropRatePerMin >= TREND_MIN_DROP_RATE_PER_MINUTE) {
    const estimatedMinutes = Math.max(1, Math.round(newest.lots / dropRatePerMin));

    if (estimatedMinutes <= TREND_ESTIMATED_MINS_WARNING_THRESHOLD) {
      return {
        isFillingFast: true,
        estimatedMinutesLeft: estimatedMinutes,
        dropRatePerMin: Math.round(dropRatePerMin * 10) / 10,
        warningMessage: `Filling fast – about ${estimatedMinutes} min left`,
      };
    }
  }

  return { isFillingFast: false };
}
