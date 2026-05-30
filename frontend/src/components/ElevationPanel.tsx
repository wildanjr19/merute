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
    <div className="glass-panel-strong fixed bottom-4 left-4 right-4 z-30 flex h-[220px] flex-col overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(23,27,41,0.16)] lg:bottom-8 lg:left-[392px] lg:right-10 lg:h-[218px]">
      {isLoading && <ElevationSkeleton />}

      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      {elevationData && !isLoading && (
        <>
          <ElevationStats points={elevationData.points} />
          <div className="min-h-0 flex-1 px-5 pb-3 pt-1 lg:px-7">
            <ElevationChart points={elevationData.points} />
          </div>
        </>
      )}
    </div>
  );
};
