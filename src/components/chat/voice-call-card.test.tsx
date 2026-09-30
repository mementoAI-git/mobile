import { describe, expect, test } from 'bun:test';
import { isVoiceCallMessage, parseVoiceCallMessage } from '@/features/chat/voice-transcript-parser';

describe('VoiceCallCard component contracts', () => {
  test('validates static contracts and responsive layout rules in VoiceCallCard.tsx', async () => {
    const source = await Bun.file(new URL('./VoiceCallCard.tsx', import.meta.url)).text();

    expect(source).toContain('export const VoiceCallCard = React.memo(');
    expect(source).toContain('parseVoiceCallMessage');
    expect(source).toContain('isExpanded');
    expect(source).toContain('setIsExpanded');
    expect(source).toContain('Haptics.selectionAsync()');
    expect(source).toContain('Clipboard.setStringAsync');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain("accessibilityLabel={isExpanded ? 'Hide call transcript' : 'View call transcript'}");
    expect(source).toContain('minHeight: 44');
    expect(source).toContain('radius(20)');
    expect(source).toContain('PhoneCall');
    expect(source).toContain('ChevronDown');
    expect(source).toContain('ChevronUp');
    expect(source).toContain('COLORS.brand');
    expect(source).toContain('Transcript unavailable for this call');
    expect(source).not.toContain('No spoken dialogue was transcribed for this call.');
  });

  test('parses basic call completion without transcript turns', () => {
    const message = {
      _id: 'call-1',
      text: 'Voice call completed (01:16)',
      is_voice: true,
      role: 'ai',
      created_at: '2026-09-29T16:40:00.000Z',
    };

    expect(isVoiceCallMessage(message.text, message.is_voice)).toBe(true);
    const parsed = parseVoiceCallMessage(message.text);
    expect(parsed.duration).toBe('01:16');
    expect(parsed.hasTranscript).toBe(false);
    expect(parsed.turns).toHaveLength(0);
  });

  test('parses call completion with full multi-turn transcript', () => {
    const rawText = [
      'Voice call completed (02:15)',
      '',
      '--- Transcript ---',
      'You: Tell me about autumn in Kyoto.',
      'Memento: Autumn in Kyoto is magical with the golden maple leaves.',
    ].join('\n');

    const message = {
      _id: 'call-2',
      text: rawText,
      is_voice: true,
      role: 'ai',
      created_at: '2026-09-29T16:45:00.000Z',
    };

    expect(isVoiceCallMessage(message.text, message.is_voice)).toBe(true);
    const parsed = parseVoiceCallMessage(message.text);
    expect(parsed.duration).toBe('02:15');
    expect(parsed.hasTranscript).toBe(true);
    expect(parsed.turns).toHaveLength(2);
    expect(parsed.turns[0].speaker).toBe('user');
    expect(parsed.turns[0].text).toBe('Tell me about autumn in Kyoto.');
    expect(parsed.turns[1].speaker).toBe('assistant');
    expect(parsed.turns[1].text).toBe('Autumn in Kyoto is magical with the golden maple leaves.');
  });
});
