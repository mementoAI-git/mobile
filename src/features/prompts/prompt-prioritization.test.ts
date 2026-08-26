// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  prioritizePromptsByEnrichment,
  CATEGORY_TO_ENRICHMENT_MAP,
} from './prompt-prioritization';

describe('prompt prioritization', () => {
  test('maps explore categories to enrichment dimensions correctly', () => {
    expect(CATEGORY_TO_ENRICHMENT_MAP.career).toBe('work_purpose');
    expect(CATEGORY_TO_ENRICHMENT_MAP.family).toBe('relationships_people');
    expect(CATEGORY_TO_ENRICHMENT_MAP.identity).toBe('identity_self');
    expect(CATEGORY_TO_ENRICHMENT_MAP.wellbeing).toBe('everyday_life');
  });

  test('prioritizes topics with the lowest enrichment score first with array category_scores', () => {
    const mockPrompts = [
      { _id: '1', title: 'Work prompt', category: 'career' },
      { _id: '2', title: 'Family prompt', category: 'family' },
      { _id: '3', title: 'Identity prompt', category: 'identity' },
    ];

    const mockStats = {
      category_scores: [
        { key: 'work_purpose', score: 80 },
        { key: 'relationships_people', score: 15 },
        { key: 'identity_self', score: 50 },
      ],
    };

    const result = prioritizePromptsByEnrichment(mockPrompts, mockStats as any);

    expect(result[0].prompt.title).toBe('Family prompt');
    expect(result[0].score).toBe(15);
    expect(result[0].isLowestDimension).toBe(true);

    expect(result[1].prompt.title).toBe('Identity prompt');
    expect(result[1].score).toBe(50);

    expect(result[2].prompt.title).toBe('Work prompt');
    expect(result[2].score).toBe(80);
    expect(result[2].isLowestDimension).toBe(false);
  });

  test('handles empty stats or empty prompts gracefully', () => {
    expect(prioritizePromptsByEnrichment([], null)).toEqual([]);
    
    const mockPrompts = [{ _id: '1', title: 'Any prompt', category: 'wellbeing' }];
    const result = prioritizePromptsByEnrichment(mockPrompts, null);
    expect(result.length).toBe(1);
    expect(result[0].score).toBe(0);
  });
});
