export type VoiceCallTurn = {
  speaker: 'user' | 'assistant';
  speakerName: string;
  text: string;
};

export type ParsedVoiceCall = {
  duration: string;
  turns: VoiceCallTurn[];
  hasTranscript: boolean;
  rawText: string;
};

const CALL_COMPLETED_REGEX = /^Voice call completed \((.*?)\)/i;
const TRANSCRIPT_DIVIDER = '--- Transcript ---';

/**
 * Checks whether a given message content corresponds to a completed voice call card.
 */
export function isVoiceCallMessage(text?: string | null, isVoice?: boolean): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (CALL_COMPLETED_REGEX.test(trimmed)) return true;
  if (isVoice && trimmed.includes(TRANSCRIPT_DIVIDER)) return true;
  return false;
}

/**
 * Serializes voice call transcript turns into clean, human-readable markdown
 * that complies with the backend validator and is parseable on any client.
 */
export function serializeVoiceCallTranscript(
  durationText: string,
  turns: Array<{ role: 'user' | 'ai'; text: string }>,
): string {
  const header = `Voice call completed (${durationText})`;
  const validTurns = turns.filter((t) => t.text && t.text.trim().length > 0);
  if (!validTurns.length) return header;

  const lines = [header, '', TRANSCRIPT_DIVIDER];
  for (const turn of validTurns) {
    const speakerLabel = turn.role === 'user' ? 'You' : 'Memento';
    lines.push(`${speakerLabel}: ${turn.text.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Parses a voice call completion message into its duration and structured transcript turns.
 */
export function parseVoiceCallMessage(rawText: string): ParsedVoiceCall {
  const text = rawText || '';
  const match = text.match(CALL_COMPLETED_REGEX);
  const duration = match ? match[1] : '00:00';

  const dividerIdx = text.indexOf(TRANSCRIPT_DIVIDER);
  if (dividerIdx === -1) {
    return {
      duration,
      turns: [],
      hasTranscript: false,
      rawText: text,
    };
  }

  const transcriptSection = text.slice(dividerIdx + TRANSCRIPT_DIVIDER.length).trim();
  if (!transcriptSection) {
    return {
      duration,
      turns: [],
      hasTranscript: false,
      rawText: text,
    };
  }

  const lines = transcriptSection.split('\n');
  const turns: VoiceCallTurn[] = [];
  let currentTurn: VoiceCallTurn | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const speakerMatch = line.match(/^(You|Memento|User|AI|Host):\s*(.*)$/i);
    if (speakerMatch) {
      if (currentTurn) {
        turns.push(currentTurn);
      }
      const rawSpeaker = speakerMatch[1].toLowerCase();
      const isUser = rawSpeaker === 'you' || rawSpeaker === 'user';
      currentTurn = {
        speaker: isUser ? 'user' : 'assistant',
        speakerName: isUser ? 'You' : 'Memento',
        text: speakerMatch[2],
      };
    } else if (currentTurn) {
      currentTurn.text += `\n${line}`;
    }
  }

  if (currentTurn) {
    turns.push(currentTurn);
  }

  return {
    duration,
    turns,
    hasTranscript: turns.length > 0,
    rawText: text,
  };
}
