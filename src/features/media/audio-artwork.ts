import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

export const ARTWORK_CACHE_LIMIT = 32;
const artworkCache = new Map<string, string | null>();
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function pruneArtworkCache(limit = ARTWORK_CACHE_LIMIT) {
  while (artworkCache.size > limit) {
    const oldestKey = artworkCache.keys().next().value;
    if (oldestKey === undefined) break;
    artworkCache.delete(oldestKey);
  }
}

function syncSafeToInt(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] & 0x7f) << 21)
    | ((bytes[offset + 1] & 0x7f) << 14)
    | ((bytes[offset + 2] & 0x7f) << 7)
    | (bytes[offset + 3] & 0x7f);
}

function int32ToInt(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] & 0xff) << 24)
    | ((bytes[offset + 1] & 0xff) << 16)
    | ((bytes[offset + 2] & 0xff) << 8)
    | (bytes[offset + 3] & 0xff);
}

function decodeLatin1(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function base64ToBytes(base64: string) {
  const sanitized = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  const outputLength = Math.floor((sanitized.length * 3) / 4) - padding;
  const bytes = new Uint8Array(outputLength);

  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < sanitized.length; i += 1) {
    const ch = sanitized[i];
    if (ch === '=') break;
    const value = BASE64_CHARS.indexOf(ch);
    if (value < 0) continue;

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const chunk = (a << 16) | (b << 8) | c;

    output += BASE64_CHARS[(chunk >> 18) & 63];
    output += BASE64_CHARS[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_CHARS[(chunk >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? BASE64_CHARS[chunk & 63] : '=';
  }
  return output;
}

function getTerminatorLength(encodingByte: number) {
  return encodingByte === 1 || encodingByte === 2 ? 2 : 1;
}

function findTextTerminator(bytes: Uint8Array, start: number, encodingByte: number) {
  const terminatorLength = getTerminatorLength(encodingByte);
  for (let i = start; i <= bytes.length - terminatorLength; i += 1) {
    if (terminatorLength === 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    } else if (bytes[i] === 0) {
      return i;
    }
  }
  return -1;
}

function parseApicFrame(frameData: Uint8Array) {
  if (frameData.length < 4) return null;
  const encodingByte = frameData[0];
  const mimeEnd = frameData.indexOf(0, 1);
  if (mimeEnd === -1) return null;

  const mime = decodeLatin1(frameData.slice(1, mimeEnd)).toLowerCase();
  const descriptionStart = mimeEnd + 2;
  const descriptionEnd = findTextTerminator(frameData, descriptionStart, encodingByte);
  const imageStart = descriptionEnd === -1
    ? descriptionStart
    : descriptionEnd + getTerminatorLength(encodingByte);

  const imageBytes = frameData.slice(imageStart);
  if (!imageBytes.length) return null;

  return `data:${mime || 'image/jpeg'};base64,${bytesToBase64(imageBytes)}`;
}

function parsePicFrame(frameData: Uint8Array) {
  if (frameData.length < 6) return null;
  const encodingByte = frameData[0];
  const format = decodeLatin1(frameData.slice(1, 4)).toUpperCase();
  const mime = format === 'PNG' ? 'image/png' : format === 'GIF' ? 'image/gif' : 'image/jpeg';
  const descriptionStart = 5;
  const descriptionEnd = findTextTerminator(frameData, descriptionStart, encodingByte);
  const imageStart = descriptionEnd === -1
    ? descriptionStart
    : descriptionEnd + getTerminatorLength(encodingByte);

  const imageBytes = frameData.slice(imageStart);
  if (!imageBytes.length) return null;

  return `data:${mime};base64,${bytesToBase64(imageBytes)}`;
}

export function extractMp3ArtworkDataUriFromBytes(bytes: Uint8Array) {
  if (bytes.length < 10 || decodeLatin1(bytes.slice(0, 3)) !== 'ID3') return null;

  const version = bytes[3];
  const tagSize = syncSafeToInt(bytes, 6);
  let offset = 10;
  const tagEnd = Math.min(bytes.length, 10 + tagSize);

  while (offset < tagEnd) {
    if (version === 2) {
      const frameId = decodeLatin1(bytes.slice(offset, offset + 3));
      const size = ((bytes[offset + 3] & 0xff) << 16) | ((bytes[offset + 4] & 0xff) << 8) | (bytes[offset + 5] & 0xff);
      if (!frameId.trim() || size <= 0) break;
      const frameData = bytes.slice(offset + 6, offset + 6 + size);
      if (frameId === 'PIC') return parsePicFrame(frameData);
      offset += 6 + size;
      continue;
    }

    const frameId = decodeLatin1(bytes.slice(offset, offset + 4));
    const size = version === 4 ? syncSafeToInt(bytes, offset + 4) : int32ToInt(bytes, offset + 4);
    if (!frameId.trim() || size <= 0) break;
    const frameData = bytes.slice(offset + 10, offset + 10 + size);
    if (frameId === 'APIC') return parseApicFrame(frameData);
    offset += 10 + size;
  }

  return null;
}

export function shouldAttemptMp3ArtworkExtraction(mimeType?: string, name?: string) {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const normalizedName = name?.toLowerCase() ?? '';
  return normalizedMime === 'audio/mpeg'
    || normalizedMime === 'audio/mp3'
    || normalizedMime === 'audio/mpeg3'
    || normalizedName.endsWith('.mp3');
}

export async function resolveAudioArtworkThumbnail({
  uri,
  mimeType,
  name,
  backendThumbnail,
}: {
  uri?: string | null;
  mimeType?: string | null;
  name?: string | null;
  backendThumbnail?: string | null;
}) {
  if (backendThumbnail) return backendThumbnail;
  if (!uri || !shouldAttemptMp3ArtworkExtraction(mimeType ?? undefined, name ?? undefined)) return null;
  if (artworkCache.has(uri)) return artworkCache.get(uri) ?? null;

  try {
    let localUri = uri;
    if (uri.startsWith('http')) {
      const filename = (name || `audio_art_${Date.now()}.mp3`).replace(/[^A-Za-z0-9._-]/g, '_');
      const downloadDest = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(uri, downloadDest);
      localUri = result.uri;
    }

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
    } as any);
    const artwork = extractMp3ArtworkDataUriFromBytes(base64ToBytes(base64));
    artworkCache.set(uri, artwork);
    pruneArtworkCache();
    return artwork;
  } catch {
    artworkCache.set(uri, null);
    pruneArtworkCache();
    return null;
  }
}

export function useResolvedAudioArtworkThumbnail({
  uri,
  mimeType,
  name,
  backendThumbnail,
  enabled = true,
}: {
  uri?: string | null;
  mimeType?: string | null;
  name?: string | null;
  backendThumbnail?: string | null;
  enabled?: boolean;
}) {
  const [artworkUri, setArtworkUri] = useState<string | null>(backendThumbnail ?? null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setArtworkUri(backendThumbnail ?? null);
      return () => {
        cancelled = true;
      };
    }

    if (backendThumbnail) {
      setArtworkUri(backendThumbnail);
      return () => {
        cancelled = true;
      };
    }

    setArtworkUri(null);

    resolveAudioArtworkThumbnail({ uri, mimeType, name, backendThumbnail: null })
      .then((resolved) => {
        if (!cancelled) setArtworkUri(resolved);
      })
      .catch(() => {
        if (!cancelled) setArtworkUri(null);
      });

    return () => {
      cancelled = true;
    };
  }, [uri, mimeType, name, backendThumbnail, enabled]);

  return artworkUri;
}