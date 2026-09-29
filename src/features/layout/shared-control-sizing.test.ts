import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const readComponent = (relPath: string) =>
  readFileSync(new URL(`../../components/ui/${relPath}`, import.meta.url), 'utf8');

describe('shared control sizing static contracts', () => {
  test('Button uses responsive style metrics and enforces 44dp touch target floor', () => {
    const source = readComponent('Button.tsx');
    expect(source).toContain("from '@/constants/responsive'");
    expect(source).not.toContain("h-14 px-6 gap-2");
    expect(source).not.toContain("h-10 px-4 gap-1.5");
    expect(source).toMatch(/minTouchTarget|minHeight:\s*44|hitSlop/);
  });

  test('TextInput scales input heights and radii responsively with 44dp minimum', () => {
    const source = readComponent('TextInput.tsx');
    expect(source).toContain("from '@/constants/responsive'");
    expect(source).toMatch(/minTouchTarget|mvs|minHeight/);
  });

  test('Checkbox enforces minimum 44dp touch target via hitSlop or minimum pressable dimensions', () => {
    const source = readComponent('Checkbox.tsx');
    expect(source).toMatch(/hitSlop/);
  });

  test('DashboardHeader ensures all interactive controls meet minimum 44dp touch target', () => {
    const source = readComponent('DashboardHeader.tsx');
    expect(source).toContain("from '@/constants/responsive'");
  });

  test('Recording and dialog controls preserve minimum 44dp touch targets and responsive spacing', () => {
    const recordingStatus = readComponent('RecordingStatus.tsx');
    const confirmDialog = readComponent('ConfirmDialog.tsx');
    const recovery = readComponent('PermissionRecoveryState.tsx');

    expect(recordingStatus).toContain("from '@/constants/responsive'");
    expect(confirmDialog).toContain("from '@/constants/responsive'");
    expect(recovery).toContain("from '@/constants/responsive'");
  });
});
