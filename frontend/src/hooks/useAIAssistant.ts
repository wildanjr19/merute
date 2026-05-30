import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouteStore } from '../stores/routeStore';
import { useAIStore } from '../stores/aiStore';
import { api } from '../services/api';
import type { ElevationPoint } from '../types';

interface UseAIAssistantProps {
  elevationPoints: ElevationPoint[];
  elevationGain: number;
  elevationLoss: number;
  elevationStatus: 'valid' | 'degraded';
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }

  return fallback;
};

export function useAIAssistant({ elevationPoints, elevationGain, elevationLoss, elevationStatus }: UseAIAssistantProps) {
  const { segments, totalDistance } = useRouteStore();
  const {
    setHydrationResult,
    setRouteTextResult,
    setIsGeneratingHydration,
    setIsGeneratingRouteText,
    setError,
  } = useAIStore();

  const getPolyline = (): GeoJSON.LineString | null => {
    if (segments.length === 0) return null;
    return segments[0].polyline;
  };

  const generateHydration = async (
    routeType: 'easy_run' | 'long_run' | 'race' | 'trail' | 'custom' = 'easy_run',
    paceSecondsPerKm: number = 360,
    maxPoints: number = 5
  ) => {
    const polyline = getPolyline();
    if (!polyline || totalDistance < 1000) {
      toast.error('Rute minimal 1 km untuk generate rekomendasi hidrasi');
      return;
    }

    setIsGeneratingHydration(true);
    setError(null);

    try {
      const result = await api.getHydrationSuggestions({
        route: {
          polyline,
          totalDistance,
          elevationGain,
          elevationLoss,
          elevationPoints,
          elevationStatus,
        },
        preferences: {
          paceSecondsPerKm,
          routeType,
          maxPoints,
          notes: '',
        },
      });
      setHydrationResult(result);
      toast.success(`${result.points.length} titik hidrasi direkomendasikan`);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Gagal generate rekomendasi hidrasi');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGeneratingHydration(false);
    }
  };

  const generateRouteText = async (
    paceSecondsPerKm: number = 360,
    language: 'id' | 'en' = 'id',
    format: 'cue_sheet' | 'narrative' = 'cue_sheet'
  ) => {
    const polyline = getPolyline();
    if (!polyline || totalDistance < 100) {
      toast.error('Rute terlalu pendek untuk generate teks');
      return;
    }

    setIsGeneratingRouteText(true);
    setError(null);

    try {
      const result = await api.getRouteText({
        route: {
          polyline,
          totalDistance,
          elevationGain,
          elevationLoss,
          elevationPoints,
          elevationStatus,
        },
        segments: [],
        options: {
          paceSecondsPerKm,
          language,
          format,
        },
      });
      setRouteTextResult(result);
      toast.success('Cue sheet berhasil di-generate');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Gagal generate route text');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGeneratingRouteText(false);
    }
  };

  const downloadRouteText = (text: string, filename: string = 'merute-cue-sheet.txt') => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    generateHydration,
    generateRouteText,
    downloadRouteText,
    hasRoute: segments.length > 0 && totalDistance > 0,
  };
}
