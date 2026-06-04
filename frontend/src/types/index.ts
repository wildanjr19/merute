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

// Turn-by-turn instruction from GraphHopper
export interface RouteInstruction {
  text: string; // e.g. "Belok kiri ke Jl. Slamet Riyadi"
  distance: number; // length of this leg in meters
  duration: number; // in seconds
  cumulativeDistance: number; // distance from start in meters
  sign: number; // maneuver type (0=straight, -2=left, 2=right, etc)
  interval: number[]; // [start_idx, end_idx] in coordinates
  lat?: number;
  lng?: number;
}

// Route calculation request
export interface RouteCalculateRequest {
  waypoints: Array<{ lat: number; lng: number }>;
}

// Route calculation response
export interface RouteCalculateResponse {
  segments: RouteSegment[];
  totalDistance: number; // in meters
  totalDuration?: number; // in seconds
  instructions?: RouteInstruction[];
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
  instructions: RouteInstruction[];
  options: {
    paceSecondsPerKm: number;
    language: 'id' | 'en';
    format: 'cue_sheet' | 'narrative';
  };
}

// === Smart Run Planner Types ===

export type PlannerPriority = 'balanced' | 'avoid_heat' | 'avoid_rain';

export interface PlannerTimeWindow {
  start: string;
  end: string;
}

export interface PlannerWeatherSnapshot {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  rainProbability: number;
  rainVolume: number;
  weatherCode: number;
  windSpeed: number;
  windGust: number;
  uvIndex: number;
}

export interface PlannerRecommendation {
  startTime: string;
  finishTime: string;
  score: number;
  label: 'best' | 'alternative';
  weather: PlannerWeatherSnapshot;
  reasons: string[];
  risks: string[];
}

export interface PlannerAvoidWindow {
  start: string;
  end: string;
  reason: string;
  score: number;
}

export interface PlannerProviderMeta {
  name: string;
  attribution: string;
  timezone?: string | null;
  forecastDate: string;
}

export interface StartTimeRequest {
  route: {
    polyline: GeoJSON.LineString;
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  };
  preferences: {
    date: string;
    timeWindows: PlannerTimeWindow[];
    paceSecondsPerKm: number;
    priority: PlannerPriority;
  };
}

export interface StartTimeResponse {
  summary: string;
  recommendations: PlannerRecommendation[];
  avoidWindows: PlannerAvoidWindow[];
  source: 'rules';
  provider: PlannerProviderMeta;
}

