import { type ReactNode, useMemo, useState } from "react";
import {
  usePlannerStore,
  type PlannerWindowPreset,
} from "../stores/plannerStore";
import { useRunPlanner } from "../hooks/useRunPlanner";
import type { PlannerPriority, PlannerRecommendation } from "../types";

interface SmartPlannerPanelProps {
  elevationGain: number;
  elevationLoss: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const windowOptions: Array<{
  value: PlannerWindowPreset;
  label: string;
  range: string;
}> = [
  { value: "morning", label: "Pagi", range: "5:00 AM - 9:00 AM" },
  { value: "afternoon", label: "Sore", range: "4:00 PM - 8:00 PM" },
  {
    value: "both",
    label: "Pagi & Sore",
    range: "5:00 AM - 9:00 AM, 4:00 PM - 8:00 PM",
  },
  { value: "custom", label: "Custom", range: "Pilih jam sendiri" },
];

const priorityOptions: Array<{
  value: PlannerPriority;
  label: string;
  hint: string;
  icon: "thermo" | "uv" | "rain";
}> = [
  {
    value: "balanced",
    label: "Seimbang",
    hint: "Suhu, hujan, UV",
    icon: "thermo",
  },
  {
    value: "avoid_heat",
    label: "Hindari panas",
    hint: "Suhu dan UV",
    icon: "uv",
  },
  {
    value: "avoid_rain",
    label: "Hindari hujan",
    hint: "Peluang hujan",
    icon: "rain",
  },
];

const scoreStyle = (score: number) => {
  if (score >= 80) return "bg-secondary-container text-on-secondary-container";
  if (score >= 65) return "bg-primary-container/15 text-primary-container";
  if (score >= 50) return "bg-tertiary-container text-on-tertiary-container";
  return "bg-error-container text-on-error-container";
};

const riskStyle = (type: "risk" | "reason") =>
  type === "risk"
    ? "border-error-container bg-error-container/35 text-on-error-container"
    : "border-secondary-container bg-secondary-container/35 text-on-secondary-container";

const formatDisplayDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const formatWeather = (recommendation: PlannerRecommendation) => {
  const weather = recommendation.weather;
  return [
    `${weather.apparentTemperature.toFixed(1)} C terasa`,
    `${weather.rainProbability.toFixed(0)}% hujan`,
    `UV ${weather.uvIndex.toFixed(1)}`,
    `${weather.windSpeed.toFixed(0)} km/j angin`,
  ];
};

const formatTime = (value: string) => {
  const [hourValue, minute = "00"] = value.split(":");
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return value;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
};

const PlannerIcon = ({
  type,
}: {
  type: "calendar" | "clock" | "thermo" | "uv" | "rain";
}) => {
  if (type === "calendar") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 3v3M17 3v3M4.5 9.5h15"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <rect
          x="4.5"
          y="5.5"
          width="15"
          height="15"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.9"
        />
      </svg>
    );
  }

  if (type === "clock") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        <path
          d="M12 7.5v5l3.2 2"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "thermo") {
    return (
      <svg
        className="h-7 w-7"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 28.2V9a5 5 0 0 1 10 0v19.2a9 9 0 1 1-10 0Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M25 12v20"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M35 12h5M35 18h4M35 24h5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "uv") {
    return (
      <svg
        className="h-7 w-7"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          d="M24 6v4M24 38v4M6 24h4M38 24h4M11.3 11.3l2.8 2.8M33.9 33.9l2.8 2.8M36.7 11.3l-2.8 2.8M14.1 33.9l-2.8 2.8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          className="fill-current text-[10px] font-extrabold"
        >
          UV
        </text>
      </svg>
    );
  }

  return (
    <svg className="h-7 w-7" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M14 30a8 8 0 0 1 3.1-15.4A10.5 10.5 0 0 1 37 20.5a6.5 6.5 0 0 1-2 12.7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 34c3.5-7 16.5-7 20 0M24 27v15M16 34c0 4 3 7 8 7s8-3 8-7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const PlannerField = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon: "calendar" | "clock";
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-[13px] font-extrabold leading-5 tracking-normal text-on-surface">
      {label}
    </span>
    <span className="relative flex min-h-[44px] items-center gap-2.5 rounded-lg border border-outline-variant/80 bg-white px-3 text-on-surface shadow-[inset_0_0_0_1px_rgba(255,255,255,0.62)] transition-colors focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/12">
      <span className="shrink-0 text-outline">
        <PlannerIcon type={icon} />
      </span>
      {children}
    </span>
  </label>
);

export function SmartPlannerPanel({
  elevationGain,
  elevationLoss,
  isExpanded: controlledExpanded,
  onToggle,
}: SmartPlannerPanelProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const {
    date,
    windowPreset,
    customStart,
    customEnd,
    priority,
    setDate,
    setWindowPreset,
    setCustomStart,
    setCustomEnd,
    setPriority,
    clearResult,
  } = usePlannerStore();

  const {
    analyze,
    hasRoute,
    unavailableMessage,
    result,
    error,
    isAnalyzing,
    isStale,
  } = useRunPlanner({ elevationGain, elevationLoss });

  const best = result?.recommendations[0];
  const summaryText = !hasRoute
    ? "Aktif setelah rute siap"
    : best
      ? `${best.startTime} - skor ${best.score}`
      : "Siap dianalisis";
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpanded =
    onToggle ?? (() => setInternalExpanded((value) => !value));
  const selectedWindow = useMemo(
    () =>
      windowOptions.find((option) => option.value === windowPreset) ??
      windowOptions[0],
    [windowPreset],
  );
  const timeRangeLabel =
    windowPreset === "custom"
      ? `${formatTime(customStart)} - ${formatTime(customEnd)}`
      : selectedWindow.range;

  return (
    <div className="border-t border-outline-variant/35 bg-[rgba(255,255,255,0.78)] px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleExpanded}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={isExpanded}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-white shadow-[0_8px_18px_rgba(0,108,73,0.18)]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3v4M12 17v4M4.2 6.2l2.8 2.8M17 17l2.8 2.8M3 12h4M17 12h4M4.2 17.8 7 15M17 7l2.8-2.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-secondary">
              Smart Run Planner
            </span>
            <span className="block truncate text-xs font-semibold text-on-surface-variant">
              {summaryText}
            </span>
          </span>
          <svg
            className={`ml-auto h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:text-secondary ${isExpanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {result && (
          <button
            onClick={clearResult}
            className="rounded-full px-2 py-1 text-xs font-bold text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
            type="button"
          >
            Clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2.5 rounded-lg border border-outline-variant/30 bg-white p-3 shadow-[0_10px_24px_rgba(23,27,41,0.05)]">
          {!hasRoute ? (
            <div className="rounded-lg border border-dashed border-outline-variant/65 bg-surface-container-low/70 px-3 py-3">
              <p className="text-[13px] font-extrabold text-on-surface">
                Smart Planner belum aktif
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-on-surface-variant">
                {unavailableMessage}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <PlannerField label="Date" icon="calendar">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-on-surface">
                  {formatDisplayDate(date)}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.currentTarget.showPicker?.();
                    }
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Tanggal lari"
                />
              </PlannerField>

              <PlannerField label="Time Range" icon="clock">
                <span className="pointer-events-none min-w-0 flex-1 truncate text-[14px] font-semibold leading-5 text-on-surface">
                  {timeRangeLabel}
                </span>
                <select
                  value={windowPreset}
                  onChange={(event) =>
                    setWindowPreset(event.target.value as PlannerWindowPreset)
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Rentang waktu"
                >
                  {windowOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.range}
                    </option>
                  ))}
                </select>
              </PlannerField>

              {windowPreset === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="rounded-lg border border-outline-variant/70 bg-white px-2.5 py-1.5">
                    <span className="block text-xs font-bold text-on-surface-variant">
                      Mulai
                    </span>
                    <input
                      type="time"
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      className="mt-0.5 h-7 w-full bg-transparent text-[13px] font-extrabold text-on-surface outline-none"
                      aria-label="Custom window mulai"
                    />
                  </label>
                  <label className="rounded-lg border border-outline-variant/70 bg-white px-2.5 py-1.5">
                    <span className="block text-xs font-bold text-on-surface-variant">
                      Selesai
                    </span>
                    <input
                      type="time"
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      className="mt-0.5 h-7 w-full bg-transparent text-[13px] font-extrabold text-on-surface outline-none"
                      aria-label="Custom window selesai"
                    />
                  </label>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[13px] font-extrabold leading-5 tracking-normal text-on-surface">
                  Priority
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={`flex min-h-[58px] items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/15 ${
                        priority === option.value
                          ? "border-secondary bg-[#eefaf3] text-on-surface shadow-[0_12px_24px_rgba(0,108,73,0.10)]"
                          : "border-outline-variant/70 bg-white text-on-surface hover:border-secondary/55"
                      }`}
                      aria-pressed={priority === option.value}
                    >
                      <span
                        className={`shrink-0 ${priority === option.value ? "text-secondary" : "text-outline"}`}
                      >
                        <PlannerIcon type={option.icon} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-extrabold leading-5">
                          {option.label}
                        </span>
                        <span className="block text-[11px] font-semibold leading-4 text-on-surface-variant">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void analyze()}
                disabled={isAnalyzing}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-secondary px-4 text-[14px] font-extrabold text-white shadow-[0_10px_20px_rgba(0,108,73,0.18)] transition-all hover:-translate-y-0.5 hover:bg-on-secondary-container focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25 disabled:translate-y-0 disabled:opacity-55"
              >
                {isAnalyzing ? (
                  <span className="animate-pulse">Analyzing...</span>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          )}

          {isStale && (
            <p className="mt-3 rounded-lg border border-tertiary-container bg-tertiary-container/25 px-3 py-2 text-[11px] font-semibold leading-4 text-on-tertiary-container">
              Rute atau preferensi berubah. Jalankan Analyze lagi untuk hasil
              terbaru.
            </p>
          )}

          {result && (
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-outline-variant/35 bg-surface-container-low/70 p-2.5">
                <p className="text-xs font-semibold leading-5 text-on-surface">
                  {result.summary}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary-container/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-primary-container">
                    {result.source}
                  </span>
                  <span className="rounded-full bg-secondary-container/45 px-2 py-0.5 text-[10px] font-extrabold text-on-secondary-container">
                    {result.provider.name}
                  </span>
                </div>
              </div>

              {result.recommendations.map((recommendation) => (
                <div
                  key={`${recommendation.startTime}-${recommendation.label}`}
                  className={`rounded-lg border p-2.5 ${
                    recommendation.label === "best"
                      ? "border-secondary-container bg-white"
                      : "border-outline-variant/35 bg-white/82"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-surface-variant">
                        {recommendation.label === "best"
                          ? "Terbaik"
                          : "Alternatif"}
                      </p>
                      <p className="mt-0.5 text-base font-extrabold leading-5 text-on-surface">
                        {recommendation.startTime}
                        <span className="ml-1 text-xs font-bold text-on-surface-variant">
                          - {recommendation.finishTime}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${scoreStyle(recommendation.score)}`}
                    >
                      {recommendation.score}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {formatWeather(recommendation).map((item) => (
                      <span
                        key={item}
                        className="truncate rounded-md bg-surface-container-low px-2 py-1 text-[10px] font-bold text-on-surface-variant"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {(recommendation.reasons.length > 0 ||
                    recommendation.risks.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recommendation.reasons.map((reason) => (
                        <span
                          key={reason}
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold leading-3 ${riskStyle("reason")}`}
                        >
                          {reason}
                        </span>
                      ))}
                      {recommendation.risks.map((risk) => (
                        <span
                          key={risk}
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold leading-3 ${riskStyle("risk")}`}
                        >
                          {risk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {result.avoidWindows.length > 0 && (
                <div className="rounded-lg border border-error-container bg-error-container/20 p-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-on-error-container">
                    Hindari
                  </p>
                  {result.avoidWindows.map((window) => (
                    <p
                      key={`${window.start}-${window.end}`}
                      className="mt-1 text-[11px] font-semibold leading-4 text-on-error-container"
                    >
                      {window.start}-{window.end}: {window.reason}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-[10px] leading-4 text-on-surface-variant">
                {result.provider.attribution}. Forecast bersifat estimasi.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-error-container/30 p-2 text-[11px] leading-4 text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
