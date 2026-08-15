import { logger } from '@/lib/logger';

type DiagnosticMetadataValue = string | number | boolean | null;
type DiagnosticMetadata = Record<string, DiagnosticMetadataValue>;

export interface RuntimeDiagnosticEvent {
  category: string;
  name: string;
  timestampMs: number;
  durationMs?: number;
  metadata?: DiagnosticMetadata;
}

interface DiagnosticsOptions {
  enabled: boolean;
  maxEvents?: number;
  rateWindowMs?: number;
  now?: () => number;
  sink?: (event: RuntimeDiagnosticEvent) => void;
}

interface RateBucket {
  startedAt: number;
  count: number;
}

export interface RuntimeDiagnostics {
  record: (category: string, name: string, metadata?: DiagnosticMetadata) => void;
  start: (
    category: string,
    name: string,
    metadata?: DiagnosticMetadata,
  ) => (completionMetadata?: DiagnosticMetadata) => void;
  rate: (category: string, name: string) => void;
  snapshot: () => RuntimeDiagnosticEvent[];
}

export function createRuntimeDiagnostics({
  enabled,
  maxEvents = 200,
  rateWindowMs = 1000,
  now = () => Date.now(),
  sink,
}: DiagnosticsOptions): RuntimeDiagnostics {
  const events: RuntimeDiagnosticEvent[] = [];
  const rateBuckets = new Map<string, RateBucket>();

  const append = (event: RuntimeDiagnosticEvent) => {
    if (!enabled) return;
    events.push(event);
    while (events.length > maxEvents) events.shift();
    sink?.(event);
  };

  return {
    record(category, name, metadata) {
      append({ category, name, timestampMs: now(), ...(metadata ? { metadata } : {}) });
    },

    start(category, name, metadata) {
      const startedAt = now();
      return (completionMetadata) => {
        append({
          category,
          name,
          timestampMs: now(),
          durationMs: Math.max(0, now() - startedAt),
          ...(
            metadata || completionMetadata
              ? { metadata: { ...metadata, ...completionMetadata } }
              : {}
          ),
        });
      };
    },

    rate(category, name) {
      if (!enabled) return;
      const timestampMs = now();
      const key = `${category}:${name}`;
      const bucket = rateBuckets.get(key) ?? { startedAt: timestampMs, count: 0 };
      bucket.count += 1;
      const elapsedMs = timestampMs - bucket.startedAt;
      if (elapsedMs < rateWindowMs) {
        rateBuckets.set(key, bucket);
        return;
      }

      append({
        category,
        name,
        timestampMs,
        durationMs: elapsedMs,
        metadata: {
          count: bucket.count,
          perSecond: Number(((bucket.count * 1000) / elapsedMs).toFixed(2)),
        },
      });
      rateBuckets.set(key, { startedAt: timestampMs, count: 0 });
    },

    snapshot() {
      return events.map((event) => ({
        ...event,
        ...(event.metadata ? { metadata: { ...event.metadata } } : {}),
      }));
    },
  };
}

export function sanitizeMediaUri(uri: string) {
  if (!uri) return { scheme: 'missing', host: 'missing', source: 'missing' } as const;
  if (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph:')) {
    return {
      scheme: uri.slice(0, uri.indexOf(':')).toLowerCase(),
      host: 'local',
      source: 'local',
    } as const;
  }

  try {
    const parsed = new URL(uri);
    return {
      scheme: parsed.protocol.replace(':', '').toLowerCase(),
      host: parsed.hostname || 'unknown',
      source: parsed.protocol === 'http:' || parsed.protocol === 'https:' ? 'remote' : 'other',
    } as const;
  } catch {
    return { scheme: 'unknown', host: 'unknown', source: 'other' } as const;
  }
}

const diagnosticsEnabled = (
  (typeof __DEV__ !== 'undefined' && __DEV__)
  || process.env.EXPO_PUBLIC_RUNTIME_DIAGNOSTICS === '1'
);

export const runtimeDiagnostics = createRuntimeDiagnostics({
  enabled: diagnosticsEnabled,
  sink: (event) => {
    logger.runtime(`[runtime] ${JSON.stringify(event)}`);
  },
});
