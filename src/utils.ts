import { UTCDate } from '@date-fns/utc';

/**
 * Convert an epoch time to a UTC date
 */
export function epochToUtcDate(epoch: number): UTCDate {
  return new UTCDate(epoch * 1000);
}

/**
 * Round a number to the nearest half
 */
export function roundToNearestHalf(num: number): number {
  return Math.round(num * 2) / 2;
}

/**
 * Convert American odds to implied probability
 */
export function americanToProb(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

/**
 * Convert implied probability to American odds
 */
export function probToAmerican(prob: number): number {
  if (prob >= 0.5) {
    return -Math.round((prob / (1 - prob)) * 100);
  } else {
    return Math.round(((1 - prob) / prob) * 100);
  }
}
