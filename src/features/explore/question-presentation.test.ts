import { describe, expect, test } from 'bun:test';
import { getQuestionIdenticonUrl, getQuestionSourceLabel, getExploreCategoryTitle, getQuestionFeedbackRequest } from './question-presentation';

describe('Explore question presentation', () => {
  test('uses the same deterministic artwork URL as web, escaping the question ID', () => {
    expect(getQuestionIdenticonUrl('question/one & two')).toBe('https://api.dicebear.com/10.x/disco/svg?seed=question%2Fone%20%26%20two');
  });
  test('can request native-safe PNG artwork without changing the seed', () => {
    expect(getQuestionIdenticonUrl('draft/one & two', 'png')).toBe('https://api.dicebear.com/10.x/disco/png?seed=draft%2Fone%20%26%20two');
  });
  test('labels starter, personalized and historical questions without unlock copy', () => {
    expect(getQuestionSourceLabel('starter')).toBe('Starter question');
    expect(getQuestionSourceLabel('ai-generated')).toBe('Just for you');
    expect(getQuestionSourceLabel('legacy')).toBe('From your history');
    expect(getQuestionSourceLabel(undefined)).toBe('Starter question');
  });
  test('resolves canonical titles and legacy slugs without losing punctuation', () => {
    expect(getExploreCategoryTitle('whats-ahead')).toBe("What's Ahead");
    expect(getExploreCategoryTitle('career')).toBe('Work & Purpose');
    expect(getExploreCategoryTitle('Work & Purpose')).toBe('Work & Purpose');
    expect(getExploreCategoryTitle(undefined)).toBe('Explore topics');
  });
  test('builds feedback requests and rejects missing question IDs', () => {
    expect(getQuestionFeedbackRequest('question/one', 'not-relevant')).toEqual({ url: '/prompts/question%2Fone/feedback', body: { status: 'not-relevant' } });
    expect(() => getQuestionFeedbackRequest('', 'not-relevant')).toThrow('Question ID is required');
  });
});
