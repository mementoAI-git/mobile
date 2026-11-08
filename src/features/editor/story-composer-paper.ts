/**
 * Web `.story-composer-paper`: `--paper-width: max(131.3vw, 150dvh)`,
 * height = width / 1.5, `right: calc(var(--paper-width) * -0.0365)`.
 * Sized from the window so the keyboard doesn't rescale it.
 */
export function storyComposerPaperFrame(windowWidth: number, windowHeight: number) {
  const width = Math.max(windowWidth * 1.313, windowHeight * 1.5);
  return {
    width,
    height: width / 1.5,
    right: width * -0.0365,
  };
}
