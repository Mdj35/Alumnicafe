import React, { memo } from 'react';

interface SkeletonChartProps {
  /** Height in pixels — should match the actual chart's ResponsiveContainer height (default: 288) */
  height?: number;
  /** Optional extra Tailwind classes */
  className?: string;
  /** Show legend skeleton below chart area */
  showLegend?: boolean;
}

/**
 * SkeletonChart — animated placeholder matching recharts chart dimensions.
 * Prevents layout shift while chart data is loading.
 *
 * @example
 * {isLoading ? <SkeletonChart height={288} /> : <AreaChart data={data} />}
 */
const SkeletonChart = memo(function SkeletonChart({
  height = 288,
  className = '',
  showLegend = true,
}: SkeletonChartProps) {
  return (
    <div
      className={`w-full flex flex-col gap-3 ${className}`}
      aria-busy="true"
      aria-label="Loading chart"
    >
      {/* Y-axis + chart area */}
      <div className="flex gap-2 w-full" style={{ height }}>
        {/* Y-axis ticks */}
        <div className="flex flex-col justify-between py-2 w-8 shrink-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-2 w-8 rounded" />
          ))}
        </div>

        {/* Chart body */}
        <div className="flex-1 flex flex-col justify-end gap-1 relative overflow-hidden rounded-xl">
          {/* Shimmer overlay */}
          <div className="skeleton absolute inset-0 rounded-xl" />

          {/* Grid lines (decorative, visible under shimmer) */}
          <div className="absolute inset-0 flex flex-col justify-between py-2 px-3 pointer-events-none">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-t border-gray-200/50 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* X-axis ticks */}
      <div className="flex justify-between pl-10 pr-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="skeleton h-2 w-10 rounded" />
        ))}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-6 pl-10 mt-1">
          <div className="flex items-center gap-2">
            <div className="skeleton w-8 h-3 rounded-full" />
            <div className="skeleton w-20 h-3 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton w-8 h-3 rounded-full" />
            <div className="skeleton w-20 h-3 rounded" />
          </div>
        </div>
      )}
    </div>
  );
});

export default SkeletonChart;
