import { describe, expect, test } from 'bun:test';

import { VoiceResponseGate } from './voice-response-gate';

describe('VoiceResponseGate', () => {
  test('passes model output through normally', () => {
    const gate = new VoiceResponseGate();

    expect(gate.acceptOutput()).toBe(true);
    expect(gate.acceptOutput()).toBe(true);
    expect(gate.isDiscarding()).toBe(false);
  });

  test('after a local interrupt, drops the rest of that response until its turn completes', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();

    expect(gate.interruptLocally()).toBe(true);
    // Gemini keeps streaming the abandoned response: it must stay silent.
    expect(gate.acceptOutput()).toBe(false);
    expect(gate.acceptOutput()).toBe(false);
    expect(gate.isDiscarding()).toBe(true);

    expect(gate.endTurn()).toEqual({ discarded: true });
    // The next response is heard.
    expect(gate.acceptOutput()).toBe(true);
  });

  test('a server interruption also ends the discarded response', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();
    gate.interruptLocally();

    expect(gate.endTurn()).toEqual({ discarded: true });
    expect(gate.acceptOutput()).toBe(true);
  });

  test('a tap after the response already finished discards nothing, so the next reply is kept', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();
    expect(gate.endTurn()).toEqual({ discarded: false });

    expect(gate.interruptLocally()).toBe(false);
    expect(gate.acceptOutput()).toBe(true);
  });

  test('repeated taps on the same response keep discarding until its boundary', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();
    gate.interruptLocally();

    expect(gate.interruptLocally()).toBe(true);
    expect(gate.acceptOutput()).toBe(false);
    expect(gate.endTurn()).toEqual({ discarded: true });
  });

  test('reset clears any pending discard, for a new call or a resumed session', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();
    gate.interruptLocally();

    gate.reset();

    expect(gate.acceptOutput()).toBe(true);
  });

  test('a late transcript after turnComplete does not reopen the response, so the next reply plays', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput(); // audio of response A
    gate.endTurn(); // turnComplete for A
    expect(gate.acceptTranscript()).toBe(true); // A's final transcript arrives late
    gate.interruptLocally(); // tap while A's buffered audio still drains

    expect(gate.acceptOutput()).toBe(true); // response B is heard
  });

  test('transcripts of an abandoned response are dropped with its audio', () => {
    const gate = new VoiceResponseGate();
    gate.acceptOutput();
    gate.interruptLocally();

    expect(gate.acceptTranscript()).toBe(false);
    gate.endTurn();
    expect(gate.acceptTranscript()).toBe(true);
  });
});
