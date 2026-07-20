import React, { memo } from 'react';
import ReactDOM from 'react-dom';
import { useLoading } from '../../context/LoadingContext';

/**
 * GlobalLoader — renders a fullscreen blurred overlay with an animated spinner.
 * Only activates when a "critical" loading key is active (auth, checkout, pos-init, admin-init).
 * Rendered via React Portal so it always sits above all other content.
 */
const GlobalLoader = memo(function GlobalLoader() {
  const { isCritical } = useLoading();

  if (!isCritical) return null;

  return ReactDOM.createPortal(
    <div
      className="loading-overlay"
      role="status"
      aria-live="assertive"
      aria-label="Loading, please wait…"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Brand ring + logo */}
        <div className="relative w-20 h-20">
          {/* Outer spinning ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#1A3A6B',
              borderRightColor: '#1A3A6B33',
              animation: 'spin-cw 0.9s linear infinite',
            }}
          />
          {/* Inner spinning ring (reverse, slower) */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent"
            style={{
              borderBottomColor: '#E8A020',
              borderLeftColor: '#E8A02033',
              animation: 'spin-cw 1.4s linear infinite reverse',
            }}
          />
          {/* Center logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl leading-none select-none">🦅</span>
          </div>
        </div>

        {/* Label */}
        <div className="text-center">
          <p className="text-white font-bold text-sm tracking-wide drop-shadow">
            AlumniCafe
          </p>
          <p className="text-white/70 text-xs mt-0.5 drop-shadow">
            Please wait…
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default GlobalLoader;
