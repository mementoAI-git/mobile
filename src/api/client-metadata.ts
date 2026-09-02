export interface MementoClientMetadata {
  platform: 'ios' | 'android' | 'web' | 'unknown';
  version?: string | null;
  build?: string | number | null;
}

const SAFE_VALUE = /^[A-Za-z0-9._+-]{1,64}$/;

function bounded(value: unknown): string {
  const normalized = typeof value === 'number' ? String(value) : value;
  return typeof normalized === 'string' && SAFE_VALUE.test(normalized)
    ? normalized
    : 'unknown';
}

export function createMementoClientHeaders(metadata: MementoClientMetadata) {
  const platform =
    metadata.platform === 'ios' ||
    metadata.platform === 'android' ||
    metadata.platform === 'web'
      ? metadata.platform
      : 'unknown';

  return {
    'X-Memento-Client': platform,
    'X-Memento-Version': bounded(metadata.version),
    'X-Memento-Build': bounded(metadata.build),
  };
}
