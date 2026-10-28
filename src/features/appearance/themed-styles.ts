import { COLORS } from '@/constants/tokens';
import { DARK_COLORS } from '@/constants/appearance';

const TEXT_KEYS = ['textStrong', 'textBase', 'textWeak', 'textMuted', 'textDisabled'] as const;
const STROKE_KEYS = ['strokeStrong', 'strokeWeak', 'strokeWeaker'] as const;
const SURFACE_KEYS = ['background', 'card', 'fillStrong', 'fillWeak', 'fillWeaker'] as const;
const STATUS_KEYS = ['success', 'error', 'warning', 'info'] as const;

/** Resolve colors by their style role; text and borders share some light values. */
export function resolveThemedStyles<T>(styles: T, colors: typeof COLORS = DARK_COLORS): T {
  const map = (value: unknown, property = ''): unknown => {
    if (typeof value === 'string' && /color$/i.test(property)) {
      const roles = property === 'color' || property === 'tintColor' ? TEXT_KEYS
        : /border/i.test(property) ? STROKE_KEYS
          : property === 'backgroundColor' ? SURFACE_KEYS : [];
      const token = [...roles, ...STATUS_KEYS].find((key) => COLORS[key] === value);
      return token ? colors[token] : value;
    }
    if (Array.isArray(value)) return value.map((entry) => map(entry));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, map(child, key)]));
    return value;
  };
  return map(styles) as T;
}
