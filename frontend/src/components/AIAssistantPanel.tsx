import { type ReactNode, useMemo, useState } from "react";
import { useAIStore } from "../stores/aiStore";
import { useRouteStore } from "../stores/routeStore";
import { useAIAssistant } from "../hooks/useAIAssistant";
import type { ElevationPoint } from "../types";

interface AIAssistantPanelProps {
  elevationPoints: ElevationPoint[];
  elevationGain: number;
  elevationLoss: number;
  elevationStatus: "valid" | "degraded";
  isExpanded?: boolean;
  onToggle?: () => void;
}

type RouteType = "easy_run" | "long_run" | "race" | "trail" | "custom";

const routeTypeLabels: Record<RouteType, string> = {
  easy_run: "Easy Run",
  long_run: "Long Run",
  race: "Race",
  trail: "Trail",
  custom: "Custom",
};

const paceOptions = [
  { value: 300, label: "5:00/km" },
  { value: 330, label: "5:30/km" },
  { value: 360, label: "6:00/km" },
  { value: 390, label: "6:30/km" },
  { value: 420, label: "7:00/km" },
  { value: 480, label: "8:00/km" },
];

const AssistantIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5 6.8 15M17.2 9l2.6-1.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ChevronIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3v12M7 10l5 5 5-5M5 21h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AssistantSelect = ({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <span className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-outline-variant/75 bg-white py-0 pl-3.5 pr-10 text-[14px] font-semibold text-on-surface shadow-[inset_0_0_0_1px_rgba(255,255,255,0.62)] outline-none transition-colors focus:border-primary-container focus:ring-4 focus:ring-primary-container/10"
        aria-label={label}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary-container">
        <ChevronIcon className="h-5 w-5" />
      </span>
    </span>
  </label>
);

const tabButtonClass = (active: boolean) =>
  `h-9 rounded-full px-3 text-sm font-semibold transition-all ${
    active
      ? "bg-primary-container text-white shadow-[0_8px_18px_rgba(0,80,203,0.24)]"
      : "text-primary-container/78 hover:text-primary-container"
  }`;

const primaryActionClass =
  "flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-4 text-[15px] font-extrabold text-white shadow-[0_14px_26px_rgba(0,80,203,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary disabled:translate-y-0 disabled:bg-primary-container/50 disabled:opacity-70";

export function AIAssistantPanel({
  elevationPoints,
  elevationGain,
  elevationLoss,
  elevationStatus,
  isExpanded: controlledExpanded,
  onToggle,
}: AIAssistantPanelProps) {
  const { segments, totalDistance } = useRouteStore();
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
    lastRouteKey,
    setActiveTab,
    clearAll,
  } = useAIStore();

  const { generateHydration, generateRouteText, downloadRouteText, hasRoute } =
    useAIAssistant({
      elevationPoints,
      elevationGain,
      elevationLoss,
      elevationStatus,
    });

  const [internalExpanded, setInternalExpanded] = useState(false);
  const [routeType, setRouteType] = useState<RouteType>("easy_run");
  const [pace, setPace] = useState(360);

  const canGenerateHydration = hasRoute && totalDistance >= 1000;
  const canGenerateRouteText = hasRoute && totalDistance >= 100;
  const hasHydration = hydrationSuggestions.length > 0;
  const hasRouteText = Boolean(routeText);
  const hasResult = hasHydration || hasRouteText;
  const currentRouteKey = useMemo(() => {
    const coordinates = segments[0]?.polyline.coordinates ?? [];
    const first = coordinates[0] ?? [];
    const last = coordinates[coordinates.length - 1] ?? [];

    return [
      Math.round(totalDistance),
      coordinates.length,
      first.map((value) => value.toFixed(5)).join(","),
      last.map((value) => value.toFixed(5)).join(","),
    ].join(":");
  }, [segments, totalDistance]);
  const isStale = Boolean(
    hasResult && lastRouteKey && lastRouteKey !== currentRouteKey,
  );
  const summaryText = hasHydration
    ? `${hydrationSuggestions.length} hydration point${hydrationSuggestions.length > 1 ? "s" : ""}`
    : hasRouteText
      ? "Cue sheet siap"
      : totalDistance < 1000
        ? "Hydration aktif mulai 1 km"
        : "Rekomendasi untuk rute ini";
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpanded =
    onToggle ?? (() => setInternalExpanded((value) => !value));

  if (!isExpanded) {
    return (
      <div className="border-t border-outline-variant/35 bg-[rgba(255,255,255,0.78)] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleExpanded}
            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={isExpanded}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-white shadow-[0_8px_18px_rgba(0,80,203,0.2)]">
              <AssistantIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary-container">
                AI Assistant
              </span>
              <span className="block truncate text-xs font-semibold text-on-surface-variant">
                {summaryText}
              </span>
            </span>
            <ChevronIcon className="ml-auto h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:text-primary-container" />
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
      </div>
    );
  }

  return (
    <div className="border-t border-outline-variant/35 bg-[rgba(255,255,255,0.78)] px-3 py-3">
      <div className="rounded-xl border border-outline-variant/35 bg-white p-4 shadow-[0_16px_34px_rgba(23,27,41,0.08)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-white shadow-[0_8px_18px_rgba(0,80,203,0.2)]">
            <AssistantIcon />
          </span>

          <button
            type="button"
            onClick={toggleExpanded}
            className="group min-w-0 flex-1 text-left"
            aria-expanded={isExpanded}
          >
            <span className="block truncate text-[11px] font-extrabold uppercase leading-4 tracking-[0.16em] text-primary-container">
              AI Assistant
            </span>
            <span className="block truncate text-xs font-semibold leading-5 text-on-surface-variant">
              {summaryText}
            </span>
          </button>

          {hasResult && (
            <button
              onClick={clearAll}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              type="button"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={toggleExpanded}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-container transition-colors hover:bg-surface-container-low"
            aria-label="Collapse AI Assistant"
            aria-expanded={isExpanded}
          >
            <ChevronIcon className="h-5 w-5 rotate-180" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-full bg-surface-container-low p-1">
          <button
            onClick={() => setActiveTab("hydration")}
            className={tabButtonClass(activeTab === "hydration")}
            type="button"
          >
            Hydration
          </button>
          <button
            onClick={() => setActiveTab("routetext")}
            className={tabButtonClass(activeTab === "routetext")}
            type="button"
          >
            Route Text
          </button>
        </div>

        {isStale && (
          <p className="mt-3 rounded-lg border border-tertiary-container bg-tertiary-container/25 px-3 py-2 text-[11px] font-semibold leading-4 text-on-tertiary-container">
            Rute berubah. Generate ulang untuk hasil terbaru.
          </p>
        )}

        {activeTab === "hydration" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <AssistantSelect
                label="Jenis rute"
                value={routeType}
                onChange={(value) => setRouteType(value as RouteType)}
              >
                {Object.entries(routeTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </AssistantSelect>
              <AssistantSelect
                label="Pace untuk rekomendasi hidrasi"
                value={pace}
                onChange={(value) => setPace(Number(value))}
              >
                {paceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AssistantSelect>
            </div>

            <button
              onClick={() => generateHydration(routeType, pace)}
              disabled={!canGenerateHydration || isGeneratingHydration}
              className={primaryActionClass}
              type="button"
            >
              {isGeneratingHydration ? (
                <span className="animate-pulse">Generating...</span>
              ) : totalDistance < 1000 ? (
                "Hydration Min. 1 km"
              ) : (
                "Generate Hydration"
              )}
            </button>

            {hydrationSummary && (
              <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low/70 p-3">
                <p className="text-xs font-medium leading-5 text-on-surface">
                  {hydrationSummary}
                </p>
                {hydrationSource && (
                  <span className="mt-2 inline-flex rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-primary-container">
                    {hydrationSource}
                  </span>
                )}
              </div>
            )}

            {hasHydration && (
              <div className="space-y-2">
                {hydrationSuggestions.map((point, i) => (
                  <div
                    key={`${point.label}-${i}`}
                    className="rounded-xl border border-outline-variant/30 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-extrabold text-on-surface">
                        {point.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          point.priority === "high"
                            ? "bg-error-container text-on-error-container"
                            : point.priority === "medium"
                              ? "bg-primary-container/15 text-primary-container"
                              : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {point.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">
                      KM {point.distanceKm} - {point.reason}
                    </p>
                    {point.notes && (
                      <p className="mt-1 text-[10px] italic leading-4 text-on-surface-variant">
                        {point.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hydrationWarnings.length > 0 && (
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-2.5">
                {hydrationWarnings.map((warning, i) => (
                  <p
                    key={`${warning}-${i}`}
                    className="text-[10px] leading-4 text-on-surface-variant"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "routetext" && (
          <div className="mt-4 flex flex-col gap-4">
            <AssistantSelect
              label="Pace untuk cue sheet"
              value={pace}
              onChange={(value) => setPace(Number(value))}
            >
              {paceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AssistantSelect>

            <button
              onClick={() => generateRouteText(pace)}
              disabled={!canGenerateRouteText || isGeneratingRouteText}
              className={primaryActionClass}
              type="button"
            >
              {isGeneratingRouteText ? (
                <span className="animate-pulse">Generating...</span>
              ) : totalDistance < 100 ? (
                "Cue Sheet Min. 100 m"
              ) : (
                "Generate Cue Sheet"
              )}
            </button>

            {routeText && (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low/70 p-3">
                  <p className="text-xs font-extrabold text-on-surface">
                    {routeText.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-on-surface-variant">
                    {routeText.summary}
                  </p>
                  <span className="mt-2 inline-flex rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-primary-container">
                    {routeText.source}
                  </span>
                </div>

                {routeText.steps.length > 0 && (
                  <div className="space-y-1 rounded-xl border border-outline-variant/30 bg-white p-2.5">
                    {routeText.steps.map((step, i) => (
                      <p
                        key={`${step.distanceKm}-${i}`}
                        className="text-[11px] leading-4 text-on-surface"
                      >
                        <span className="font-extrabold text-primary-container">
                          KM {step.distanceKm.toFixed(1)}
                        </span>{" "}
                        {step.text}
                      </p>
                    ))}
                  </div>
                )}

                {routeText.downloadText && (
                  <button
                    onClick={() => downloadRouteText(routeText.downloadText)}
                    className="flex h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-low px-4 text-xs font-extrabold text-on-surface shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-container"
                    type="button"
                  >
                    <DownloadIcon />
                    Download .txt
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-error-container/30 p-2 text-[11px] leading-4 text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
