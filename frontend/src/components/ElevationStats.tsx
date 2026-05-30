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
    <div className="grid grid-cols-2 gap-4 px-5 pt-5 sm:grid-cols-4 lg:px-7">
      <StatCard label="Total Gain" value={`+${stats.gain}m`} color="text-secondary" />
      <StatCard label="Total Loss" value={`-${stats.loss}m`} color="text-error" />
      <StatCard label="Min Alt" value={`${stats.min}m`} color="text-on-surface" />
      <StatCard label="Max Alt" value={`${stats.max}m`} color="text-on-surface" />
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

const StatCard = ({ label, value, color }: StatCardProps) => {
  return (
    <div className="min-w-0">
      <span className="mb-1 block truncate text-[12px] font-bold uppercase tracking-normal text-on-surface">
        {label}
      </span>
      <span className={`block text-[24px] font-extrabold leading-7 tracking-normal ${color}`}>
        {value}
      </span>
    </div>
  );
};
