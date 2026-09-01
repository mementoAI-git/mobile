// @ts-nocheck
import {describe, expect, test} from 'bun:test';
import {getPromptCategorySlug} from './category-identity';

describe('prompt category identity', () => {
  test('uses a string category returned by the API as the drill-down slug', () => {
    expect(getPromptCategorySlug('life-transition')).toBe('life-transition');
  });

  test('prefers an object slug while retaining compatibility with older shapes', () => {
    expect(
      getPromptCategorySlug({
        _id: 'database-id',
        slug: 'wellbeing',
        name: 'Wellbeing & Daily Life',
      }),
    ).toBe('wellbeing');
    expect(getPromptCategorySlug({_id: 'career', name: 'Career'})).toBe(
      'career',
    );
  });
});
