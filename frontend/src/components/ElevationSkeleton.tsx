export const ElevationSkeleton = () => {
  const bars = [32, 38, 35, 44, 48, 42, 46, 41, 52, 62, 56, 45, 39, 47, 44, 42, 43, 41];

  return (
    <div className="flex h-full animate-pulse flex-col sm:flex-row">
      <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-3 px-5 pb-3 pt-5 sm:w-[300px] sm:gap-x-4 sm:gap-y-4 sm:px-5 sm:py-5 lg:w-[304px] lg:pl-6 lg:pr-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-surface-container-high"></div>
            <div className="min-w-0 space-y-2">
              <div className="h-3 w-16 rounded bg-surface-container-high"></div>
              <div className="h-5 w-14 rounded bg-surface-container-high"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-end justify-between gap-1 px-5 pb-4 pt-0 sm:border-l sm:border-outline-variant/45 sm:py-5 sm:pl-5 sm:pr-6 lg:pl-6">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-full bg-primary-fixed"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};
