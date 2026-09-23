import { STALE_THRESHOLD_MINUTES } from './constants.ts';

export interface FreshnessInfo {
  label: string;
  isStale: boolean;
  minutesAgo: number;
}

/**
 * Calculates relative freshness label and staleness based on timestamp.
 * Stale if reading is older than STALE_THRESHOLD_MINUTES (default: 10 minutes).
 */
export function getFreshnessInfo(
  timestampIsoOrMs: string | number | undefined,
  currentTimestampMs: number = Date.now()
): FreshnessInfo {
  if (!timestampIsoOrMs) {
    return {
      label: 'Updated just now',
      isStale: false,
      minutesAgo: 0,
    };
  }

  const readingTime = typeof timestampIsoOrMs === 'number'
    ? timestampIsoOrMs
    : new Date(timestampIsoOrMs).getTime();

  if (Number.isNaN(readingTime)) {
    return {
      label: 'Updated just now',
      isStale: false,
      minutesAgo: 0,
    };
  }

  const diffMs = Math.max(0, currentTimestampMs - readingTime);
  const diffSec = Math.floor(diffMs / 1000);
  const minutesAgo = Math.floor(diffSec / 60);

  const isStale = minutesAgo >= STALE_THRESHOLD_MINUTES;

  if (isStale) {
    return {
      label: `May be outdated – ${minutesAgo} min ago`,
      isStale: true,
      minutesAgo,
    };
  }

  if (minutesAgo < 1) {
    return {
      label: 'Updated just now',
      isStale: false,
      minutesAgo: 0,
    };
  }

  if (minutesAgo === 1) {
    return {
      label: 'Updated 1 min ago',
      isStale: false,
      minutesAgo: 1,
    };
  }

  return {
    label: `Updated ${minutesAgo} min ago`,
    isStale: false,
    minutesAgo,
  };
}
