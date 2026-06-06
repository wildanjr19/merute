import type { ElevationPoint, RouteSegment } from '../types';

export type ExportFormat = 'gpx' | 'tcx';

interface RouteExportInput {
  segments: RouteSegment[];
  totalDistance: number;
  paceMinPerKm: number;
  elevationPoints?: ElevationPoint[];
  routeName?: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  distance: number;
}

const EARTH_RADIUS_METERS = 6371000;
const GPX_NAMESPACE = 'http://www.topografix.com/GPX/1/1';
const TCX_NAMESPACE = 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2';

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceBetween = (from: RoutePoint, to: RoutePoint) => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const coordinateKey = (lat: number, lng: number) =>
  `${lat.toFixed(6)},${lng.toFixed(6)}`;

const buildElevationLookup = (points: ElevationPoint[] = []) => {
  const lookup = new Map<string, number>();

  points.forEach((point) => {
    lookup.set(coordinateKey(point.lat, point.lng), point.elevation);
  });

  return lookup;
};

const getRoutePoints = ({
  segments,
  elevationPoints,
}: Pick<RouteExportInput, 'segments' | 'elevationPoints'>): RoutePoint[] => {
  const elevationLookup = buildElevationLookup(elevationPoints);
  const points: RoutePoint[] = [];
  let cumulativeDistance = 0;

  segments.forEach((segment) => {
    segment.polyline.coordinates.forEach(([lng, lat]) => {
      const previous = points[points.length - 1];

      if (previous && previous.lat === lat && previous.lng === lng) {
        return;
      }

      const point: RoutePoint = {
        lat,
        lng,
        distance: cumulativeDistance,
        elevation: elevationLookup.get(coordinateKey(lat, lng)),
      };

      if (previous) {
        cumulativeDistance += distanceBetween(previous, point);
        point.distance = cumulativeDistance;
      }

      points.push(point);
    });
  });

  return points;
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const getRouteName = (routeName?: string) => {
  if (routeName?.trim()) {
    return routeName.trim();
  }

  return `MeRute Route ${new Date().toLocaleDateString('id-ID')}`;
};

const getTrackTime = (startTime: Date, point: RoutePoint, paceMinPerKm: number) => {
  const secondsFromStart = (point.distance / 1000) * paceMinPerKm * 60;
  return new Date(startTime.getTime() + secondsFromStart * 1000).toISOString();
};

const appendElement = (
  document: XMLDocument,
  parent: Element,
  name: string,
  text?: string,
  namespace = parent.namespaceURI ?? undefined,
) => {
  const element = namespace
    ? document.createElementNS(namespace, name)
    : document.createElement(name);

  if (text !== undefined) {
    element.textContent = text;
  }

  parent.appendChild(element);
  return element;
};

const serializeXml = (document: XMLDocument) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(document)}`;

export const buildGpx = (input: RouteExportInput) => {
  const points = getRoutePoints(input);
  const routeName = getRouteName(input.routeName);
  const createdAt = new Date().toISOString();
  const document = window.document.implementation.createDocument(GPX_NAMESPACE, 'gpx');
  const root = document.documentElement;

  root.setAttribute('version', '1.1');
  root.setAttribute('creator', 'MeRute');
  root.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
  root.setAttribute(
    'xsi:schemaLocation',
    'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
  );

  const metadata = appendElement(document, root, 'metadata');
  appendElement(document, metadata, 'name', routeName);
  appendElement(document, metadata, 'time', createdAt);

  const track = appendElement(document, root, 'trk');
  appendElement(document, track, 'name', routeName);
  appendElement(document, track, 'type', 'running');
  const trackSegment = appendElement(document, track, 'trkseg');

  points.forEach((point) => {
    const trackPoint = appendElement(document, trackSegment, 'trkpt');

    trackPoint.setAttribute('lat', point.lat.toFixed(7));
    trackPoint.setAttribute('lon', point.lng.toFixed(7));

    if (point.elevation !== undefined) {
      appendElement(document, trackPoint, 'ele', point.elevation.toFixed(1));
    }
  });

  return serializeXml(document);
};

export const buildTcx = (input: RouteExportInput) => {
  const points = getRoutePoints(input);
  const routeName = getRouteName(input.routeName);
  const startTime = new Date();
  const durationSeconds = Math.round((input.totalDistance / 1000) * input.paceMinPerKm * 60);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const document = window.document.implementation.createDocument(
    TCX_NAMESPACE,
    'TrainingCenterDatabase',
  );
  const root = document.documentElement;

  root.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
  root.setAttribute(
    'xsi:schemaLocation',
    'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd',
  );

  const courses = appendElement(document, root, 'Courses');
  const course = appendElement(document, courses, 'Course');
  appendElement(document, course, 'Name', routeName);

  const lap = appendElement(document, course, 'Lap');
  appendElement(document, lap, 'TotalTimeSeconds', String(durationSeconds));
  appendElement(document, lap, 'DistanceMeters', input.totalDistance.toFixed(1));

  if (firstPoint) {
    const beginPosition = appendElement(document, lap, 'BeginPosition');
    appendElement(document, beginPosition, 'LatitudeDegrees', firstPoint.lat.toFixed(7));
    appendElement(document, beginPosition, 'LongitudeDegrees', firstPoint.lng.toFixed(7));
  }

  if (lastPoint) {
    const endPosition = appendElement(document, lap, 'EndPosition');
    appendElement(document, endPosition, 'LatitudeDegrees', lastPoint.lat.toFixed(7));
    appendElement(document, endPosition, 'LongitudeDegrees', lastPoint.lng.toFixed(7));
  }

  appendElement(document, lap, 'Intensity', 'Active');

  const track = appendElement(document, course, 'Track');
  points.forEach((point) => {
    const trackPoint = appendElement(document, track, 'Trackpoint');
    appendElement(document, trackPoint, 'Time', getTrackTime(startTime, point, input.paceMinPerKm));

    const position = appendElement(document, trackPoint, 'Position');
    appendElement(document, position, 'LatitudeDegrees', point.lat.toFixed(7));
    appendElement(document, position, 'LongitudeDegrees', point.lng.toFixed(7));

    if (point.elevation !== undefined) {
      appendElement(document, trackPoint, 'AltitudeMeters', point.elevation.toFixed(1));
    }

    appendElement(document, trackPoint, 'DistanceMeters', point.distance.toFixed(1));
  });

  return serializeXml(document);
};

export const downloadRouteFile = (input: RouteExportInput, format: ExportFormat) => {
  const routeName = getRouteName(input.routeName);
  const fileName = `${sanitizeFileName(routeName)}.${format}`;
  const contents = format === 'gpx' ? buildGpx(input) : buildTcx(input);
  const blob = new Blob([contents], {
    type: format === 'gpx' ? 'application/gpx+xml' : 'application/vnd.garmin.tcx+xml',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
