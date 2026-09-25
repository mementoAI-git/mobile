import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

const files = [
  'BillingTabs.tsx',
  'BillingStorageCard.tsx',
  'BillingInvoicesPanel.tsx',
];

describe('billing reference components', () => {
  test('splits the screen into focused presentation units', () => {
    for (const file of files) {
      expect(existsSync(`src/components/billing/${file}`), file).toBe(true);
    }
  });

  test('keeps billing data and actions outside presentation components', () => {
    for (const file of files) {
      if (!existsSync(`src/components/billing/${file}`)) continue;
      const source = readFileSync(`src/components/billing/${file}`, 'utf8');
      expect(source).not.toContain("from '@/api/");
      expect(source).not.toContain('openBillingPortal');
    }
  });
});
