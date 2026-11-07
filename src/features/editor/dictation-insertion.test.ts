import { expect, test } from 'bun:test';
import { BEGIN_DICTATION_BOOKMARK, insertDictationScript } from './dictation-insertion';

function harness() {
  let map: ((event: { transaction: { mapping: { map: (pos: number) => number } } }) => void) | undefined;
  const inserted: { pos: number; content: unknown }[] = [];
  const editor = {
    state: { selection: { from: 4 }, doc: { content: { size: 100 }, textBetween: () => 'x' } },
    on: (_: string, handler: typeof map) => { map = handler; },
    off: () => { map = undefined; },
    getHTML: () => '<p>Inserted transcript</p>',
    commands: { insertContentAt: (pos: number, content: unknown) => { inserted.push({ pos, content }); } },
  };
  const messages: Record<string, unknown>[] = [];
  const window = { ReactNativeWebView: { postMessage: (message: string) => { messages.push(JSON.parse(message)); } } };
  const execute = (source: string) => new Function('document', 'window', source)({ querySelector: () => ({ editor }) }, window);
  return { execute, inserted, messages, editBefore: () => map?.({ transaction: { mapping: { map: pos => pos + 3 } } }) };
}
test('tracks the starting insertion point through edits made while transcribing', () => {
  const h = harness(); h.execute(BEGIN_DICTATION_BOOKMARK); h.editBefore();
  h.execute(insertDictationScript('Recorded words'));
  expect(h.inserted).toEqual([{ pos: 7, content: { type: 'text', text: ' Recorded words ' } }]);
});
test('treats transcript markup and quotes as plain text', () => {
  const h = harness();
  h.execute(insertDictationScript('<script>" & hello</script>'));
  expect(h.inserted[0].content).toEqual({ type: 'text', text: ' <script>" & hello</script> ' });
});

test('inserts and confirms the updated document in a single editor message', () => {
  const h = harness();
  h.execute(insertDictationScript('Recorded words', 'request-1'));
  expect(h.messages).toEqual([{ type: 'memento-dictation-result', requestId: 'request-1', html: '<p>Inserted transcript</p>' }]);
});
test('reports an unavailable editor so the recording remains retryable', () => {
  const messages: { error?: string }[] = [];
  new Function('document', 'window', insertDictationScript('Words', 'request-2'))(
    { querySelector: () => null },
    { ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) } },
  );
  expect(messages[0].error).toContain('recording is saved for retry');
});
