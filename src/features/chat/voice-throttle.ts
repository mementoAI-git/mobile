export type ThrottleScheduler = {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
};

const defaultScheduler: ThrottleScheduler = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (timer) =>
    globalThis.clearTimeout(timer as ReturnType<typeof globalThis.setTimeout>),
};

export type ThrottledSetter<T> = {
  set(value: T): void;
  flush(): void;
  cancel(): void;
};

/**
 * Applies the first value immediately, then at most one value per interval,
 * always the latest. Keeps per-word transcript updates from re-rendering the
 * call screen dozens of times a second on the JS thread that also carries audio.
 */
export function createThrottledSetter<T>(
  apply: (value: T) => void,
  intervalMs: number,
  scheduler: ThrottleScheduler = defaultScheduler,
): ThrottledSetter<T> {
  let lastAppliedAt = Number.NEGATIVE_INFINITY;
  let pending: { value: T } | undefined;
  let timer: unknown;

  const clearTimer = () => {
    if (timer !== undefined) scheduler.clearTimeout(timer);
    timer = undefined;
  };

  const run = () => {
    timer = undefined;
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    lastAppliedAt = scheduler.now();
    apply(value);
  };

  return {
    set(value: T) {
      pending = { value };
      const waitMs = lastAppliedAt + intervalMs - scheduler.now();
      if (waitMs <= 0) {
        clearTimer();
        run();
      } else if (timer === undefined) {
        timer = scheduler.setTimeout(run, waitMs);
      }
    },
    flush() {
      clearTimer();
      run();
    },
    cancel() {
      clearTimer();
      pending = undefined;
    },
  };
}