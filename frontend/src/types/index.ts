// Waypoint type
export interface Waypoint {
  lat: number;
  lng: number;
  id: string;
}

// Route segment from GraphHopper
export interface RouteSegment {
  polyline: GeoJSON.LineString;
  distance: number; // in meters
}

// Route calculation request
export interface RouteCalculateRequest {
  waypoints: Array<{ lat: number; lng: number }>;
}

// Route calculation response
export interface RouteCalculateResponse {
  segments: RouteSegment[];
  totalDistance: number; // in meters
}

// Elevation point
export interface ElevationPoint {
  distance: number; // cumulative distance in meters
  elevation: number; // in meters
  lat: number;
  lng: number;
}

// Elevation response
export interface ElevationResponse {
  points: ElevationPoint[];
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
  elevationStatus?: 'valid' | 'degraded';
}

// Saved route (LocalStorage)
export interface SavedRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  totalDistance: number;
  createdAt: string;
}

// === AI Types ===

export interface HydrationPoint {
  label: string;
  distanceKm: number;
  lat: number;
  lng: number;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  notes: string;
}

export interface HydrationResponse {
  summary: string;
  points: HydrationPoint[];
  source: 'ai' | 'rules' | 'hybrid';
  warnings: string[];
}

export interface HydrationRequest {
  route: {
    polyline: GeoJSON.LineString;
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    elevationPoints: ElevationPoint[];
    elevationStatus: 'valid' | 'degraded';
  };
  preferences: {
    paceSecondsPerKm: number;
    routeType: 'easy_run' | 'long_run' | 'race' | 'trail' | 'custom';
    maxPoints: number;
    notes: string;
  };
}

export interface RouteTextStep {
  distanceKm: number;
  text: string;
}

export interface RouteTextResponse {
  title: string;
  summary: string;
  steps: RouteTextStep[];
  source: 'ai' | 'template' | 'hybrid';
  downloadText: string;
}

export interface RouteTextRequest {
  route: {
    polyline: GeoJSON.LineString;
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    elevationPoints: ElevationPoint[];
    elevationStatus: 'valid' | 'degraded';
  };
  segments: any[];
  options: {
    paceSecondsPerKm: number;
    language: 'id' | 'en';
    format: 'cue_sheet' | 'narrative';
  };
}

