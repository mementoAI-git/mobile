type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs) => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: LogArgs) => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    if (__DEV__) console.error(...args);
  },
};

