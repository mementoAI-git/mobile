import { describe, expect, test } from 'bun:test';

import { contentFitFor } from './image-fit';

describe('contentFitFor', () => {
  test('maps React Native resize modes to expo-image content fit', () => {
    expect(contentFitFor('cover')).toBe('cover');
    expect(contentFitFor('contain')).toBe('contain');
    expect(contentFitFor('stretch')).toBe('fill');
    expect(contentFitFor('center')).toBe('none');
    expect(contentFitFor(undefined)).toBe('cover');
  });
});
