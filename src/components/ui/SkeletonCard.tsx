import React, { memo } from 'react';

interface SkeletonCardProps {
  /** Number of cards to render (default: 4) */
  count?: number;
  /** Card style variant */
  variant?: 'stat' | 'menu' | 'list';
  /** Optional extra Tailwind classes for the grid wrapper */
  className?: string;
}

/**
 * SkeletonCard — animated placeholder cards for dashboard stats, menu grids, or list items.
 *
 * - `stat` (default): icon + large number + label — mirrors dashboard KPI cards
 * - `menu`: image + name + price — mirrors menu item cards
 * - `list`: icon + two text lines — mirrors list entries
 */
const SkeletonCard = memo(function SkeletonCard({
  count = 4,
  variant = 'stat',
  className = '',
}: SkeletonCardProps) {
  if (variant === 'stat') {
    return (
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}
        aria-busy="true"
        aria-label="Loading statistics"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4"
          >
            {/* Icon placeholder */}
            <div className="skeleton w-12 h-12 rounded-2xl" />
            {/* Value placeholder */}
            <div className="skeleton h-8 w-3/4 rounded-lg" />
            {/* Label placeholder */}
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 ${className}`}
        aria-busy="true"
        aria-label="Loading menu items"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
          >
            {/* Image placeholder */}
            <div className="skeleton h-28 w-full rounded-none" />
            <div className="p-3 flex flex-col gap-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // list variant
  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      aria-busy="true"
      aria-label="Loading list"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4"
        >
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
});

export default SkeletonCard;
