import { useMemo, useState } from 'react';
import { nearestPointOnLine, length, lineSlice, point } from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import { useRouteStore } from '../stores/routeStore';
import { useMapStore } from '../stores/mapStore';
import { useElevation } from '../hooks/useElevation';
import { useSplitMarkerStore } from '../stores/splitMarkerStore';
import { AIAssistantPanel } from './AIAssistantPanel';

export default function RouteInfoPanel() {
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>(null);

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
  const { flyTo } = useMapStore();

  const {
    enabled: splitEnabled,
    unit: splitUnit,
    interval: splitInterval,
    setEnabled: setSplitEnabled,
    setUnit: setSplitUnit,
    setInterval: setSplitInterval,
  } = useSplitMarkerStore();

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
        title: 'Mulai',
        markerColor: 'border-secondary bg-secondary',
        connectorColor: 'bg-secondary/35',
      };
    }

    if (index === waypoints.length - 1) {
      return {
        label: 'B',
        title: 'Selesai',
        markerColor: 'border-error bg-error',
        connectorColor: 'bg-outline-variant',
      };
    }

    return {
      label: String(index),
      title: `Titik ${index}`,
      markerColor: 'border-primary-container bg-white text-primary-container',
      connectorColor: 'bg-outline-variant',
    };
  };

  const formatWaypointDistance = (meters: number | undefined) => {
    if (meters === undefined) return '-- km';

    return `${(meters / 1000).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} km`;
  };

  const focusWaypoint = (id: string, lng: number, lat: number) => {
    setActiveWaypointId(id);
    flyTo([lng, lat], 16);
  };

  const routeTip = waypoints.length === 0
    ? 'Klik peta untuk mulai membuat rute.'
    : 'Drag marker untuk pindah titik, klik kanan marker untuk hapus.';

  return (
    <div className="flex h-full w-full flex-col border-r border-outline-variant/40 bg-[rgba(250,252,255,0.9)] shadow-[18px_0_42px_rgba(23,27,41,0.08)] backdrop-blur-xl">
      <div className="shrink-0 px-5 pb-2 pt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary-container">
          Route builder
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-7 tracking-normal text-on-surface">
          Route Details
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-3 px-5">
        <div className="rounded-xl border border-outline-variant/45 bg-white/86 p-3 shadow-[0_10px_28px_rgba(23,27,41,0.06)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-primary-container px-3 py-3 text-white">
              <div className="mb-2 flex items-center gap-2 text-white/80">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 18c-1.7 0-3-1.3-3-3s1.3-3 3-3h10a3 3 0 1 0 0-6H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 21v-6M17 9V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]">Distance</p>
              </div>
              <p className="text-[24px] font-extrabold leading-7 tracking-normal">
                {isCalculating ? <span className="animate-pulse">...</span> : formatDistance(totalDistance)}
              </p>
            </div>

            <div className="rounded-lg bg-surface-container-low px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-primary-container">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]">Est. time</p>
              </div>
              <p className="text-[24px] font-extrabold leading-7 tracking-normal text-primary-container">
                {isCalculating ? <span className="animate-pulse">...</span> : calculateEstimatedTime(totalDistance)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_104px] gap-2">
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant/45 bg-surface-container-low/75 px-3 py-2">
              <svg className="h-4 w-4 shrink-0 text-primary-container" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">Running pace per kilometer</span>
              <select
                value={paceMinPerKm}
                onChange={(e) => setPaceMinPerKm(Number(e.target.value))}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-on-surface outline-none"
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
            </label>

            <div className="rounded-lg border border-outline-variant/35 bg-white/70 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant">Points</p>
              <p className="text-sm font-extrabold text-on-surface">{waypoints.length}</p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-outline-variant/35 bg-surface-container-low/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={splitEnabled}
                  onChange={(e) => setSplitEnabled(e.target.checked)}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-primary-container"
                  aria-label="Tampilkan split markers di peta"
                />
                <span className="flex min-w-0 items-center gap-1.5 text-on-surface">
                  <svg className="h-4 w-4 shrink-0 text-primary-container" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h16M8 8v8M12 6v12M16 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Split markers</span>
                </span>
              </label>

              <div className={`flex shrink-0 items-center gap-1 transition-opacity ${splitEnabled ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
                <select
                  value={splitInterval}
                  onChange={(e) => setSplitInterval(Number(e.target.value) as 1 | 2 | 5)}
                  className="h-7 cursor-pointer rounded-md border border-outline-variant/45 bg-white/80 px-1.5 text-[11px] font-bold text-on-surface outline-none focus:border-primary-container"
                  aria-label="Jarak antar marker"
                  disabled={!splitEnabled}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={5}>5</option>
                </select>
                <div className="flex h-7 overflow-hidden rounded-md border border-outline-variant/45 bg-white/80 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSplitUnit('km')}
                    className={`px-2 transition-colors ${splitUnit === 'km' ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                    disabled={!splitEnabled}
                    aria-label="Gunakan kilometer"
                  >
                    km
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitUnit('mi')}
                    className={`px-2 transition-colors ${splitUnit === 'mi' ? 'bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                    disabled={!splitEnabled}
                    aria-label="Gunakan mil"
                  >
                    mi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/45 bg-white/82 px-3 text-sm font-bold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container-low disabled:translate-y-0 disabled:opacity-40"
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
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/45 bg-white/82 px-3 text-sm font-bold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container-low disabled:translate-y-0 disabled:opacity-40"
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
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-error-container bg-error-container px-3 text-sm font-bold text-on-error-container shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#ffc8c2] disabled:translate-y-0 disabled:opacity-40"
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

      <div className="px-5 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-on-surface">Titik rute</h2>
          <span className="text-xs font-semibold text-on-surface-variant">
            {waypoints.length > 0 ? `${waypoints.length} titik` : 'Belum ada titik'}
          </span>
        </div>

        {waypoints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/70 bg-white/70 px-5 py-9 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-on-surface">Mulai dari peta</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Klik lokasi start, lalu tambah titik berikutnya untuk membentuk rute.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant/45 bg-white/86 shadow-[0_8px_22px_rgba(23,27,41,0.05)]">
            {waypoints.map((waypoint, index) => {
              const { label, title, markerColor, connectorColor } = getWaypointMeta(index);
              const isActive = activeWaypointId === waypoint.id;
              const isIntermediate = index > 0 && index < waypoints.length - 1;

              return (
                <div
                  key={waypoint.id}
                  className={`group relative flex min-h-[62px] items-center gap-3 px-3 transition-colors ${
                    index > 0 ? 'border-t border-outline-variant/35' : ''
                  } ${isActive ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/55'}`}
                >
                  <div className="relative flex w-7 shrink-0 self-stretch items-center justify-center">
                    {index < waypoints.length - 1 && (
                      <span
                        className={`absolute bottom-0 left-1/2 top-1/2 w-px -translate-x-1/2 ${connectorColor}`}
                        aria-hidden="true"
                      />
                    )}
                    {index > 0 && (
                      <span
                        className="absolute bottom-1/2 left-1/2 top-0 w-px -translate-x-1/2 bg-outline-variant"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-extrabold shadow-[0_2px_6px_rgba(23,27,41,0.12)] ${markerColor}`}
                    >
                      {label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => focusWaypoint(waypoint.id, waypoint.lng, waypoint.lat)}
                    className="min-w-0 flex-1 py-3 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary-container/45"
                    aria-label={`Fokus ke ${title}`}
                  >
                    <p className="truncate text-[13px] font-extrabold text-on-surface">
                      {title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-on-surface-variant">
                      {formatWaypointDistance(cumulativeDistances[index])} dari mulai
                    </p>
                  </button>

                  {isIntermediate && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeWaypoint(waypoint.id);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant/65 transition-colors hover:bg-error-container hover:text-error focus-visible:bg-error-container focus-visible:text-error focus-visible:outline-none"
                      title={`Hapus ${title}`}
                      aria-label={`Hapus ${title}`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
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
      </div>

      <div className="shrink-0 border-t border-outline-variant/35 bg-white/66 px-5 py-4">
        <p className="text-xs leading-5 text-on-surface-variant">
          <strong className="font-bold text-on-surface">Tips:</strong> {routeTip}
        </p>
      </div>
    </div>
  );
}
