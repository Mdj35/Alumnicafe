import React, { memo, forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonLoaderProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the button is in a loading/pending state */
  loading: boolean;
  /** Content shown when NOT loading */
  children: React.ReactNode;
  /** Content shown INSTEAD of children while loading (defaults to spinner + "Please wait…") */
  loadingLabel?: string;
  /** Extra Tailwind classes */
  className?: string;
}

/**
 * ButtonLoader — wraps any button to add loading state behavior:
 * - Disabled immediately on click
 * - Replaces content with a spinner while `loading` is true
 * - Prevents double-click
 * - Restores original content when loading ends
 *
 * @example
 * <ButtonLoader loading={isSaving} onClick={handleSave} className="btn-primary">
 *   Save Item
 * </ButtonLoader>
 */
const ButtonLoader = memo(
  forwardRef<HTMLButtonElement, ButtonLoaderProps>(function ButtonLoader(
    { loading, children, loadingLabel = 'Please wait…', className = '', disabled, ...rest },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={`relative inline-flex items-center justify-center gap-2 transition-opacity ${
          loading ? 'opacity-75 cursor-not-allowed' : ''
        } ${className}`}
        aria-busy={loading}
        aria-label={loading ? loadingLabel : undefined}
        {...rest}
      >
        {loading ? (
          <>
            <span className="loading-spinner" aria-hidden="true" />
            <span className="text-sm">{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  })
);

export default ButtonLoader;
