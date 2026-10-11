import { describe, expect, test } from 'bun:test';

import { VOICE_CUTOFF_WINDOW_MS, VOICE_SPEECH_RMS, VoiceLatencyTracker } from './voice-latency';

const SPEECH = VOICE_SPEECH_RMS * 2;
const SILENCE = VOICE_SPEECH_RMS / 2;

function trackerAt(start: number) {
  const clock = { now: start };
  return { clock, tracker: new VoiceLatencyTracker(() => clock.now) };
}

describe('VoiceLatencyTracker startup', () => {
  test('splits startup into back-to-back stages ending at the first audible word', () => {
    const { clock, tracker } = trackerAt(10_000);
    clock.now = 10_050;
    tracker.mark('permission');
    tracker.beginAudioStart();
    clock.now = 10_450;
    tracker.endAudioStart();
    clock.now = 11_250;
    tracker.mark('token');
    clock.now = 11_400;
    tracker.mark('sdk');
    clock.now = 11_700;
    tracker.mark('socketOpen');
    clock.now = 11_900;
    tracker.mark('setupComplete');
    clock.now = 12_110;
    tracker.mark('greetingSent');
    clock.now = 12_800;
    tracker.observeModelAudio();
    clock.now = 13_040;
    tracker.observePlaybackStart();

    const summary = tracker.summary();
    expect(summary.startedAt).toBe(10_000);
    expect(summary.timeToFirstWordMs).toBe(3_040);
    expect(summary.stages.map(({ name, durationMs }) => [name, durationMs])).toEqual([
      ['permission', 50],
      ['token', 1_200],
      ['sdk', 150],
      ['socketOpen', 300],
      ['setupComplete', 200],
      ['greetingSent', 210],
      ['firstAudio', 690],
      ['firstPlayback', 240],
    ]);
    expect(summary.audioStart).toEqual({ startAt: 10_050, endAt: 10_450, durationMs: 400 });
    expect(summary.stages[1]).toEqual({
      name: 'token',
      startAt: 10_050,
      endAt: 11_250,
      durationMs: 1_200,
    });
  });

  test('keeps the first time of each milestone so reconnects do not move it', () => {
    const { clock, tracker } = trackerAt(0);
    clock.now = 100;
    tracker.mark('socketOpen');
    clock.now = 9_000;
    tracker.mark('socketOpen');

    expect(tracker.summary().stages).toEqual([
      { name: 'socketOpen', startAt: 0, endAt: 100, durationMs: 100 },
    ]);
  });

  test('measures a stage from the last milestone reached when earlier ones are missing', () => {
    const { clock, tracker } = trackerAt(0);
    clock.now = 400;
    tracker.mark('token');
    clock.now = 1_000;
    tracker.mark('setupComplete');

    const summary = tracker.summary();
    expect(summary.stages.map(({ name, startAt }) => [name, startAt])).toEqual([
      ['token', 0],
      ['setupComplete', 400],
    ]);
    expect(summary.timeToFirstWordMs).toBeUndefined();
    expect(summary.audioStart).toBeUndefined();
  });
});

