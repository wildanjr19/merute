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

export function AIAssistantPanel({ elevationPoints, elevationGain, elevationLoss, elevationStatus }: AIAssistantPanelProps) {
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

  const [routeType, setRouteType] = useState<'easy_run' | 'long_run' | 'race' | 'trail' | 'custom'>('easy_run');
  const [pace, setPace] = useState(360);

  if (totalDistance < 100) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/35 px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-label-lg uppercase tracking-[0.14em] text-primary-container">AI Assistant</p>
        {(hydrationSuggestions.length > 0 || routeText) && (
          <button onClick={clearAll} className="text-xs font-medium text-on-surface-variant hover:text-error">
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-surface-container-low p-1">
        <button
          onClick={() => setActiveTab('hydration')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'hydration'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Hydration
        </button>
        <button
          onClick={() => setActiveTab('routetext')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'routetext'
              ? 'bg-primary-container text-on-primary-container shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Route Text
        </button>
      </div>

      {activeTab === 'hydration' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={routeType}
              onChange={(e) => setRouteType(e.target.value as any)}
              className="flex-1 rounded-lg border border-outline-variant/45 bg-surface-container-low px-2 py-1.5 text-xs"
            >
              <option value="easy_run">Easy Run</option>
              <option value="long_run">Long Run</option>
              <option value="race">Race</option>
              <option value="trail">Trail</option>
              <option value="custom">Custom</option>
            </select>
            <select
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="flex-1 rounded-lg border border-outline-variant/45 bg-surface-container-low px-2 py-1.5 text-xs"
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
            disabled={!hasRoute || isGeneratingHydration}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary-container/40 bg-primary-fixed/80 px-4 py-2.5 text-sm font-semibold text-primary-container shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-fixed disabled:translate-y-0 disabled:opacity-40"
          >
            {isGeneratingHydration ? (
              <span className="animate-pulse">Generating...</span>
            ) : (
              'Generate Hydration Points'
            )}
          </button>

          {hydrationSummary && (
            <div className="rounded-lg border border-outline-variant/35 bg-surface-container-low/70 p-3">
              <p className="mb-2 text-xs font-medium text-on-surface">{hydrationSummary}</p>
              {hydrationSource && (
                <span className="inline-block rounded-full bg-primary-container/20 px-2 py-0.5 text-[10px] font-semibold text-primary-container">
                  {hydrationSource}
                </span>
              )}
            </div>
          )}

          {hydrationSuggestions.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {hydrationSuggestions.map((point, i) => (
                <div key={i} className="rounded-lg border border-outline-variant/30 bg-white/80 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">{point.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      point.priority === 'high' ? 'bg-error-container text-on-error-container' :
                      point.priority === 'medium' ? 'bg-primary-container/20 text-primary-container' :
                      'bg-surface-container text-on-surface-variant'
                    }`}>
                      {point.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-on-surface-variant">KM {point.distanceKm} - {point.reason}</p>
                  {point.notes && <p className="mt-0.5 text-[10px] italic text-on-surface-variant">{point.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {hydrationWarnings.length > 0 && (
            <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/50 p-2">
              {hydrationWarnings.map((w, i) => (
                <p key={i} className="text-[10px] text-on-surface-variant">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'routetext' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => generateRouteText(pace)}
            disabled={!hasRoute || isGeneratingRouteText}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary-container/40 bg-primary-fixed/80 px-4 py-2.5 text-sm font-semibold text-primary-container shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-fixed disabled:translate-y-0 disabled:opacity-40"
          >
            {isGeneratingRouteText ? (
              <span className="animate-pulse">Generating...</span>
            ) : (
              'Generate Cue Sheet'
            )}
          </button>

          {routeText && (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-outline-variant/35 bg-surface-container-low/70 p-3">
                <p className="mb-1 text-xs font-bold text-on-surface">{routeText.title}</p>
                <p className="mb-2 text-[11px] text-on-surface-variant">{routeText.summary}</p>
                <span className="inline-block rounded-full bg-primary-container/20 px-2 py-0.5 text-[10px] font-semibold text-primary-container">
                  {routeText.source}
                </span>
              </div>

              {routeText.steps.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-outline-variant/30 bg-white/80 p-2">
                  {routeText.steps.map((step, i) => (
                    <p key={i} className="text-[11px] text-on-surface">
                      <span className="font-semibold text-primary-container">KM {step.distanceKm.toFixed(1)}</span>{' '}
                      {step.text}
                    </p>
                  ))}
                </div>
              )}

              {routeText.downloadText && (
                <button
                  onClick={() => downloadRouteText(routeText.downloadText)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container"
                >
                  Download .txt
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-error-container/30 p-2 text-[11px] text-error">{error}</p>
      )}
    </div>
  );
}
