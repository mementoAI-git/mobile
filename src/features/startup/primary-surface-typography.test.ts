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
  'src/components/chat/DeepDiveNudge.tsx',
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
});
