/**
 * Named constants for freshness, trends, and alternative carpark thresholds.
 */

// Reading older than this threshold (in minutes) is visually marked stale.
export const STALE_THRESHOLD_MINUTES = 10;

// Carparks with lots at or below this are considered "almost full".
export const ALMOST_FULL_LOTS_THRESHOLD = 20;

// Alternative carparks must have at least this many lots to be recommended.
export const HEALTHY_AVAILABILITY_THRESHOLD = 40;

// In-memory retention for past carpark readings (in minutes).
export const TREND_HISTORY_RETENTION_MINUTES = 30;

// Minimum number of readings needed before calculating a decline trend.
export const TREND_MIN_READINGS = 2;

// Minimum duration between earliest and latest readings to estimate decline (in seconds).
export const TREND_MIN_TIME_SPAN_SECONDS = 45;

// Minimum drop rate (lots per minute) to be considered rapidly declining.
export const TREND_MIN_DROP_RATE_PER_MINUTE = 1.0;

// If estimated minutes until 0 lots is at or below this, show "Filling fast" warning.
export const TREND_ESTIMATED_MINS_WARNING_THRESHOLD = 15;
