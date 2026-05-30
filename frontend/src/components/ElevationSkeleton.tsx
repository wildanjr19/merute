export const ElevationSkeleton = () => {
  const bars = [46, 54, 42, 58, 64, 48, 52, 44, 61, 70, 57, 45, 50, 66, 74, 55, 47, 63, 69, 51];

  return (
    <div className="flex h-full flex-col animate-pulse">
      <div className="grid grid-cols-2 gap-4 px-5 pt-5 sm:grid-cols-4 lg:px-7">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded bg-surface-container-high"></div>
            <div className="h-7 w-16 rounded bg-surface-container-high"></div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-end justify-between gap-1 px-5 pb-4 pt-3 lg:px-7">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary-fixed"
            style={{ height: `${height}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};
