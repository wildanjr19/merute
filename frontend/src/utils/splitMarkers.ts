import { along, length } from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { SplitInterval, SplitUnit } from '../stores/splitMarkerStore';

export interface SplitMarker {
  /** 1-based index, e.g. KM 1, KM 2 */
  index: number;
  /** Cumulative distance in meters along route */
  distanceMeters: number;
  /** Cumulative distance shown to user in chosen unit */
  displayDistance: number;
  /** Display unit suffix */
  unit: SplitUnit;
  /** Coordinate on the route polyline */
  lng: number;
  lat: number;
  /** Estimated time string at given pace, e.g. "30:00" */
  estimatedTime: string;
}

const METERS_PER_MILE = 1609.344;

/** Minimum route length (meters) below which markers are not shown. */
const MIN_ROUTE_FOR_MARKERS = 1000;

/** Hard cap to keep MapLibre layers performant on extremely long routes. */
const MAX_MARKERS = 200;

const formatPaceTime = (totalMinutes: number): string => {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '--';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);

  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const intervalMeters = (unit: SplitUnit, interval: SplitInterval): number =>
  unit === 'mi' ? METERS_PER_MILE * interval : 1000 * interval;

interface BuildOptions {
  polyline: LineString | null;
  totalDistance: number;
  unit: SplitUnit;
  interval: SplitInterval;
  paceMinPerKm: number;
}

/**
 * Compute marker points along the route at the requested interval.
 * Uses turf's `along` for accurate geodesic interpolation along the polyline.
 */
export const buildSplitMarkers = ({
  polyline,
  totalDistance,
  unit,
  interval,
  paceMinPerKm,
}: BuildOptions): SplitMarker[] => {
  if (!polyline || polyline.coordinates.length < 2) return [];
  if (totalDistance < MIN_ROUTE_FOR_MARKERS) return [];

  const step = intervalMeters(unit, interval);
  if (step <= 0) return [];

  const lineFeature: Feature<LineString> = {
    type: 'Feature',
    properties: {},
    geometry: polyline,
  };

  // Use turf's measured length to stay consistent with `along`'s internal length.
  const totalKm = length(lineFeature, { units: 'kilometers' });
  const totalMeters = totalKm * 1000;

  // Skip the final marker if it would land within ~5% of the route's end
  // (avoids double-up with the finish waypoint).
  const usableMeters = totalMeters - Math.max(50, step * 0.05);
  if (usableMeters <= step) return [];

  const markers: SplitMarker[] = [];
  const maxIndex = Math.min(MAX_MARKERS, Math.floor(usableMeters / step));

  for (let i = 1; i <= maxIndex; i++) {
    const distanceMeters = step * i;
    const distanceKm = distanceMeters / 1000;
    const pt = along(lineFeature, distanceKm, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;

    const estimatedMinutes = (distanceMeters / 1000) * paceMinPerKm;

    markers.push({
      index: i,
      distanceMeters,
      displayDistance: i * interval,
      unit,
      lng,
      lat,
      estimatedTime: formatPaceTime(estimatedMinutes),
    });
  }

  return markers;
};

export const formatSplitLabel = (marker: SplitMarker): string => {
  const value =
    marker.displayDistance % 1 === 0
      ? marker.displayDistance.toString()
      : marker.displayDistance.toFixed(1);
  return `${value} ${marker.unit}`;
};
