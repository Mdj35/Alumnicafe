import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// Critical keys that trigger the fullscreen overlay
const CRITICAL_KEYS = new Set(['auth', 'checkout', 'pos-init', 'admin-init']);

interface LoadingContextValue {
  /** True if ANY loading key is active */
  isLoading: boolean;
  /** True if a CRITICAL loading key (auth, checkout) is active */
  isCritical: boolean;
  /** Set of all active loading keys */
  activeKeys: ReadonlySet<string>;
  /** Mark a key as loading */
  startLoading: (key: string) => void;
  /** Mark a key as done */
  stopLoading: (key: string) => void;
  /**
   * Wraps an async function: calls startLoading before and stopLoading after.
   * Safely handles errors — always stops loading even on throw.
   */
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [activeKeys, setActiveKeys] = useState<ReadonlySet<string>>(new Set());
  // Use a ref to keep a mutable copy for safe reads inside callbacks
  const keysRef = useRef<Set<string>>(new Set());

  const startLoading = useCallback((key: string) => {
    keysRef.current.add(key);
    setActiveKeys(new Set(keysRef.current));
  }, []);

  const stopLoading = useCallback((key: string) => {
    keysRef.current.delete(key);
    setActiveKeys(new Set(keysRef.current));
  }, []);

  const withLoading = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
      startLoading(key);
      try {
        return await fn();
      } finally {
        stopLoading(key);
      }
    },
    [startLoading, stopLoading]
  );

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: activeKeys.size > 0,
      isCritical: [...activeKeys].some((k) => CRITICAL_KEYS.has(k)),
      activeKeys,
      startLoading,
      stopLoading,
      withLoading,
    }),
    [activeKeys, startLoading, stopLoading, withLoading]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

/** Access the global loading context. Must be used inside <LoadingProvider>. */
export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used inside <LoadingProvider>');
  return ctx;
}
