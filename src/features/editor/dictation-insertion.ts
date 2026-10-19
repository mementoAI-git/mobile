export const BEGIN_DICTATION_BOOKMARK = `(() => {
  const editor = document.querySelector('.tiptap, .ProseMirror')?.editor;
  if (!editor) return;
  const previous = window.__mementoDictation;
  if (previous) previous.editor.off('transaction', previous.map);
  const bookmark = { editor, pos: editor.state.selection.from };
  bookmark.map = ({ transaction }) => { bookmark.pos = transaction.mapping.map(bookmark.pos, 1); };
  editor.on('transaction', bookmark.map);
  window.__mementoDictation = bookmark;
})(); true;`;

export function insertDictationScript(text: string, requestId?: string) {
  return `(() => {
    const requestId = ${JSON.stringify(requestId ?? null)};
    const reply = (payload) => { if (requestId) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'memento-dictation-result', requestId, ...payload })); };
    try {
    const editor = document.querySelector('.tiptap, .ProseMirror')?.editor;
    if (!editor) throw new Error('The editor is not ready. Your recording is saved for retry.');
    const bookmark = window.__mementoDictation;
    const pos = Math.max(1, Math.min(bookmark?.editor === editor ? bookmark.pos : editor.state.selection.from, editor.state.doc.content.size - 1));
    if (bookmark) { bookmark.editor.off('transaction', bookmark.map); delete window.__mementoDictation; }
    const text = ${JSON.stringify(text)};
    const before = editor.state.doc.textBetween(Math.max(0, pos - 1), pos, ' ');
    const prefix = before && !/\\s/.test(before) ? ' ' : '';
    const inserted = editor.commands.insertContentAt(pos, { type: 'text', text: prefix + text + ' ' });
    if (inserted === false) throw new Error('Could not insert the transcript. Your recording is saved for retry.');
    if (requestId) reply({ html: editor.getHTML() });
    } catch (error) {
      if (requestId) reply({ error: error.message || 'Could not insert the transcript.' });
      else throw error;
    }
  })(); true;`;
}
