type Cancel = () => void;
type Schedule = (tick: () => void) => Cancel;

/** Pace bursty network chunks without changing their content or word order. */
export function createTextReveal({
  onText,
  immediate = () => false,
  schedule = (tick) => { const timer = setTimeout(tick, 32); return () => clearTimeout(timer); },
}: { onText: (text: string) => void; immediate?: () => boolean; schedule?: Schedule }) {
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  let parts: string[] = [];
  let count = 0;
  let stepSize = 2;
  let visible = '';
  let cancelTick: Cancel | null = null;
  let cancelled = false;
  let ended = false;
  let resolve: (() => void) | undefined;
  const completed = new Promise<void>(done => { resolve = done; });

  const queue = () => {
    if (cancelled || cancelTick) return;
    if (count >= parts.length) { if (ended) resolve?.(); return; }
    cancelTick = schedule(() => {
      cancelTick = null;
      if (cancelled) return;
      // About 60 characters/sec; long bursts catch up within roughly four seconds.
      count = immediate() ? parts.length : Math.min(parts.length, count + stepSize);
      visible = parts.slice(0, count).join('');
      onText(visible);
      queue();
    });
  };

  return {
    update(text: string) {
      if (cancelled) return;
      parts = segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text);
      count = Math.min(count, parts.length);
      stepSize = Math.max(2, Math.ceil((parts.length - count) / 125));
      if (immediate()) {
        cancelTick?.(); cancelTick = null;
        count = parts.length; visible = text; onText(visible);
      }
      queue();
    },
    finish() { ended = true; queue(); return completed; },
    cancel() { cancelled = true; cancelTick?.(); cancelTick = null; resolve?.(); },
    get text() { return visible; },
  };
}
