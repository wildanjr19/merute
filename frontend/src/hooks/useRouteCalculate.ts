import { useEffect, useRef } from 'react';
import { useRouteStore } from '../stores/routeStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { distance } from '@turf/turf';

/**
 * Hook untuk menghitung rute menggunakan GraphHopper API
 * dengan debounce 500ms untuk mengurangi spam request
 */
export const useRouteCalculate = () => {
  const { waypoints, setSegments, setIsCalculating } = useRouteStore();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Need at least 2 waypoints to calculate route
    if (waypoints.length < 2) {
      setSegments([], 0);
      setIsCalculating(false);
      return;
    }

    // Debounce: wait 500ms before making API call
    debounceTimerRef.current = setTimeout(() => {
      calculateRoute();
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [waypoints]);

  const calculateRoute = async () => {
    setIsCalculating(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await api.calculateRoute({
        waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
      });

      setSegments(response.segments, response.totalDistance);
      setIsCalculating(false);
    } catch (error: any) {
      // Don't show error if request was aborted (user is still editing)
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }

      console.error('Route calculation failed:', error);
      setIsCalculating(false);

      // Fallback: calculate straight line distance using turf
      const fallbackDistance = calculateFallbackDistance();
      setSegments([], fallbackDistance);

      toast.error('Gagal menghitung rute. Menggunakan estimasi garis lurus.', {
        duration: 3000,
      });
    }
  };

  /**
   * Fallback calculation using straight line distance between waypoints
   */
  const calculateFallbackDistance = (): number => {
    let totalDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = [waypoints[i].lng, waypoints[i].lat];
      const to = [waypoints[i + 1].lng, waypoints[i + 1].lat];
      
      // Calculate distance in kilometers, convert to meters
      const dist = distance(from, to, { units: 'kilometers' }) * 1000;
      totalDistance += dist;
    }

    return totalDistance;
  };
};
