import { useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { usePlannerStore } from '../stores/plannerStore';
import { useRouteStore } from '../stores/routeStore';

interface UseRunPlannerProps {
  elevationGain: number;
  elevationLoss: number;
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }

  return fallback;
};

const formatWaypointKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

export function useRunPlanner({ elevationGain, elevationLoss }: UseRunPlannerProps) {
  const { segments, totalDistance, paceMinPerKm, waypoints, isCalculating } = useRouteStore();
  const {
    date,
    priority,
    result,
    isAnalyzing,
    error,
    lastRequestKey,
    getTimeWindows,
    setResult,
    setIsAnalyzing,
    setError,
  } = usePlannerStore();

  const timeWindows = getTimeWindows();
  const hasRoute = segments.length > 0 && totalDistance >= 100 && waypoints.length >= 2 && !isCalculating;
  const unavailableMessage = useMemo(() => {
    if (waypoints.length < 2) {
      return 'Tambahkan minimal 2 titik rute.';
    }

    if (isCalculating) {
      return 'Tunggu rute selesai dihitung.';
    }

    if (totalDistance < 100) {
      return 'Rute minimal 100 m untuk dianalisis.';
    }

    if (segments.length === 0) {
      return 'Rute snap-to-road belum siap.';
    }

    return 'Rute belum siap dianalisis.';
  }, [isCalculating, segments.length, totalDistance, waypoints.length]);
  const routeKey = useMemo(() => {
    const waypointKey = waypoints
      .map((waypoint) => formatWaypointKey(waypoint.lat, waypoint.lng))
      .join('|');
    return `${waypointKey}:${Math.round(totalDistance)}:${segments.length}`;
  }, [segments.length, totalDistance, waypoints]);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        routeKey,
        date,
        priority,
        pace: Math.round(paceMinPerKm * 60),
        timeWindows,
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
      }),
    [date, elevationGain, elevationLoss, paceMinPerKm, priority, routeKey, timeWindows],
  );

  const isStale = Boolean(result && lastRequestKey && lastRequestKey !== requestKey);

  const analyze = async () => {
    if (!hasRoute) {
      toast.error('Buat rute minimal 100 m terlebih dahulu');
      return;
    }

    const polyline = segments[0]?.polyline;
    if (!polyline || polyline.coordinates.length < 2) {
      toast.error('Rute belum siap dianalisis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await api.getStartTimeRecommendations({
        route: {
          polyline,
          totalDistance,
          elevationGain,
          elevationLoss,
        },
        preferences: {
          date,
          timeWindows,
          paceSecondsPerKm: Math.round(paceMinPerKm * 60),
          priority,
        },
      });

      setResult(response, requestKey);
      toast.success('Smart Run Planner selesai menganalisis');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Gagal menganalisis jam lari');
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyze,
    hasRoute,
    unavailableMessage,
    result,
    error,
    isAnalyzing,
    isStale,
    requestKey,
  };
}
