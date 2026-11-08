import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';

const primarySurfaces = [
  'app/(tabs)/overview/index.tsx',
  'app/(tabs)/stories/index.tsx',
  'app/(tabs)/stories/[id].tsx',
  'app/(tabs)/explore/index.tsx',
  'app/(tabs)/explore/[id].tsx',
  'app/(tabs)/capsule/index.tsx',
  'src/screens/ChatScreen.tsx',
  'src/components/overview/ActivityListItem.tsx',
  'src/components/overview/BrowseTopicsSection.tsx',
  'src/components/overview/DailyPromptSection.tsx',
  'src/components/overview/RecentActivitiesSection.tsx',
  'src/components/overview/TopicCard.tsx',
  'src/components/memory/ConversationBar.tsx',
  'src/components/memory/MasonryMemoryCard.tsx',
  'src/components/memory/StoryHtmlBody.tsx',
  'src/components/explore/CategoryCard.tsx',
  'src/components/explore/ContinueReflectingCard.tsx',
  'src/components/capsule/CapsuleCard.tsx',
  'src/components/capsule/StylePicker.tsx',
  'src/components/chat/ChatInput.tsx',
  'src/components/chat/MessageBubble.tsx',
  'src/components/chat/TypingIndicator.tsx',
  'src/components/chat/DeepDiveBanner.tsx',
  'src/components/chat/HostChatJumpPills.tsx',
  'src/components/chat/MilestoneCard.tsx',
  'src/components/chat/PromptReflectionHeader.tsx',
  'src/components/chat/EmojiPickerSheet.tsx',
  'src/components/chat/ChatAttachmentPickerSheet.tsx',
  'src/components/chat/VoiceUpgradeScreen.tsx',
];

describe('primary surface typography', () => {
  test.each(primarySurfaces.map((file) => [file]))('%s uses semantic typography roles', (file) => {
    const source = readFileSync(file, 'utf8');
    const rendersText = /<(?:Animated\.)?Text\b/.test(source);

    if (rendersText) {
      expect(source).toContain("@/constants/typography");
      expect(source).toMatch(/TYPE\./);
    }

    expect(source).not.toMatch(/fontWeight\s*:/);
    expect(source).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
    expect(source).not.toMatch(/fontSize\s*:\s*(?:\d|moderateScale\s*\()/);
  });

  test('primary tab subtitles and story details match Overview body role (15px)', () => {
    const stories = readFileSync('app/(tabs)/stories/index.tsx', 'utf8');
    const explore = readFileSync('app/(tabs)/explore/index.tsx', 'utf8');
    const capsule = readFileSync('app/(tabs)/capsule/index.tsx', 'utf8');
    const storyDetail = readFileSync('app/(tabs)/stories/[id].tsx', 'utf8');

    expect(stories).not.toContain('TYPE.bodyLarge');
    expect(stories).toContain('TYPE.body');

    expect(explore).not.toContain('TYPE.bodyLarge');
    expect(explore).toContain('TYPE.body');

    expect(capsule).not.toContain('TYPE.bodyLarge');
    expect(capsule).toContain('TYPE.body');

    expect(storyDetail).not.toContain('...TYPE.bodyLarge');
    expect(storyDetail).toContain('...TYPE.body,');
  });

  test('editor and article flows use button roles for CTAs and TYPE.input for editable fields', () => {
    const article = readFileSync('app/article.tsx', 'utf8');
    const editor = readFileSync('app/editor.tsx', 'utf8');

    expect(article).not.toContain('postBtnText: { ...TYPE.bodyLarge');
    expect(article).toContain('bodyInput: { ...TYPE.input');

    expect(editor).not.toContain('style={{ ...TYPE.bodyLarge, color: COLORS.textInverse }}>Post now');
    expect(editor).not.toContain('style={{ ...TYPE.bodyLarge, color: COLORS.textInverse }}>Add another story');
  });

  test('supporting components use standard TYPE.body (15px) for explanatory copy', () => {
    const planBanner = readFileSync('src/components/subscription/PlanSummaryBanner.tsx', 'utf8');
    const weeklyCard = readFileSync('src/components/account/WeeklyProgressCard.tsx', 'utf8');
    const narration = readFileSync('src/components/audio/StoryNarrationPlayer.tsx', 'utf8');
    const mediaModal = readFileSync('src/components/ui/MediaPreviewModal.tsx', 'utf8');
    const create = readFileSync('app/create.tsx', 'utf8');

    expect(planBanner).not.toContain('...TYPE.bodyLarge');
    expect(planBanner).toContain('...TYPE.body');

    expect(weeklyCard).not.toContain('...TYPE.bodyLarge');
    expect(weeklyCard).toContain('...TYPE.body');

    expect(narration).not.toContain('...TYPE.bodyLarge');
    expect(narration).toContain('...TYPE.body');

    expect(mediaModal).not.toContain('...TYPE.bodyLarge');
    expect(mediaModal).toContain('...TYPE.body');

    expect(create).not.toContain('userName: { ...TYPE.bodyLarge');
    expect(create).toContain('userName: { ...TYPE.label');
    expect(create).not.toContain('input: {\n    ...TYPE.bodyLarge');
    expect(create).toContain('input: {\n    ...TYPE.input');
  });

  test('auth and flow screen subtitles use standard TYPE.body (15px)', () => {
    const login = readFileSync('app/(auth)/login.tsx', 'utf8');
    const register = readFileSync('app/(auth)/register.tsx', 'utf8');
    const forgotPw = readFileSync('app/(auth)/forgot-password.tsx', 'utf8');
    const twoFactor = readFileSync('app/(auth)/two-factor.tsx', 'utf8');
    const setPw = readFileSync('app/(auth)/set-password.tsx', 'utf8');
    const verifyEmail = readFileSync('app/(auth)/verify-email.tsx', 'utf8');
    const voiceCall = readFileSync('app/voice-call.tsx', 'utf8');
    const acceptInvite = readFileSync('app/accept-invite/[id].tsx', 'utf8');

    for (const [name, src] of [
      ['login', login],
      ['register', register],
      ['forgot-password', forgotPw],
      ['two-factor', twoFactor],
      ['set-password', setPw],
      ['verify-email', verifyEmail],
      ['voice-call', voiceCall],
      ['accept-invite', acceptInvite],
    ] as const) {
      expect(src).not.toContain('style={TYPE.bodyLarge}');
    }
  });

  test('the Overview capture card writes in the serif capture role', () => {
    const overview = readFileSync('app/(tabs)/overview/index.tsx', 'utf8');
    const capture = readFileSync('src/components/overview/OverviewCaptureCard.tsx', 'utf8');
    expect(overview).toContain('<OverviewCaptureCard');
    expect(capture).toContain('TYPE.captureInput');
    expect(capture).toContain('What’s on your mind today?');
  });
});

