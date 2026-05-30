import { useEffect, useState, useRef } from 'react';
import { useRouteStore } from '../stores/routeStore';
import { api } from '../services/api';
import type { ElevationResponse } from '../types';

/**
 * Hook untuk fetch elevation data dari backend
 * Cache per route untuk menghindari request berulang
 */
export const useElevation = () => {
  const { segments, totalDistance } = useRouteStore();
  const [elevationData, setElevationData] = useState<ElevationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache key based on segments to avoid refetching same route
  const cacheKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Need segments to fetch elevation
    if (segments.length === 0 || totalDistance === 0) {
      setElevationData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Create cache key from segments
    const newCacheKey = JSON.stringify(segments.map(s => s.polyline.coordinates));
    
    // Skip if same route (cached)
    if (newCacheKey === cacheKeyRef.current && elevationData) {
      return;
    }

    cacheKeyRef.current = newCacheKey;
    fetchElevation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [segments, totalDistance]);

  const fetchElevation = async () => {
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      // Merge all segment polylines into one
      const allCoordinates: number[][] = [];
      segments.forEach(segment => {
        allCoordinates.push(...segment.polyline.coordinates);
      });

      // Create merged polyline
      const mergedPolyline: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: allCoordinates,
      };

      const response = await api.getElevation(mergedPolyline);
      setElevationData(response);
      setIsLoading(false);
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }

      console.error('Elevation fetch failed:', err);
      setError('Gagal mengambil data elevasi');
      setIsLoading(false);
    }
  };

  return {
    elevationData,
    isLoading,
    error,
  };
};
