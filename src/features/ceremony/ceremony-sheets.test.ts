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

  test('the person sheet shows their card with Edit and Remove only', async () => {
    const actionsSheet = await Bun.file(new URL('../../components/sheets/BeneficiaryActionsSheet.tsx', import.meta.url)).text();
    expect(actionsSheet).toContain('<PersonCard');
    expect(actionsSheet).not.toContain('Preview their access');
    expect(actionsSheet).toContain('onClose(open)');
  });

  test('wires export-archive trigger into PrivacySettingsScreen', async () => {
    const privacy = await Bun.file(new URL('../../../app/settings/privacy.tsx', import.meta.url)).text();
    expect(privacy).toContain("'export-archive'");
    expect(privacy).toContain('Export your archive');
  });

  test('keeps Memory Spotlight off the OverviewScreen', async () => {
    const overview = await Bun.file(new URL('../../../app/(tabs)/overview/index.tsx', import.meta.url)).text();
    expect(overview).not.toContain('MemorySpotlightCard');
    expect(overview).not.toContain('statsData?.spotlight');
  });
});

describe('celebration sheets', () => {
  test('first story and Pro upgrade share the standard celebration layout', async () => {
    const first = await Bun.file(new URL('../../components/sheets/FirstStoryMilestoneSheet.tsx', import.meta.url)).text();
    const upgrade = await Bun.file(new URL('../../components/sheets/UpgradeSuccessSheet.tsx', import.meta.url)).text();
    const layout = await Bun.file(new URL('../../components/sheets/CelebrationSheet.tsx', import.meta.url)).text();
    expect(first).toContain('<CelebrationSheet');
    expect(upgrade).toContain('<CelebrationSheet');
    expect(upgrade).toContain('PRO_FEATURES');
    expect(layout).toContain('SHEET_GROUP_GAP');
    expect(layout).toContain('SHEET_CLOSE_BUTTON_STYLE');
    expect(layout).toContain('TYPE.sheetTitle');
  });

  test('first story opens after the publish success page; Pro after a store purchase', async () => {
    const editor = await Bun.file(new URL('../../../app/editor.tsx', import.meta.url)).text();
    const billing = await Bun.file(new URL('../settings/billing-flow.ts', import.meta.url)).text();
    const dismiss = editor.slice(editor.indexOf('const handleDismissPublishedSuccess'));
    expect(dismiss.slice(0, dismiss.indexOf('}, ['))).toContain('celebrateFirstStory(');
    expect(billing).toContain("openSheet('upgrade-success')");
  });

  test('only a person with no stories before publishing gets the first story sheet', async () => {
    const { isFirstStory } = await import('./first-story');
    expect(isFirstStory(0)).toBe(true);
    expect(isFirstStory('0')).toBe(true);
    expect(isFirstStory(3)).toBe(false);
    expect(isFirstStory(undefined)).toBe(false);
  });
});
