import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { formatVoiceMinutes, parseVoiceUsage, voiceMinutes, VoiceQuietClock } from './voice-usage';

describe('voice usage', () => {
  test('reads this month, all time and the free allowance', () => {
    const usage = parseVoiceUsage({
      month: '2026-11',
      month_seconds: 1830,
      all_time_seconds: 7290,
      month_resets_at: '2026-11-30T23:00:00.000Z',
      free_seconds_limit: 5400,
      free_seconds_left: 3570,
    });
    expect(usage).toMatchObject({ month: '2026-11', monthSeconds: 1830, allTimeSeconds: 7290, freeLimitSeconds: 5400, freeLeftSeconds: 3570 });
    expect(usage?.monthResetsAt?.toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });

  test('has no allowance on a paid plan, and rejects an empty response', () => {
    expect(parseVoiceUsage({ month_seconds: 0, all_time_seconds: 60, free_seconds_limit: null, free_seconds_left: null }))
      .toMatchObject({ freeLimitSeconds: null, freeLeftSeconds: null });
    expect(parseVoiceUsage(null)).toBeNull();
    expect(parseVoiceUsage({ month_seconds: 'x' })).toBeNull();
  });

  test('shows whole minutes, rounded down, and hours from 60', () => {
    expect(voiceMinutes(119)).toBe(1);
    expect(formatVoiceMinutes(0)).toBe('0 min');
    expect(formatVoiceMinutes(45 * 60 + 59)).toBe('45 min');
    expect(formatVoiceMinutes(3 * 3600 + 5 * 60)).toBe('3 h 5 min');
    expect(formatVoiceMinutes(2 * 3600)).toBe('2 h');
  });

  test('calls check in every minute and once more at the end, naming the call by its ticket', () => {
    const hook = readFileSync('src/hooks/use-voice-mode.ts', 'utf8');
    expect(hook).toContain('}, VOICE_USAGE_CHECK_IN_MS);');
    expect(hook).toContain('void sendVoiceUsageCheckIn(endedTicket, endedQuietSeconds)');
    // The clock starts when the call connects, with a check-in straight away.
    expect(hook).toContain('if (callTicketRef.current) void sendVoiceUsageCheckIn(callTicketRef.current, 0);');
    // Every call keeps its ticket, limited or not.
    expect(hook.match(/if \(liveToken\.callTicket\) callTicketRef\.current = liveToken\.callTicket;/g)?.length).toBe(2);
    expect(readFileSync('src/features/chat/voice-live-config.ts', 'utf8')).toContain("callTicket: typeof response.call_ticket === 'string'");
  });

  test('frees only the part of a silence after its first minute', () => {
    const clock = new VoiceQuietClock(0);
    clock.activity(50_000);
    expect(clock.quietSeconds(100_000)).toBe(0);
    clock.activity(50_000 + 5 * 60_000); // four quiet minutes after the first
    expect(clock.quietSeconds(50_000 + 5 * 60_000)).toBe(240);
    expect(clock.quietSeconds(50_000 + 7 * 60_000)).toBe(300);
  });

  test('the Milestones tab opens with the voice minutes cards', () => {
    const panel = readFileSync('src/components/insights/MilestonesPanel.tsx', 'utf8');
    expect(panel.indexOf('<VoiceMinutesCards />')).toBeLessThan(panel.indexOf('milestones.map('));
    const cards = readFileSync('src/components/insights/VoiceMinutesCards.tsx', 'utf8');
    expect(cards).toContain('This month');
    expect(cards).toContain('All time');
    expect(cards).toContain('free min');
  });
});
