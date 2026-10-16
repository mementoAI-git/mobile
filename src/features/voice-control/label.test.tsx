import { describe, expect, test } from 'bun:test';
import React from 'react';

import { voiceLabelFor } from './label';

const Text = (props: { children?: React.ReactNode }) => props.children as never;
const View = (props: { children?: React.ReactNode }) => props.children as never;
const Icon = (_props: { name: string }) => null;

describe('voiceLabelFor', () => {
  test('prefers an explicit voice label, then the accessibility label', () => {
    expect(voiceLabelFor('Open menu', 'Menu', 'ignored')).toBe('Open menu');
    expect(voiceLabelFor(undefined, 'Close', <Text>x</Text>)).toBe('Close');
  });

  test('can be switched off', () => {
    expect(voiceLabelFor(false, 'Close', 'Close')).toBeUndefined();
  });

  test('reads the visible text inside nested elements', () => {
    const children = (
      <View>
        <Icon name="user" />
        <View>
          <Text>Personal</Text>
          <Text>information</Text>
        </View>
      </View>
    );
    expect(voiceLabelFor(undefined, undefined, children)).toBe('Personal information');
  });

  test('includes numbers and joins text split across expressions', () => {
    expect(voiceLabelFor(undefined, undefined, <Text>{'Stories'} {12}</Text>)).toBe('Stories 12');
  });

  test('has no label for an icon-only button', () => {
    expect(voiceLabelFor(undefined, undefined, <Icon name="x" />)).toBeUndefined();
  });

  test('cannot read render-function children, so relies on the accessibility label', () => {
    const render = () => <Text>Hidden</Text>;
    expect(voiceLabelFor(undefined, undefined, render)).toBeUndefined();
    expect(voiceLabelFor(undefined, 'Play', render)).toBe('Play');
  });

  test('keeps labels short', () => {
    const long = 'word '.repeat(40);
    expect((voiceLabelFor(undefined, undefined, <Text>{long}</Text>) ?? '').length).toBeLessThanOrEqual(60);
  });
});
