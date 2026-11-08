import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { stripHtml } from './strip-html';

describe('Search & Stories refinements', () => {
  test('stripHtml removes HTML tags, entities, and excessive whitespace', () => {
    expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    expect(stripHtml('<p>A memory&nbsp;with&nbsp;spaces</p>')).toBe('A memory with spaces');
    expect(stripHtml('<div>Line 1</div><br/><div>Line 2</div>')).toBe('Line 1 Line 2');
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml('')).toBe('');
    expect(stripHtml('Plain text without tags')).toBe('Plain text without tags');
  });

  test('SearchMemorySheet applies stripHtml to memory.body before rendering', () => {
    const sheetSource = readFileSync('src/components/sheets/SearchMemorySheet.tsx', 'utf8');
    expect(sheetSource).toContain('const previewBody = stripHtml(memory.body);');
    expect(sheetSource).toContain('{previewBody}');
    expect(sheetSource).not.toContain('{memory.body}');
  });

  test('Stories search input guards against iOS AutoFill and provides debounced filtering', () => {
    const storiesScreen = readFileSync('app/(tabs)/stories/index.tsx', 'utf8');
    const storiesLogic = readFileSync('src/hooks/use-stories-logic.ts', 'utf8');

    // AutoFill guards
    expect(storiesScreen).toContain('textContentType="none"');
    expect(storiesScreen).toContain('autoComplete="off"');
    expect(storiesScreen).toContain('autoCorrect={false}');

    // Debounce timer in useStoriesLogic
    expect(storiesLogic).toContain('setTimeout(');
    expect(storiesLogic).toContain('setDebouncedSearch(search.trim());');
    expect(storiesLogic).toContain('300');

    // Keeps header and list empty component mounted during search
    expect(storiesScreen).toContain('ListEmptyComponent={emptyState}');
    expect(storiesScreen).toMatch(/isLoading && !stories\.length && !debouncedSearch/);
  });

  test('BillingTabs keeps Invoices label stable across active and inactive states', () => {
    const billingTabsSource = readFileSync('src/components/billing/BillingTabs.tsx', 'utf8');
    expect(billingTabsSource).not.toContain('Recent invoices');
    expect(billingTabsSource).toContain('Invoices');
  });

  test('People & groups tabs include accessible tab role and selected state', () => {
    const beneficiariesSource = readFileSync('app/settings/beneficiaries.tsx', 'utf8');
    expect(beneficiariesSource).toContain('accessibilityRole="tab"');
    expect(beneficiariesSource).toContain('accessibilityRole="tablist"');
    expect(beneficiariesSource).toContain('accessibilityState={{ selected }}');
  });
});
