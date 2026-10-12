import React from 'react';

const MAX_LABEL = 60;
const MAX_DEPTH = 8;

/** Visible text in a JSX tree as written, without rendering custom components. */
function textIn(node: React.ReactNode, depth: number): string[] {
  if (depth > MAX_DEPTH || node == null || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap((child) => textIn(child, depth + 1));
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return textIn(props.children, depth + 1);
  }
  return [];
}

/**
 * What the host says to press a tappable thing by voice: an explicit voice
 * label, else its accessibility label, else the text inside it. Undefined
 * when there is nothing to call it (an icon with no accessibility label), or
 * when voice is switched off with `false`.
 */
export function voiceLabelFor(
  voiceLabel: string | false | undefined,
  accessibilityLabel: string | undefined,
  children: unknown,
): string | undefined {
  if (voiceLabel === false) return undefined;
  const label =
    voiceLabel?.trim() ||
    accessibilityLabel?.trim() ||
    (typeof children === 'function'
      ? ''
      : textIn(children as React.ReactNode, 0)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' '));
  return label ? label.slice(0, MAX_LABEL).trim() : undefined;
}
