/**
 * useRenderCount — dev-only render instrumentation hook.
 *
 * Usage:
 *   useRenderCount('MyComponent');
 *
 * Logs to console every time the component re-renders (dev builds only).
 * Automatically a no-op in production — zero overhead.
 *
 * Example — detect thrashing:
 *   If you see "MyComponent render #12" in quick succession during a
 *   stream tick, you know a dep array or selector is too broad.
 */
import { useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function useRenderCount(componentName: string): void {
  if (!__DEV__) return; // tree-shaken in prod

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const countRef = useRef(0);
  countRef.current += 1;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    logger.debug(`[render] ${componentName} #${countRef.current}`);
  });
}
