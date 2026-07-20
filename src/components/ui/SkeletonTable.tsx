import React, { memo } from 'react';

interface SkeletonTableProps {
  /** Number of placeholder body rows to render (default: 10) */
  rows?: number;
  /** Number of columns (default: 5) */
  cols?: number;
  /** Optional extra Tailwind classes */
  className?: string;
}

/**
 * SkeletonTable — renders animated placeholder rows that match a table layout.
 * Use when loading tabular data to prevent layout shift.
 *
 * @example
 * {isLoading ? <SkeletonTable rows={10} cols={6} /> : <MyTable data={data} />}
 */
const SkeletonTable = memo(function SkeletonTable({
  rows = 10,
  cols = 5,
  className = '',
}: SkeletonTableProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
      aria-busy="true"
      aria-label="Loading table data"
    >
      {/* Header skeleton */}
      <div className="bg-gray-50 px-4 py-3 flex gap-4 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-3 rounded"
            style={{
              flex: i === 0 ? '2' : '1',
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Body rows */}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="px-4 py-3.5 flex gap-4 items-center"
            style={{ opacity: 1 - rowIdx * 0.06 }}
          >
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="skeleton h-4 rounded"
                style={{ flex: colIdx === 0 ? '2' : '1' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default SkeletonTable;
