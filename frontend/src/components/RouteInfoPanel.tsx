import { useMemo } from 'react';
import { useRouteStore } from '../stores/routeStore';
import { useElevation } from '../hooks/useElevation';
import { AIAssistantPanel } from './AIAssistantPanel';
import { nearestPointOnLine, length, lineSlice, point } from '@turf/turf';
import type { Feature, LineString } from 'geojson';

export default function RouteInfoPanel() {
  const {
    waypoints,
    segments,
    totalDistance,
    isCalculating,
    paceMinPerKm,
    setPaceMinPerKm,
    canUndo,
    canRedo,
    undo,
    redo,
    clearAll,
    removeWaypoint,
  } = useRouteStore();

  // Hitung jarak kumulatif per waypoint dari polyline rute
  const cumulativeDistances = useMemo(() => {
    if (segments.length === 0 || waypoints.length < 2) {
      return waypoints.map(() => 0);
    }

    const polyline = segments[0].polyline as Feature<LineString> | LineString;
    const line: Feature<LineString> = polyline.type === 'LineString'
      ? { type: 'Feature', properties: {}, geometry: polyline }
      : polyline as Feature<LineString>;

    const coords = line.geometry.coordinates;
    if (coords.length < 2) return waypoints.map(() => 0);

    const startPoint = point(coords[0]);

    return waypoints.map((wp) => {
      const snapped = nearestPointOnLine(line, point([wp.lng, wp.lat]));
      const sliced = lineSlice(startPoint, snapped, line);
      return length(sliced, { units: 'meters' });
    });
  }, [waypoints, segments]);

  const { elevationData } = useElevation();

  const handleClearAll = () => {
    const confirmed = window.confirm(
      'Hapus semua waypoint? Tindakan ini tidak dapat dibatalkan.'
    );
    if (confirmed) {
      clearAll();
    }
  };

  const formatDistance = (meters: number) => {
    if (meters === 0) return '--';
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const calculateEstimatedTime = (meters: number) => {
    if (meters === 0) return '--';
    const distanceKm = meters / 1000;
    const totalMinutes = distanceKm * paceMinPerKm;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getWaypointMeta = (index: number) => {
    if (index === 0) {
      return {
        label: 'A',
        title: 'Startpoint',
        bgColor: 'bg-secondary',
        borderColor: 'border-l-secondary',
      };
    }

    if (index === waypoints.length - 1) {
      return {
        label: 'B',
        title: 'Finish',
        bgColor: 'bg-error',
        borderColor: 'border-l-error',
      };
    }

    return {
      label: String(index),
      title: index === 1 ? 'Street Corner' : 'Checkpoint',
      bgColor: 'bg-primary-container',
      borderColor: 'border-l-primary-container',
    };
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-outline-variant/40 bg-[rgba(255,255,255,0.82)] shadow-[18px_0_42px_rgba(23,27,41,0.08)] backdrop-blur-xl">
      <div className="px-6 pb-3 pt-5">
        <h1 className="text-[24px] font-extrabold leading-7 tracking-normal text-on-surface">
          Route Details
        </h1>
      </div>

      <div className="space-y-3 px-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-outline-variant/45 bg-surface-container/70 p-3 shadow-[0_10px_24px_rgba(0,80,203,0.06)]">
            <div className="mb-2 flex items-center gap-2 text-on-surface">
              <svg className="h-5 w-5 text-primary-container" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 18c-1.7 0-3-1.3-3-3s1.3-3 3-3h10a3 3 0 1 0 0-6H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 21v-6M17 9V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-semibold">Distance</p>
            </div>
            <p className="text-[25px] font-extrabold leading-8 tracking-normal text-primary-container">
              {isCalculating ? <span className="animate-pulse">...</span> : formatDistance(totalDistance)}
            </p>
          </div>

          <div className="rounded-xl border border-primary-container/25 bg-primary-fixed/70 p-3 shadow-[0_10px_24px_rgba(0,80,203,0.08)]">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-container">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Est. Time
            </p>
            <p className="text-[25px] font-extrabold leading-8 tracking-normal text-primary-container">
              {isCalculating ? <span className="animate-pulse">...</span> : calculateEstimatedTime(totalDistance)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/45 bg-surface-container/70 p-3 shadow-[0_10px_24px_rgba(0,80,203,0.04)]">
          <div className="mb-2 flex items-center gap-2 text-on-surface">
            <svg className="h-5 w-5 text-primary-container" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold">Pace</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={paceMinPerKm}
              onChange={(e) => setPaceMinPerKm(Number(e.target.value))}
              className="flex-1 rounded-lg border border-outline-variant/50 bg-white/80 px-3 py-2 text-sm font-semibold text-on-surface shadow-sm transition-colors focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
              aria-label="Running pace per kilometer"
            >
              <option value={4}>4:00 /km</option>
              <option value={4.5}>4:30 /km</option>
              <option value={5}>5:00 /km</option>
              <option value={5.5}>5:30 /km</option>
              <option value={6}>6:00 /km</option>
              <option value={6.5}>6:30 /km</option>
              <option value={7}>7:00 /km</option>
              <option value={7.5}>7:30 /km</option>
              <option value={8}>8:00 /km</option>
              <option value={9}>9:00 /km</option>
              <option value={10}>10:00 /km</option>
            </select>
            <span className="whitespace-nowrap text-xs text-on-surface-variant">min/km</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-low px-3 py-3 text-[15px] font-semibold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container disabled:translate-y-0 disabled:opacity-40"
            title="Undo (Ctrl+Z)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 7 5 11l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 11h8a5 5 0 0 1 5 5v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-low px-3 py-3 text-[15px] font-semibold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container disabled:translate-y-0 disabled:opacity-40"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m15 7 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 11h-8a5 5 0 0 0-5 5v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Redo
          </button>
          <button
            onClick={handleClearAll}
            disabled={waypoints.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-error-container bg-error-container px-3 py-3 text-[15px] font-semibold text-on-error-container shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#ffc8c2] disabled:translate-y-0 disabled:opacity-40"
            title="Clear All (Esc)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="m6 7 1 13h10l1-13M9 7l1-3h4l1 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-label-lg uppercase tracking-[0.08em] text-on-surface">Waypoints</h2>
          <span className="text-sm font-medium text-on-surface-variant">Drag to reorder</span>
        </div>

        {waypoints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/65 px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
              </svg>
            </div>
            <p className="text-body-sm text-on-surface-variant">Klik di peta untuk menambah waypoint</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waypoints.map((waypoint, index) => {
              const { label, title, bgColor, borderColor } = getWaypointMeta(index);

              return (
                <div
                  key={waypoint.id}
                  className={`group flex items-center gap-4 rounded-xl border border-outline-variant/35 border-l-4 bg-white/86 p-4 shadow-[0_8px_22px_rgba(23,27,41,0.07)] transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_rgba(23,27,41,0.1)] ${borderColor}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-label-lg font-bold text-on-primary shadow-sm ${bgColor}`}
                  >
                    {label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-normal text-on-surface">
                      {title}
                    </p>
                    <p className="truncate font-mono text-[15px] text-on-surface-variant">
                      {cumulativeDistances[index] !== undefined
                        ? `KM ${(cumulativeDistances[index] / 1000).toFixed(1)}`
                        : 'KM --'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeWaypoint(waypoint.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-bold leading-none text-error opacity-70 transition-all hover:bg-error-container hover:opacity-100"
                    title="Hapus waypoint"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AIAssistantPanel
        elevationPoints={elevationData?.points || []}
        elevationGain={elevationData?.elevationGain || 0}
        elevationLoss={elevationData?.elevationLoss || 0}
        elevationStatus={elevationData?.elevationStatus || 'valid'}
      />

      <div className="border-t border-outline-variant/35 bg-surface-container-low/80 p-6">
        <p className="text-sm leading-relaxed text-on-surface-variant">
          <strong className="font-bold text-on-surface">Tips:</strong> Klik peta untuk tambah waypoint, drag marker untuk pindah, klik kanan marker untuk hapus.
        </p>
      </div>
    </div>
  );
}
