/** Uses the active AUDIO session. Explicitly complete typed turns even when the mic is muted. */
export function sendVoiceText(text: string, runtime: {
  ready: boolean;
  session: { sendClientContent(input: { turns: { role: 'user'; parts: { text: string }[] }[]; turnComplete: true }): void } | null;
  record(text: string): void;
}): void {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Write a message first.');
  if (!runtime.ready || !runtime.session) throw new Error('Voice is reconnecting. Please try your message again in a moment.');
  runtime.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: trimmed }] }], turnComplete: true });
  runtime.record(trimmed);
}
