// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('Ceremony & Retention Features Registration', () => {
  test('registers all ceremonial and retention sheets in ui.store and SheetManager', async () => {
    const store = await Bun.file(new URL('../../store/ui.store.ts', import.meta.url)).text();
    const manager = await Bun.file(new URL('../../components/sheets/SheetManager.tsx', import.meta.url)).text();

    // Phase 1 sheets
    expect(store).toContain("'upgrade-success'");
    expect(store).toContain("'capsule-sealed'");
    expect(store).toContain("'first-story-milestone'");
    expect(manager).toContain('UpgradeSuccessSheet');
    expect(manager).toContain('CapsuleSealedSheet');
    expect(manager).toContain('FirstStoryMilestoneSheet');

    // Phase 2 sheets
    expect(store).toContain("'guardian-lens'");
    expect(store).toContain("'export-archive'");
    expect(manager).toContain('GuardianLensSheet');
    expect(manager).toContain('ExportArchiveSheet');
  });

  test('voice calls end without a debrief sheet; the transcript thread replaces it', async () => {
    const voiceCall = await Bun.file(new URL('../../../app/voice-call.tsx', import.meta.url)).text();
    const store = await Bun.file(new URL('../../store/ui.store.ts', import.meta.url)).text();
    const manager = await Bun.file(new URL('../../components/sheets/SheetManager.tsx', import.meta.url)).text();
    const settings = await Bun.file(new URL('../../../app/settings/index.tsx', import.meta.url)).text();
    expect(voiceCall).not.toContain('voice-debrief');
    expect(voiceCall).not.toContain('showDebrief');
    expect(store).not.toContain("'voice-debrief'");
    expect(manager).not.toContain('VoiceDebriefSheet');
    expect(settings).not.toContain('voice-debrief');
    expect(await Bun.file(new URL('../../components/sheets/VoiceDebriefSheet.tsx', import.meta.url)).exists()).toBe(false);
  });

  test('wires guardian-lens trigger into BeneficiaryActionsSheet', async () => {
    const actionsSheet = await Bun.file(new URL('../../components/sheets/BeneficiaryActionsSheet.tsx', import.meta.url)).text();
    expect(actionsSheet).toContain("'guardian-lens'");
    expect(actionsSheet).toContain('Preview Beneficiary Access');
  });

  test('wires export-archive trigger into PrivacySettingsScreen', async () => {
    const privacy = await Bun.file(new URL('../../../app/settings/privacy.tsx', import.meta.url)).text();
    expect(privacy).toContain("'export-archive'");
    expect(privacy).toContain('Export your archive');
  });

  test('wires MemorySpotlightCard into OverviewScreen', async () => {
    const overview = await Bun.file(new URL('../../../app/(tabs)/overview/index.tsx', import.meta.url)).text();
    expect(overview).toContain('MemorySpotlightCard');
    expect(overview).toContain('spotlight={statsData?.spotlight}');
    expect(overview).toContain('fallbackStory={fallbackStory}');
  });
});
