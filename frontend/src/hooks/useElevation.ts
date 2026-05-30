import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouteStore } from '../stores/routeStore';
import { api } from '../services/api';
import type { ElevationResponse } from '../types';

const isCanceledRequest = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeCanceled = error as { code?: string; name?: string };
    return maybeCanceled.code === 'ERR_CANCELED' || maybeCanceled.name === 'AbortError';
  }

  return false;
};

/**
 * Hook untuk fetch elevation data dari backend.
 * Cache per route untuk menghindari request berulang.
 */
export const useElevation = () => {
  const { segments, totalDistance } = useRouteStore();
  const [elevationData, setElevationData] = useState<ElevationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRoute = segments.length > 0 && totalDistance > 0;

  const fetchElevation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const allCoordinates: number[][] = [];
      segments.forEach((segment) => {
        allCoordinates.push(...segment.polyline.coordinates);
      });

      const mergedPolyline: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: allCoordinates,
      };

      const response = await api.getElevation(mergedPolyline);
      setElevationData(response);
      setIsLoading(false);
    } catch (err: unknown) {
      if (isCanceledRequest(err)) {
        return;
      }

      console.error('Elevation fetch failed:', err);
      setError('Gagal mengambil data elevasi');
      setIsLoading(false);
    }
  }, [segments]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!hasRoute) {
      cacheKeyRef.current = '';
      return;
    }

    const newCacheKey = JSON.stringify(segments.map((segment) => segment.polyline.coordinates));
    if (newCacheKey === cacheKeyRef.current) {
      return;
    }

    cacheKeyRef.current = newCacheKey;
    void fetchElevation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchElevation, hasRoute, segments]);

  return {
    elevationData: hasRoute ? elevationData : null,
    isLoading: hasRoute ? isLoading : false,
    error: hasRoute ? error : null,
  };
};
