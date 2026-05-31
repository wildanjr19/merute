import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { distance } from '@turf/turf';
import { useRouteStore } from '../stores/routeStore';
import { api } from '../services/api';

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
 * Hook untuk menghitung rute menggunakan GraphHopper API
 * dengan debounce 500ms untuk mengurangi spam request.
 */
export const useRouteCalculate = () => {
  const { waypoints, setSegments, setIsCalculating } = useRouteStore();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateFallbackDistance = useCallback((): number => {
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = [waypoints[i].lng, waypoints[i].lat];
      const to = [waypoints[i + 1].lng, waypoints[i + 1].lat];
      const dist = distance(from, to, { units: 'kilometers' }) * 1000;
      totalDistance += dist;
    }

    return totalDistance;
  }, [waypoints]);

  const calculateRoute = useCallback(async () => {
    setIsCalculating(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.calculateRoute({
        waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
      });

      setSegments(response.segments, response.totalDistance, response.instructions ?? []);
      setIsCalculating(false);
    } catch (error: unknown) {
      if (isCanceledRequest(error)) {
        return;
      }

      console.error('Route calculation failed:', error);
      setIsCalculating(false);

      const fallbackDistance = calculateFallbackDistance();
      setSegments([], fallbackDistance, []);

      toast.error('Gagal menghitung rute. Menggunakan estimasi garis lurus.', {
        duration: 3000,
      });
    }
  }, [calculateFallbackDistance, setIsCalculating, setSegments, waypoints]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (waypoints.length < 2) {
      setSegments([], 0, []);
      setIsCalculating(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void calculateRoute();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [calculateRoute, setIsCalculating, setSegments, waypoints]);
};
