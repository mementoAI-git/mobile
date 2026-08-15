interface MediaTypeInput {
  mimeType?: string | null;
  name?: string | null;
  uri?: string | null;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
};

function extensionFrom(value?: string | null) {
  if (!value) return '';
  const withoutQuery = value.split(/[?#]/, 1)[0];
  const match = withoutQuery.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? '';
}

export function inferMediaMimeType({ mimeType, name, uri }: MediaTypeInput) {
  const normalizedMime = mimeType?.trim().toLowerCase() ?? '';
  if (normalizedMime && normalizedMime !== 'application/octet-stream') return normalizedMime;

  const extension = extensionFrom(name) || extensionFrom(uri);
  return MIME_BY_EXTENSION[extension] ?? (normalizedMime || 'application/octet-stream');
}

export function getMediaCategory(input: MediaTypeInput): 'image' | 'video' | 'audio' | 'file' {
  const mimeType = inferMediaMimeType(input);
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}
