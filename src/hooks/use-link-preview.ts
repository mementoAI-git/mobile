/**
 * useLinkPreview — fetches favicon + title for URLs found in chat message text.
 *
 * - Detects all URLs in the provided text via regex
 * - Fetches favicon using Google S2 API (reliable, no auth, no CORS on RN)
 * - Fetches first 8KB of page HTML to extract <title>
 * - Module-level cache so the same URL never re-fetches across renders/messages
 * - Background-only: text renders immediately, chip enriches asynchronously
 */

import { useState, useEffect, useRef } from 'react';

export interface LinkPreviewData {
  url: string;
  hostname: string;
  title: string | null;
  faviconUrl: string;
  loaded: boolean;
}

// Module-level cache — persists for app lifetime, shared across all bubbles
const cache = new Map<string, LinkPreviewData>();

// Regex to detect http/https URLs in text
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_RE) ?? []));
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return '';
  }
}

async function fetchTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    // Read only first 8KB to keep it fast
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = '';
    let bytesRead = 0;
    while (bytesRead < 8192) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
    }
    reader.cancel().catch(() => {});
    const match = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    return match ? match[1].trim().replace(/\s+/g, ' ') : null;
  } catch {
    return null;
  }
}

async function loadPreview(url: string): Promise<LinkPreviewData> {
  const hostname = getHostname(url);
  const faviconUrl = getFaviconUrl(url);
  const title = await fetchTitle(url);
  return { url, hostname, title, faviconUrl, loaded: true };
}

/**
 * Hook: given message text, returns an array of link preview data objects.
 * Starts with `loaded: false` stubs, then enriches each URL asynchronously.
 */
export function useLinkPreview(text: string): LinkPreviewData[] {
  const urls = extractUrls(text);

  const [previews, setPreviews] = useState<LinkPreviewData[]>(() =>
    urls.map(url => {
      if (cache.has(url)) return cache.get(url)!;
      return { url, hostname: getHostname(url), title: null, faviconUrl: getFaviconUrl(url), loaded: false };
    })
  );

  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (urls.length === 0) return;

    let cancelled = false;

    const fetchAll = async () => {
      for (const url of urls) {
        if (cancelled) break;
        if (cache.has(url) || loadedRef.current.has(url)) {
          // Already fetched — push from cache
          setPreviews(prev => prev.map(p => p.url === url ? cache.get(url)! : p));
          continue;
        }
        loadedRef.current.add(url);
        try {
          const data = await loadPreview(url);
          if (cancelled) break;
          cache.set(url, data);
          setPreviews(prev => prev.map(p => p.url === url ? data : p));
        } catch {
          // Silent fail — leave as unloaded stub
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  // Only re-run when the text changes (urls array changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return previews;
}
