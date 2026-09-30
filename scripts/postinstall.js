#!/usr/bin/env node
/**
 * postinstall.js
 *
 * Bun's `file:` protocol copies local packages into node_modules as real
 * directories. Expo doctor flags this as a "duplicate native module" because
 * it sees both:
 *   - modules/react-native-memento-voice  (source)
 *   - node_modules/react-native-memento-voice  (copy)
 *
 * This script replaces the copied directory with a symlink so that
 * expo-doctor only sees one installation, both locally and in CI.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const LOCAL_MODULES = [
  // Add any future local modules here
  'react-native-memento-voice',
];

for (const name of LOCAL_MODULES) {
  const nmPath = path.join(ROOT, 'node_modules', name);
  const srcPath = path.join(ROOT, 'modules', name);

  if (!fs.existsSync(srcPath)) {
    // Source doesn't exist — nothing to do
    continue;
  }

  let needsSymlink = false;

  if (!fs.existsSync(nmPath)) {
    needsSymlink = true;
  } else {
    const stat = fs.lstatSync(nmPath);
    if (!stat.isSymbolicLink()) {
      // Real copy — remove it and replace with symlink
      fs.rmSync(nmPath, { recursive: true, force: true });
      needsSymlink = true;
    } else {
      console.log(`[postinstall] ${name}: already a symlink — OK`);
    }
  }

  if (needsSymlink) {
    const target = path.relative(path.dirname(nmPath), srcPath);
    fs.symlinkSync(target, nmPath, 'dir');
    console.log(`[postinstall] ${name}: replaced copy with symlink → ${target}`);
  }
}
