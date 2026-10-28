/** Keep the editor open on device-storage failure; never wait for cloud sync. */
export async function saveDraftAndExit({ saveLocal, leave, notify, onFailure }: {
  saveLocal?: () => Promise<void>;
  leave: () => void;
  notify: () => void;
  onFailure: () => void;
}) {
  try {
    await saveLocal?.();
  } catch {
    onFailure(); return false;
  }
  leave();
  if (saveLocal) notify();
  return true;
}

/** A stalled WebView must not trap Cancel; autosave remains the fallback. */
export async function snapshotEditorBody(read: (() => Promise<string>) | undefined, fallback: () => string, timeoutMs = 200) {
  if (!read) return fallback();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([read().catch(() => fallback()), new Promise<string>(resolve => { timer = setTimeout(() => resolve(fallback()), timeoutMs); })]);
  } finally { if (timer) clearTimeout(timer); }
}
