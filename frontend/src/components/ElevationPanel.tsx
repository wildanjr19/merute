import { ElevationChart } from './ElevationChart';
import { ElevationStats } from './ElevationStats';
import { ElevationSkeleton } from './ElevationSkeleton';
import { useElevation } from '../hooks/useElevation';

export const ElevationPanel = () => {
  const { elevationData, isLoading, error } = useElevation();

  // Don't render panel if no data and not loading
  if (!elevationData && !isLoading && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 flex h-[214px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/[0.92] shadow-[0_22px_54px_rgba(22,34,54,0.18)] backdrop-blur-[22px] sm:h-[174px] lg:bottom-7 lg:left-[360px] lg:right-0 lg:mx-auto lg:h-[132px] lg:w-[min(720px,calc(100vw-420px))]">
      {isLoading && <ElevationSkeleton />}

      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      {elevationData && !isLoading && (
        <div className="flex h-full min-h-0 flex-col sm:flex-row">
          <ElevationStats points={elevationData.points} />
          <div className="min-h-0 flex-1 px-5 pb-4 pt-0 sm:border-l sm:border-outline-variant/45 sm:py-5 sm:pl-5 sm:pr-6 lg:pl-6">
            <ElevationChart points={elevationData.points} />
          </div>
        </div>
      )}
    </div>
  );
};
