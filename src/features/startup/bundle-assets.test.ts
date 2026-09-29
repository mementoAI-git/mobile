import { describe, expect, test } from 'bun:test';

const repoFile = (path: string) => new URL(`../../../${path}`, import.meta.url);

const optimizedAssets = [
  'assets/images/illustrations/empty_capsules.webp',
  'assets/images/illustrations/empty_explore.webp',
  'assets/images/illustrations/empty_memories.webp',
  'assets/images/voices/voice-denver.webp',
  'assets/images/voices/voice-hannah.webp',
  'assets/images/voices/voice-josef.webp',
  'assets/images/voices/voice-sue.webp',
] as const;

const consumers = [
  'app/(tabs)/stories/[id].tsx',
  'app/(tabs)/stories/index.tsx',
  'app/settings/activities.tsx',
  'app/(tabs)/explore/index.tsx',
  'app/(tabs)/capsule/index.tsx',
  'src/components/onboarding/OnboardingCelebrationOverlay.tsx',
  'src/components/beneficiaries/BeneficiaryEmptyState.tsx',
  'src/components/sheets/MemoryInsightsSheet.tsx',
  'src/components/sheets/ExportArchiveSheet.tsx',
  'src/components/sheets/CapsuleSealedSheet.tsx',
  'src/components/chat/VoiceArtwork.tsx',
  'src/features/chat/voice-catalog.ts',
] as const;

describe('production bundle assets', () => {
  test('ships optimized WebP artwork for large illustrations and voice portraits', async () => {
    for (const asset of optimizedAssets) {
      const file = Bun.file(repoFile(asset));
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(0);
    }
  });

  test('does not reference the superseded PNG artwork', async () => {
    for (const consumer of consumers) {
      const source = await Bun.file(repoFile(consumer)).text();
      expect(source).not.toMatch(/(?:empty_capsules|empty_explore|empty_memories|voice-(?:denver|hannah|josef|sue))\.png/);
    }
  });
});
