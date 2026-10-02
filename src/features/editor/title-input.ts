/**
 * Story titles are one paragraph. The title field is multiline only so long
 * titles wrap, so line breaks from pasting or dictation become single spaces.
 */
export function singleLineTitle(value: string): string {
  return value.replace(/[ \t]*(?:\r\n|\r|\n)+[ \t]*/g, ' ');
}
