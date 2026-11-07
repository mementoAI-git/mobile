import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { logger } from './logger';

const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
const originalDev = runtime.__DEV__;
let output: ReturnType<typeof spyOn>;
let errors: ReturnType<typeof spyOn>;
let warnings: ReturnType<typeof spyOn>;
beforeEach(() => {
  runtime.__DEV__ = true;
  output = spyOn(console, 'log').mockImplementation(() => {});
  errors = spyOn(console, 'error').mockImplementation(() => {});
  warnings = spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  output.mockRestore(); errors.mockRestore(); warnings.mockRestore();
  if (originalDev === undefined) delete runtime.__DEV__; else runtime.__DEV__ = originalDev;
});

test('handled operation failures retain diagnostics without a second LogBox notification', () => {
  const error = new Error('Network unavailable');
  logger.handledError('Upload failed', error);
  expect(output).toHaveBeenCalledWith('[handled]', 'Upload failed', error);
  expect(errors).not.toHaveBeenCalled();
  expect(warnings).not.toHaveBeenCalled();
});
test('unexpected errors still reach the development error reporter', () => {
  const error = new Error('Unexpected render failure');
  logger.error('Render failed', error);
  expect(errors).toHaveBeenCalledWith('Render failed', error);
});
test('handled diagnostics are quiet in production', () => {
  runtime.__DEV__ = false;
  logger.handledError('Upload failed', new Error('Offline'));
  expect(output).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});
