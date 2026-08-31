// @ts-nocheck
import {describe, expect, test} from 'bun:test';

describe('design token parity', () => {
  test('keeps overview and shared stat accents on centralized tokens', async () => {
    const overview = await Bun.file(
      new URL('../../../app/(tabs)/overview/index.tsx', import.meta.url),
    ).text();
    const statCard = await Bun.file(
      new URL('../../components/ui/StatCard.tsx', import.meta.url),
    ).text();

    expect(overview).not.toContain('text-[#');
    expect(statCard).not.toContain('text-[#');
    expect(statCard).toContain('text-stat-pink');
    expect(statCard).toContain('text-info-strong');
  });

  test('registers every current native Modal file as approved or debt', async () => {
    const policy = await Bun.file(
      new URL('../../../docs/modal-policy.md', import.meta.url),
    ).text();
    for (const file of [
      'app/create.tsx',
      'app/article.tsx',
      'app/editor.tsx',
      'src/components/ui/MediaPreviewModal.tsx',
      'src/components/ui/CameraCaptureModal.tsx',
      'src/components/ui/ConfirmDialog.tsx',
    ]) {
      expect(policy).toContain(`\`${file}\``);
    }
  });
});
