/**
 * useLinkPreview — fetches favicon + OpenGraph title, description, and image for URLs found in chat message text.
 *
 * - Detects all URLs in the provided text via a robust RFC-compliant URL regex.
 * - Caches previews persistently to AsyncStorage so they survive restarts / refreshes.
 * - Fetches first 24KB of page HTML to extract <title> and OpenGraph metadata.
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LinkPreviewData {
  url: string;
  hostname: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string;
  loaded: boolean;
}

// Module-level cache — persists for app lifetime, initialized from disk
const cache = new Map<string, LinkPreviewData>();
const CACHE_KEY = 'memento_link_previews_v2';
let cacheInitialized = false;

// Standard, highly robust URL detector supporting unicode and parameters
const URL_RE = /https?:\/\/[^\s]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return Array.from(
    new Set(
      matches.map((url) => {
        // Strip trailing punctuation commonly appended by sentences (e.g. '.', ',', '!', '?', ')')
        return url.replace(/[.,!?;:)]+$/, '');
      })
    )
  );
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

async function initCache() {
  if (cacheInitialized) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        cache.set(k, v as LinkPreviewData);
      });
    }
  } catch {}
  cacheInitialized = true;
}

async function persistCache() {
  try {
    const obj: Record<string, LinkPreviewData> = {};
    cache.forEach((v, k) => {
      obj[k] = v;
    });
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

function extractMetaTag(html: string, property: string): string | null {
  const reg = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const match = html.match(reg);
  if (match) return match[1];

  const regName = new RegExp(`<meta[^>]*name=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const matchName = html.match(regName);
  return matchName ? matchName[1] : null;
}

function decodeHtmlEntities(str: string | null): string | null {
  if (!str) return null;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

async function fetchOgData(url: string): Promise<{ title: string | null; description: string | null; imageUrl: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return { title: null, description: null, imageUrl: null };
    
    // Read first 24KB for rich meta tags
    const reader = res.body?.getReader();
    if (!reader) return { title: null, description: null, imageUrl: null };
    let html = '';
    let bytesRead = 0;
    while (bytesRead < 24576) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
    }
    reader.cancel().catch(() => {});

    // 1. Title
    let title = extractMetaTag(html, 'title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
      title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null;
    }

    // 2. Description
    let description = extractMetaTag(html, 'description');
    if (!description) {
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      description = descMatch ? descMatch[1] : null;
    }

    // 3. Image
    const imageUrl = extractMetaTag(html, 'image');

    return {
      title: decodeHtmlEntities(title),
      description: decodeHtmlEntities(description),
      imageUrl,
    };
  } catch {
    return { title: null, description: null, imageUrl: null };
  }
}

/**
 * Hook: given message text, returns an array of link preview data objects.
 * Loads cached values from storage first, then fetches missing ones dynamically.
 */
export function useLinkPreview(text: string): LinkPreviewData[] {
  const urls = extractUrls(text);
  const [previews, setPreviews] = useState<LinkPreviewData[]>([]);
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (urls.length === 0) {
      setPreviews([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      await initCache();
      if (cancelled) return;

      const stubs = urls.map(url => {
        if (cache.has(url)) return cache.get(url)!;
        return {
          url,
          hostname: getHostname(url),
          title: null,
          description: null,
          imageUrl: null,
          faviconUrl: getFaviconUrl(url),
          loaded: false,
        };
      });
      setPreviews(stubs);

      for (const url of urls) {
        if (cancelled) break;
        if (cache.has(url) || loadedRef.current.has(url)) {
          if (cache.has(url)) {
            setPreviews(prev => prev.map(p => p.url === url ? cache.get(url)! : p));
          }
          continue;
        }
        loadedRef.current.add(url);
        try {
          const og = await fetchOgData(url);
          if (cancelled) break;
          const data: LinkPreviewData = {
            url,
            hostname: getHostname(url),
            title: og.title,
            description: og.description,
            imageUrl: og.imageUrl,
            faviconUrl: getFaviconUrl(url),
            loaded: true,
          };
          cache.set(url, data);
          await persistCache();
          if (cancelled) break;
          setPreviews(prev => prev.map(p => p.url === url ? data : p));
        } catch {}
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return previews;
}