describe('VoiceLatencyTracker turns', () => {
  test('times each reply from the end of user speech to first model audio and to playback', () => {
    const { clock, tracker } = trackerAt(0);
    // Greeting turn: the user has not spoken, so it is not a reply.
    clock.now = 1_000;
    tracker.observeModelAudio();
    clock.now = 1_200;
    tracker.observePlaybackStart();
    clock.now = 2_000;
    tracker.observeModelTurnEnd();

    clock.now = 3_000;
    tracker.observeMicFrame(SPEECH);
    clock.now = 3_400;
    tracker.observeMicFrame(SPEECH);
    clock.now = 3_500;
    tracker.observeMicFrame(SILENCE);
    clock.now = 3_900;
    tracker.observeUserTranscript();
    clock.now = 4_600;
    tracker.observeModelAudio();
    clock.now = 4_700;
    tracker.observeModelAudio();
    clock.now = 4_850;
    tracker.observePlaybackStart();

    expect(tracker.summary().turns).toEqual([
      {
        speechEndAt: 3_400,
        firstAudioAt: 4_600,
        responseMs: 1_200,
        audibleMs: 1_450,
        transcriptToAudioMs: 700,
        toolCall: false,
        cutOff: false,
      },
    ]);
  });

  test('flags replies that waited on a tool call', () => {
    const { clock, tracker } = trackerAt(0);
    clock.now = 100;
    tracker.observeMicFrame(SPEECH);
    clock.now = 900;
    tracker.observeToolCall();
    clock.now = 2_500;
    tracker.observeModelAudio();
    clock.now = 3_000;
    tracker.observeModelTurnEnd();
    clock.now = 3_500;
    tracker.observeMicFrame(SPEECH);
    clock.now = 4_000;
    tracker.observeModelAudio();

    expect(tracker.summary().turns.map(({ responseMs, toolCall }) => [responseMs, toolCall])).toEqual([
      [2_400, true],
      [500, false],
    ]);
  });

  test('ignores speech during a model turn until that turn ends', () => {
    const { clock, tracker } = trackerAt(0);
    clock.now = 100;
    tracker.observeMicFrame(SPEECH);
    clock.now = 900;
    tracker.observeModelAudio();
    clock.now = 1_000;
    tracker.observeMicFrame(SPEECH);
    clock.now = 1_100;
    tracker.observeModelAudio();

    expect(tracker.summary().turns.map(({ responseMs }) => responseMs)).toEqual([800]);
  });

  test('times the reply after the user barges in', () => {
    const { clock, tracker } = trackerAt(0);
    clock.now = 100;
    tracker.observeModelAudio();
    clock.now = 500;
    tracker.observeMicFrame(SPEECH);
    clock.now = 600;
    tracker.observeModelTurnEnd();
    clock.now = 1_800;
    tracker.observeMicFrame(SPEECH);
    clock.now = 2_900;
    tracker.observeModelAudio();

    expect(tracker.summary().turns.map(({ speechEndAt, responseMs }) => [speechEndAt, responseMs])).toEqual([
      [1_800, 1_100],
    ]);
  });

  test('reports nearest-rank percentiles for reply and audible times', () => {
    const { clock, tracker } = trackerAt(0);
    const responses = [900, 1_100, 1_300, 1_500, 3_000];
    for (const responseMs of responses) {
      tracker.observeMicFrame(SPEECH);
      clock.now += responseMs;
      tracker.observeModelAudio();
      clock.now += 200;
      tracker.observePlaybackStart();
      tracker.observeModelTurnEnd();
      clock.now += 1_000;
    }

    const { turnStats } = tracker.summary();
    expect(turnStats.response).toEqual({ count: 5, p50Ms: 1_300, p90Ms: 3_000, maxMs: 3_000 });
    expect(turnStats.audible).toEqual({ count: 5, p50Ms: 1_500, p90Ms: 3_200, maxMs: 3_200 });
  });

  test('counts a reply the user interrupts within the cut-off window as cutting them off', () => {
    const { clock, tracker } = trackerAt(0);
    // Reply 1: interrupted right after it started, so the user was not done.
    tracker.observeMicFrame(SPEECH);
    clock.now = 500;
    tracker.observeModelAudio();
    clock.now = 500 + VOICE_CUTOFF_WINDOW_MS - 1;
    tracker.observeModelTurnEnd({ interrupted: true });
    // Reply 2: interrupted much later, an ordinary barge-in.
    clock.now = 5_000;
    tracker.observeMicFrame(SPEECH);
    clock.now = 5_500;
    tracker.observeModelAudio();
    clock.now = 5_500 + VOICE_CUTOFF_WINDOW_MS + 1;
    tracker.observeModelTurnEnd({ interrupted: true });
    // Reply 3: finished normally.
    clock.now = 10_000;
    tracker.observeMicFrame(SPEECH);
    clock.now = 10_400;
    tracker.observeModelAudio();
    clock.now = 10_500;
    tracker.observeModelTurnEnd();

    const summary = tracker.summary();
    expect(summary.turns.map((turn) => turn.cutOff)).toEqual([true, false, false]);
    expect(summary.turnStats.cutOffs).toBe(1);
  });

  test('does not count an interrupted greeting as a cut-off', () => {
    const { clock, tracker } = trackerAt(0);
    tracker.observeModelAudio();
    clock.now = 300;
    tracker.observeModelTurnEnd({ interrupted: true });

    expect(tracker.summary().turnStats.cutOffs).toBe(0);
  });

  test('reports empty stats when there were no replies', () => {
    const { tracker } = trackerAt(0);
    expect(tracker.summary().turnStats.response).toEqual({ count: 0 });
  });
});
