import { useState } from 'react';
import { useAIStore } from '../stores/aiStore';
import { useRouteStore } from '../stores/routeStore';
import { useAIAssistant } from '../hooks/useAIAssistant';
import type { ElevationPoint } from '../types';

interface AIAssistantPanelProps {
  elevationPoints: ElevationPoint[];
  elevationGain: number;
  elevationLoss: number;
  elevationStatus: 'valid' | 'degraded';
}

type RouteType = 'easy_run' | 'long_run' | 'race' | 'trail' | 'custom';

const routeTypeLabels: Record<RouteType, string> = {
  easy_run: 'Easy Run',
  long_run: 'Long Run',
  race: 'Race',
  trail: 'Trail',
  custom: 'Custom',
};

export function AIAssistantPanel({
  elevationPoints,
  elevationGain,
  elevationLoss,
  elevationStatus,
}: AIAssistantPanelProps) {
  const { totalDistance } = useRouteStore();
  const {
    hydrationSuggestions,
    hydrationSummary,
    hydrationSource,
    hydrationWarnings,
    routeText,
    isGeneratingHydration,
    isGeneratingRouteText,
    error,
    activeTab,
    setActiveTab,
    clearAll,
  } = useAIStore();

  const { generateHydration, generateRouteText, downloadRouteText, hasRoute } = useAIAssistant({
    elevationPoints,
    elevationGain,
    elevationLoss,
    elevationStatus,
  });

  const [isExpanded, setIsExpanded] = useState(true);
  const [routeType, setRouteType] = useState<RouteType>('easy_run');
  const [pace, setPace] = useState(360);

  if (totalDistance <= 0) {
    return null;
  }

  const canGenerateHydration = hasRoute && totalDistance >= 1000;
  const canGenerateRouteText = hasRoute && totalDistance >= 100;
  const hasHydration = hydrationSuggestions.length > 0;
  const hasRouteText = Boolean(routeText);
  const hasResult = hasHydration || hasRouteText;
  const summaryText = hasHydration
    ? `${hydrationSuggestions.length} hydration point${hydrationSuggestions.length > 1 ? 's' : ''}`
    : hasRouteText
      ? 'Cue sheet siap'
      : totalDistance < 100
        ? 'Tambah sedikit lagi untuk cue sheet'
        : totalDistance < 1000
          ? 'Hydration aktif mulai 1 km'
          : 'Rekomendasi untuk rute ini';

  return (
    <div className="border-t border-outline-variant/35 bg-[rgba(255,255,255,0.56)] px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={isExpanded}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-white shadow-[0_8px_18px_rgba(0,80,203,0.2)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5 6.8 15M17.2 9l2.6-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary-container">
              AI Assistant
            </span>
            <span className="block truncate text-xs font-semibold text-on-surface-variant">
              {summaryText}
            </span>
          </span>
          <svg
            className={`ml-auto h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:text-primary-container ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {hasResult && (
          <button
            onClick={clearAll}
            className="rounded-full px-2 py-1 text-xs font-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 rounded-xl border border-outline-variant/35 bg-white/82 p-3 shadow-[0_8px_20px_rgba(23,27,41,0.05)]">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container-low p-1">
            <button
              onClick={() => setActiveTab('hydration')}
              className={`h-9 rounded-md px-3 text-xs font-extrabold transition-colors ${
                activeTab === 'hydration'
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Hydration
            </button>
            <button
              onClick={() => setActiveTab('routetext')}
              className={`h-9 rounded-md px-3 text-xs font-extrabold transition-colors ${
                activeTab === 'routetext'
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Route Text
            </button>
          </div>

          {activeTab === 'hydration' && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value as RouteType)}
                  className="min-w-0 rounded-lg border border-outline-variant/45 bg-surface-container-low px-2 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary-container"
                  aria-label="Jenis rute"
                >
                  {Object.entries(routeTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={pace}
                  onChange={(e) => setPace(Number(e.target.value))}
                  className="min-w-0 rounded-lg border border-outline-variant/45 bg-surface-container-low px-2 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary-container"
                  aria-label="Pace untuk rekomendasi hidrasi"
                >
                  <option value={300}>5:00/km</option>
                  <option value={330}>5:30/km</option>
                  <option value={360}>6:00/km</option>
                  <option value={390}>6:30/km</option>
                  <option value={420}>7:00/km</option>
                  <option value={480}>8:00/km</option>
                </select>
              </div>

              <button
                onClick={() => generateHydration(routeType, pace)}
                disabled={!canGenerateHydration || isGeneratingHydration}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(0,80,203,0.2)] transition-all hover:-translate-y-0.5 hover:bg-primary disabled:translate-y-0 disabled:opacity-40"
                type="button"
              >
                {isGeneratingHydration ? (
                  <span className="animate-pulse">Generating...</span>
                ) : (
                  totalDistance < 1000 ? 'Hydration Min. 1 km' : 'Generate Hydration'
                )}
              </button>

              {hydrationSummary && (
                <div className="rounded-lg border border-outline-variant/35 bg-surface-container-low/70 p-3">
                  <p className="text-xs font-medium leading-5 text-on-surface">{hydrationSummary}</p>
                  {hydrationSource && (
                    <span className="mt-2 inline-flex rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-primary-container">
                      {hydrationSource}
                    </span>
                  )}
                </div>
              )}

              {hasHydration && (
                <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {hydrationSuggestions.map((point, i) => (
                    <div key={`${point.label}-${i}`} className="rounded-lg border border-outline-variant/30 bg-white/86 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-extrabold text-on-surface">{point.label}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                          point.priority === 'high' ? 'bg-error-container text-on-error-container' :
                          point.priority === 'medium' ? 'bg-primary-container/15 text-primary-container' :
                          'bg-surface-container text-on-surface-variant'
                        }`}>
                          {point.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">KM {point.distanceKm} - {point.reason}</p>
                      {point.notes && <p className="mt-1 text-[10px] italic leading-4 text-on-surface-variant">{point.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {hydrationWarnings.length > 0 && (
                <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/50 p-2">
                  {hydrationWarnings.map((warning, i) => (
                    <p key={`${warning}-${i}`} className="text-[10px] leading-4 text-on-surface-variant">{warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'routetext' && (
            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => generateRouteText(pace)}
                disabled={!canGenerateRouteText || isGeneratingRouteText}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-container px-4 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(0,80,203,0.2)] transition-all hover:-translate-y-0.5 hover:bg-primary disabled:translate-y-0 disabled:opacity-40"
                type="button"
              >
                {isGeneratingRouteText ? (
                  <span className="animate-pulse">Generating...</span>
                ) : (
                  totalDistance < 100 ? 'Cue Sheet Min. 100 m' : 'Generate Cue Sheet'
                )}
              </button>

              {routeText && (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-outline-variant/35 bg-surface-container-low/70 p-3">
                    <p className="text-xs font-extrabold text-on-surface">{routeText.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">{routeText.summary}</p>
                    <span className="mt-2 inline-flex rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-primary-container">
                      {routeText.source}
                    </span>
                  </div>

                  {routeText.steps.length > 0 && (
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-outline-variant/30 bg-white/86 p-2 pr-1">
                      {routeText.steps.map((step, i) => (
                        <p key={`${step.distanceKm}-${i}`} className="text-[11px] leading-4 text-on-surface">
                          <span className="font-extrabold text-primary-container">KM {step.distanceKm.toFixed(1)}</span>{' '}
                          {step.text}
                        </p>
                      ))}
                    </div>
                  )}

                  {routeText.downloadText && (
                    <button
                      onClick={() => downloadRouteText(routeText.downloadText)}
                      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-outline-variant/45 bg-surface-container-low px-4 text-xs font-extrabold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container"
                      type="button"
                    >
                      Download .txt
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-error-container/30 p-2 text-[11px] leading-4 text-error">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
