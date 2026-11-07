export const DIGITAL_MIND_SHAPES = ['star', 'square', 'triangle', 'diamond'] as const;
export const DIGITAL_MIND_COLOURS = [
  { id: 'orange', label: 'Orange', token: 'brand' },
  { id: 'blue', label: 'Blue', token: 'info' },
  { id: 'green', label: 'Green', token: 'success' },
  { id: 'yellow', label: 'Yellow', token: 'beneficiaryGroupYellow' },
  { id: 'pink', label: 'Pink', token: 'statPink' },
] as const;
export type DigitalMindShape = typeof DIGITAL_MIND_SHAPES[number];
export type DigitalMindColour = typeof DIGITAL_MIND_COLOURS[number]['id'];
export interface DigitalMindProfile {
  name: string;
  style: DigitalMindShape | 'identicon';
  colour: DigitalMindColour;
}
export const DEFAULT_DIGITAL_MIND: Readonly<DigitalMindProfile> = Object.freeze({
  name: 'My Digital mind', style: 'identicon', colour: 'orange',
});
export const DIGITAL_MIND_NAME_LIMIT = 32;
export function normalizeDigitalMind(value: { name?: unknown; style?: unknown; colour?: unknown } | null | undefined): DigitalMindProfile {
  const name = typeof value?.name === 'string' ? value.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, DIGITAL_MIND_NAME_LIMIT) : '';
  const style = value?.style === 'circle' ? 'star' : value?.style;
  const colour = value?.colour === 'purple' ? 'yellow' : value?.colour;
  return {
    name: name || DEFAULT_DIGITAL_MIND.name,
    style: DIGITAL_MIND_SHAPES.find(shape => shape === style) ?? 'identicon',
    colour: DIGITAL_MIND_COLOURS.find(preset => preset.id === colour)?.id ?? 'orange',
  };
}
/** Badge centre sits on the circular avatar's circumference at 45 degrees. */
export function avatarBadgeOffset(diameter: number, badgeDiameter: number): number {
  return diameter / 2 - diameter / (2 * Math.sqrt(2)) - badgeDiameter / 2;
}
