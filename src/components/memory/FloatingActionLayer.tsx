import React, { useEffect, useId, useSyncExternalStore } from 'react';
import { useIsFocused } from 'expo-router';

/**
 * Floating buttons that must sit above the tab bar and its frosted fade.
 *
 * The tab bar is drawn once in the root layout, after every screen, so nothing inside a
 * screen can be raised above it with zIndex. A screen hands its button to this layer
 * instead; `FloatingActionHost` (rendered right after the tab bar) draws it on top.
 * Only the focused screen's button is shown.
 */
type Entry = { owner: string; node: React.ReactNode } | null;

let entry: Entry = null;
const listeners = new Set<() => void>();

function setEntry(next: Entry) {
  entry = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getEntry() {
  return entry;
}

/** Shows `node` above the tab bar while the calling screen is focused. */
export function useFloatingAction(node: React.ReactNode) {
  const owner = useId();
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return;
    setEntry({ owner, node });
    return () => {
      if (entry?.owner === owner) setEntry(null);
    };
  }, [focused, owner, node]);
}

/** Draws the focused screen's floating button. Render it after the tab bar. */
export function FloatingActionHost() {
  const current = useSyncExternalStore(subscribe, getEntry, getEntry);
  // Keyed by owner: each screen gets a fresh instance, so one screen's animated styles
  // (Overview's scroll reveal leaves opacity at 0) never carry over to another's button.
  return current ? <React.Fragment key={current.owner}>{current.node}</React.Fragment> : null;
}
