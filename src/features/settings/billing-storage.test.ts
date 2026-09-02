import { describe, expect, test } from 'bun:test';
import { getStoragePresentation } from './billing-storage';

describe('mobile billing storage presentation', () => {
  test('uses server quota metadata when available', () => {
    expect(getStoragePresentation({
      storage_used_bytes: 100,
      storage_reserved_bytes: 20,
      storage_limit_bytes: 200,
      remaining_bytes: 80,
      percent_used: 60,
      over_limit: false,
    }, false)).toMatchObject({
      used: 100,
      reserved: 20,
      limit: 200,
      remaining: 80,
      percent: 60,
      warning: null,
    });
  });

  test('uses compatible plan limits for old API responses', () => {
    expect(getStoragePresentation({ storage_used_bytes: 0 }, false).limit)
      .toBe(200 * 1024 * 1024);
    expect(getStoragePresentation({ storage_used_bytes: 0 }, true).limit)
      .toBe(10 * 1024 * 1024 * 1024);
  });

  test('returns plan-appropriate full-storage warnings', () => {
    expect(getStoragePresentation({ over_limit: true }, false).warning)
      .toBe('Storage is full. Remove some files or upgrade before uploading more.');
    expect(getStoragePresentation({ over_limit: true }, true).warning)
      .toBe('Storage is full. Remove some files or contact support before uploading more.');
    expect(getStoragePresentation({ remaining_bytes: 0, percent_used: 100 }, false).warning)
      .toBe('Storage is full. Remove some files or upgrade before uploading more.');
  });
});
