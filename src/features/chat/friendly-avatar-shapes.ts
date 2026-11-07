import type { DigitalMindShape } from './digital-mind';

type Point = readonly [number, number];
/** Radius in the 128px preview; the header and picker scale the same artwork down. */
export const AVATAR_CORNER_RADIUS = 14;
export const AVATAR_VIEWBOX = 128;
export function avatarShapePoints(shape: DigitalMindShape): Point[] {
  if (shape === 'square') return [[30, 30], [98, 30], [98, 98], [30, 98]];
  if (shape === 'triangle') return [[64, 24], [108, 100], [20, 100]];
  if (shape === 'diamond') return [[64, 16], [112, 64], [64, 112], [16, 64]];
  // Eight-ended starburst, rather than the conventional five-point star.
  return Array.from({ length: 16 }, (_, index) => {
    const angle = index * Math.PI / 8 - Math.PI / 2;
    const radius = index % 2 === 0 ? 49 : 35;
    return [64 + Math.cos(angle) * radius, 64 + Math.sin(angle) * radius] as const;
  });
}

/** Circular corner arcs, capped only where adjacent corners would overlap. */
export function roundedAvatarPath(shape: DigitalMindShape): string {
  const points = avatarShapePoints(shape);
  const corners = points.map((point, index) => {
    const prev = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const incoming = [prev[0] - point[0], prev[1] - point[1]];
    const outgoing = [next[0] - point[0], next[1] - point[1]];
    const inLength = Math.hypot(...incoming);
    const outLength = Math.hypot(...outgoing);
    const cosine = Math.max(-1, Math.min(1, (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (inLength * outLength)));
    const tangent = Math.tan(Math.acos(cosine) / 2);
    const distance = Math.min(AVATAR_CORNER_RADIUS / tangent, inLength * 0.49, outLength * 0.49);
    const start = [point[0] + incoming[0] / inLength * distance, point[1] + incoming[1] / inLength * distance];
    const end = [point[0] + outgoing[0] / outLength * distance, point[1] + outgoing[1] / outLength * distance];
    const radius = distance * tangent;
    const sweep = incoming[0] * outgoing[1] - incoming[1] * outgoing[0] < 0 ? 1 : 0;
    return { start, end, radius, sweep };
  });
  return corners.map((corner, index) => `${index === 0 ? 'M' : 'L'} ${corner.start.join(' ')} A ${corner.radius} ${corner.radius} 0 0 ${corner.sweep} ${corner.end.join(' ')}`).join(' ') + ' Z';
}
