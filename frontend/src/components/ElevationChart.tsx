import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
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
      <div className="glass-panel-strong rounded-lg px-3 py-2 shadow-float">
        <p className="text-body-sm font-semibold text-on-surface">
          {data.distance.toFixed(2)} km
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Elevasi: {data.elevation.toFixed(0)} m
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
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0050cb" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#0050cb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => `${value.toFixed(1)} km`}
            axisLine={false}
            tickLine={false}
            minTickGap={38}
            stroke="#737685"
            tick={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans', fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#0050cb"
            strokeWidth={2.25}
            fill="url(#elevationGradient)"
            activeDot={{ r: 5, fill: '#0050cb', stroke: '#fff', strokeWidth: 3 }}
            dot={false}
            isAnimationActive
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
