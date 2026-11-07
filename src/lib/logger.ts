type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: LogArgs) => {
    if (__DEV__) console.warn(...args);
  },
  // Caught operation failures already have UI feedback, a fallback, or retry.
  // Keep their diagnostics without console.error/warn opening native LogBox.
  handledError: (...args: LogArgs) => {
    if (__DEV__) console.log('[handled]', ...args);
  },
  error: (...args: LogArgs) => {
    if (__DEV__) console.error(...args);
  },
  runtime: (...args: LogArgs) => {
    console.log(...args);
  },
};
