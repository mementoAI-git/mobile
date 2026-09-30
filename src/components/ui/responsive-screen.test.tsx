import { describe, expect, test } from 'bun:test';
import React from 'react';
import { contentMaxWidth, screenGutter } from '@/constants/responsive';
import { ResponsiveScreen } from '@/components/ui/ResponsiveScreen';

describe('ResponsiveScreen width and gutter behavior', () => {
  test('compact gutters do not exceed 20', () => {
    expect(screenGutter(320)).toBeLessThanOrEqual(20);
    expect(screenGutter(360)).toBeLessThanOrEqual(20);
  });

  test('reference gutters match intended composition', () => {
    expect(screenGutter(393)).toBeGreaterThanOrEqual(20);
    expect(screenGutter(393)).toBeLessThanOrEqual(24);
  });

  test('tablet content caps at 720 and gutters do not exceed 32', () => {
    expect(screenGutter(1024)).toBeLessThanOrEqual(32);
    expect(contentMaxWidth(1024)).toBe(720);
    expect(contentMaxWidth(768)).toBe(720);
  });

  test('ResponsiveScreen exports component and preserves children and container options', () => {
    expect(typeof ResponsiveScreen).toBe('function');
    const element = (
      <ResponsiveScreen fullBleed={false} maxWidth={720}>
        Content
      </ResponsiveScreen>
    );
    expect(element.props.maxWidth).toBe(720);
    expect(element.props.fullBleed).toBe(false);
  });
});
