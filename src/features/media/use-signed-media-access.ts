import { useCallback, useEffect, useRef, useState } from 'react';
import { post } from '@/api/mutations';
import {
  createSignedMediaRefreshGate,
  refreshSignedMediaAccess,
  shouldRefreshSignedMedia,
  type SignedMediaAttachment,
  type SignedMediaContext,
} from './signed-media-access';

export function useSignedMediaAccess<T extends SignedMediaAttachment>(
  attachment: T,
  context: SignedMediaContext = {},
) {
  const [current, setCurrent] = useState(attachment);
  const currentRef = useRef(attachment);
  const mountedRef = useRef(true);
  const refreshRef = useRef<() => Promise<T>>(async () => currentRef.current);
  const gateRef = useRef(createSignedMediaRefreshGate(() => refreshRef.current()));
  const inputRef = useRef(attachment);

  useEffect(() => {
    const previousInput = inputRef.current;
    inputRef.current = attachment;
    const inputChanged = previousInput._id !== attachment._id
      || previousInput.url !== attachment.url
      || previousInput.thumbnail !== attachment.thumbnail
      || previousInput.access?.expires_at !== attachment.access?.expires_at
      || previousInput.access?.refresh_endpoint !== attachment.access?.refresh_endpoint;
    if (!inputChanged) return;
    currentRef.current = attachment;
    setCurrent(attachment);
    gateRef.current = createSignedMediaRefreshGate(() => refreshRef.current());
  }, [attachment]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  refreshRef.current = async () => {
    const refreshed = await refreshSignedMediaAccess(
      currentRef.current,
      context,
      (url, body) => post<T>(url, body),
    );
    currentRef.current = refreshed;
    if (mountedRef.current) setCurrent(refreshed);
    return refreshed;
  };

  useEffect(() => {
    if (shouldRefreshSignedMedia(current)) {
      void gateRef.current.refresh().catch(() => undefined);
    }
  }, [current]);

  const onLoadError = useCallback(() => {
    void gateRef.current.afterLoadError().catch(() => undefined);
  }, []);

  return { attachment: current, uri: current.url, onLoadError };
}
