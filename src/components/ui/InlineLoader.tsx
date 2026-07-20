import React, { memo } from 'react';

interface InlineLoaderProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Tailwind color class for the spinner (default: text-hcdc-blue) */
  colorClass?: string;
  /** Accessible label */
  label?: string;
  className?: string;
}

const sizeMap = {
  xs: '0.875rem',
  sm: '1.125rem',
  md: '1.5rem',
};

/**
 * InlineLoader — small inline spinner for search bars, inline status, etc.
 *
 * @example
 * <InlineLoader size="sm" />
 */
const InlineLoader = memo(function InlineLoader({
  size = 'sm',
  colorClass = 'text-hcdc-blue',
  label = 'Loading…',
  className = '',
}: InlineLoaderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${colorClass} ${className}`}
      style={{ width: sizeMap[size], height: sizeMap[size] }}
    >
      <span
        className="loading-spinner"
        aria-hidden="true"
        style={{ width: sizeMap[size], height: sizeMap[size] }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
});

export default InlineLoader;
