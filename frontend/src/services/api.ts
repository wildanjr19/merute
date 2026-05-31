import axios, { AxiosError } from 'axios';
import type { ElevationResponse, RouteCalculateRequest, RouteCalculateResponse, HydrationRequest, HydrationResponse, RouteTextRequest, RouteTextResponse } from '../types/index.js';

// Base API configuration.
// Default kosong = same-origin: request memakai path relatif (/api, /health),
// sehingga build yang sama jalan di lokal (via Vite proxy) maupun produksi
// (via reverse proxy OpenResty/1Panel). Override hanya jika backend beda origin.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle errors
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('[API Error] No response received:', error.message);
    } else {
      // Error in request setup
      console.error('[API Error]:', error.message);
    }
    return Promise.reject(error);
  }
);

// API service methods
export const api = {
  // Health check
  health: async (): Promise<{ status: string; graphhopper: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Calculate route
  calculateRoute: async (request: RouteCalculateRequest): Promise<RouteCalculateResponse> => {
    const response = await apiClient.post('/api/routes/calculate', request);
    return response.data;
  },

  // Get elevation data
  getElevation: async (polyline: GeoJSON.LineString): Promise<ElevationResponse> => {
    const response = await apiClient.post('/api/routes/elevation', { polyline });
    return response.data;
  },

  // AI: Hydration suggestions
  getHydrationSuggestions: async (request: HydrationRequest): Promise<HydrationResponse> => {
    const response = await apiClient.post('/api/ai/hydration-suggestions', request);
    return response.data;
  },

  // AI: Route text
  getRouteText: async (request: RouteTextRequest): Promise<RouteTextResponse> => {
    const response = await apiClient.post('/api/ai/route-text', request);
    return response.data;
  },
};

export default apiClient;
