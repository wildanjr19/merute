import type { ElevationPoint } from '../types';

/**
 * Calculate elevation gain and loss from elevation points
 * Ignores noise by only counting changes > 3m
 */
export const calculateElevationStats = (points: ElevationPoint[]) => {
  if (points.length === 0) {
    return {
      gain: 0,
      loss: 0,
      min: 0,
      max: 0,
    };
  }

  let gain = 0;
  let loss = 0;
  let min = points[0].elevation;
  let max = points[0].elevation;

  const NOISE_THRESHOLD = 3; // meters - ignore elevation changes smaller than this

  for (let i = 1; i < points.length; i++) {
    const elevationDiff = points[i].elevation - points[i - 1].elevation;

    // Calculate gain/loss only if change is significant
    if (Math.abs(elevationDiff) > NOISE_THRESHOLD) {
      if (elevationDiff > 0) {
        gain += elevationDiff;
      } else {
        loss += Math.abs(elevationDiff);
      }
    }

    // Track min/max
    if (points[i].elevation < min) {
      min = points[i].elevation;
    }
    if (points[i].elevation > max) {
      max = points[i].elevation;
    }
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    min: Math.round(min),
    max: Math.round(max),
  };
};
