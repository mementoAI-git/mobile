/** Replace this recording's live text without duplicating previous partial results. */
export function appendStoryDictation(html: string, transcript: string): string {
  const text = transcript.trim();
  if (!text) return html;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return `${html}<p>${escaped}</p>`;
}
