export const MAX_ATTACHMENT_FILE_MB = 15;
export const MAX_ATTACHMENT_FILE_BYTES = MAX_ATTACHMENT_FILE_MB * 1024 * 1024;

export const DOCUMENT_PICKER_MIME_TYPES: string[] = [
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/rtf',
];

export type MediaUploadSource = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  name?: string | null;
  fileSize?: number | null;
  size?: number | null;
};

export type UploadInput = {
  uri: string;
  mimeType: string;
  name: string;
  fileSize?: number;
};

export type UploadedFileResponse<TFile extends { _id?: string }> =
  | TFile
  | { data?: TFile | TFile[] | null }
  | null
  | undefined;

export function isFileTooLarge(
  fileSize?: number | null,
  maxBytes = MAX_ATTACHMENT_FILE_BYTES,
): boolean {
  return typeof fileSize === 'number' && fileSize > maxBytes;
}

export function getMediaUploadInput(
  asset: MediaUploadSource,
  timestamp = Date.now(),
): UploadInput {
  const mimeType = asset.mimeType ?? inferMediaMimeType(asset);
  const isVideo = mimeType.startsWith('video/');
  const extension = isVideo ? 'mp4' : 'jpg';
  const fallbackName = `${isVideo ? 'video' : 'photo'}_${timestamp}.${extension}`;

  return {
    uri: asset.uri,
    mimeType,
    name: asset.fileName ?? asset.name ?? fallbackName,
    fileSize: asset.fileSize ?? asset.size ?? undefined,
  };
}

export function getDocumentUploadInput(asset: MediaUploadSource): UploadInput {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    name: asset.name ?? asset.fileName ?? `document_${Date.now()}`,
    fileSize: asset.size ?? asset.fileSize ?? undefined,
  };
}

export function getUploadedFileFromResponse<TFile extends { _id?: string }>(
  response: UploadedFileResponse<TFile>,
): TFile | null {
  if (!response) return null;

  if (hasData(response)) {
    const data = response.data;
    const file = Array.isArray(data) ? data[0] : data;
    return hasFileId<TFile>(file) ? file : null;
  }

  return hasFileId<TFile>(response) ? response : null;
}

function inferMediaMimeType(asset: MediaUploadSource): string {
  const lower = `${asset.fileName ?? asset.name ?? asset.uri}`.toLowerCase();
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mp4') || lower.endsWith('.webm')) return 'video/mp4';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function hasData<TFile extends { _id?: string }>(
  response: UploadedFileResponse<TFile>,
): response is { data?: TFile | TFile[] | null } {
  return typeof response === 'object' && response !== null && 'data' in response;
}

function hasFileId<TFile extends { _id?: string }>(value: unknown): value is TFile {
  return typeof value === 'object'
    && value !== null
    && '_id' in value
    && typeof value._id === 'string'
    && value._id.length > 0;
}
