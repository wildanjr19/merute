import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ElevationPoint } from '../types';

interface ElevationChartProps {
  points: ElevationPoint[];
}

interface ChartPoint {
  distance: number;
  elevation: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(23,27,41,0.16)]">
        <p className="text-[12px] font-semibold leading-5 text-on-surface">
          Current Elev: <span className="font-extrabold">{data.elevation.toFixed(0)}m</span>
        </p>
        <p className="text-[12px] font-semibold leading-5 text-on-surface">
          Distance: <span className="font-extrabold">{data.distance.toFixed(1)}km</span>
        </p>
      </div>
    );
  }
  return null;
};

export const ElevationChart = ({ points }: ElevationChartProps) => {
  // Transform data for Recharts: distance in km, elevation in m
  const chartData = useMemo(() => {
    return points.map((point) => ({
      distance: point.distance / 1000, // convert to km
      elevation: point.elevation,
    }));
  }, [points]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={64}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 6, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f61a8" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#0f61a8" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance"
            type="number"
            domain={['dataMin', 'dataMax']}
            hide
          />
          <YAxis
            dataKey="elevation"
            domain={[
              (dataMin: number) => Math.floor(dataMin - 4),
              (dataMax: number) => Math.ceil(dataMax + 4),
            ]}
            hide
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#8aa9c8', strokeWidth: 1.5, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#174f83"
            strokeWidth={2.4}
            fill="url(#elevationGradient)"
            activeDot={{ r: 4.5, fill: '#eaf3fb', stroke: '#174f83', strokeWidth: 2.2 }}
            dot={false}
            isAnimationActive
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
