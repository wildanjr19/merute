import { useMemo } from 'react';
import { calculateElevationStats } from '../utils/elevation';
import type { ElevationPoint } from '../types';

interface ElevationStatsProps {
  points: ElevationPoint[];
}

export const ElevationStats = ({ points }: ElevationStatsProps) => {
  const stats = useMemo(() => calculateElevationStats(points), [points]);

  if (points.length === 0) {
    return null;
  }

  return (
    <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-3 px-5 pb-3 pt-5 sm:w-[300px] sm:gap-x-4 sm:gap-y-4 sm:px-5 sm:py-5 lg:w-[304px] lg:pl-6 lg:pr-5">
      <StatCard
        icon="gain"
        label="Total Gain"
        value={`+${stats.gain}m`}
        valueClassName="text-secondary"
        iconClassName="bg-primary-fixed text-primary-container"
      />
      <StatCard
        icon="loss"
        label="Total Loss"
        value={`-${stats.loss}m`}
        valueClassName="text-error"
        iconClassName="bg-error-container text-error"
      />
      <StatCard
        icon="min"
        label="Min Elev"
        value={`${stats.min}m`}
        valueClassName="text-on-surface"
        iconClassName="bg-primary-fixed text-primary-container"
      />
      <StatCard
        icon="max"
        label="Max Elev"
        value={`${stats.max}m`}
        valueClassName="text-on-surface"
        iconClassName="bg-primary-fixed text-primary-container"
      />
    </div>
  );
};

interface StatCardProps {
  icon: 'gain' | 'loss' | 'min' | 'max';
  label: string;
  value: string;
  valueClassName: string;
  iconClassName: string;
}

const StatCard = ({ icon, label, value, valueClassName, iconClassName }: StatCardProps) => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconClassName}`}>
        <StatIcon icon={icon} />
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-[12px] font-semibold leading-4 tracking-normal text-on-surface">
          {label}
        </span>
        <span className={`block text-[20px] font-extrabold leading-6 tracking-normal ${valueClassName}`}>
          {value}
        </span>
      </span>
    </div>
  );
};

const StatIcon = ({ icon }: { icon: StatCardProps['icon'] }) => {
  if (icon === 'gain') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19V5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="m6.5 10.5 5.5-5.5 5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === 'loss') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="m17.5 13.5-5.5 5.5-5.5-5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3.5 17 4.4-7 3.2 5.1 2.3-3.5 4 5.4H3.5Z" fill="currentColor" opacity="0.9" />
      <path d="m14.7 10.3 2.2-3.6 3.6 5.8h-3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      {icon === 'max' && <path d="M17 4.5v5M14.5 7H19.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}
    </svg>
  );
};
