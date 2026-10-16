#!/usr/bin/env node
/**
 * Fails when bun.lock resolves a native module (one with iOS or Android code)
 * at more than one version. A native build can contain only one copy of each,
 * and `expo-doctor` rejects it in CI; this catches it before a commit, from
 * the lockfile alone (no network, well under a second).
 *
 * Fix a failure by pinning the module in package.json "overrides" to the
 * version the app uses, or upgrade Expo packages with `npx expo install --fix`
 * so their versions line up.
 */
const fs = require('fs');
const path = require('path');

/** Every package version in bun.lock, by package name. */
function lockedVersions(lockText) {
  // bun.lock is JSON with trailing commas.
  const lock = JSON.parse(lockText.replace(/,(\s*[}\]])/g, '$1'));
  const versions = new Map();
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const spec = Array.isArray(entry) ? entry[0] : undefined;
    if (typeof spec !== 'string') continue;
    const at = spec.lastIndexOf('@');
    if (at <= 0) continue;
    const name = spec.slice(0, at);
    const version = spec.slice(at + 1);
    if (!versions.has(name)) versions.set(name, new Map());
    versions.get(name).set(version, [...(versions.get(name).get(version) ?? []), key]);
  }
  return versions;
}

/** Whether the installed package ships native code that ends up in the app binary. */
function isNativeModule(root, name) {
  const dir = path.join(root, 'node_modules', name);
  if (!fs.existsSync(dir)) return false;
  if (fs.existsSync(path.join(dir, 'expo-module.config.json'))) return true;
  if (fs.existsSync(path.join(dir, 'android', 'build.gradle'))) return true;
  return fs.readdirSync(dir).some((file) => file.endsWith('.podspec'));
}

function findNativeDuplicates(lockText, isNative) {
  const duplicates = [];
  for (const [name, versions] of lockedVersions(lockText)) {
    if (versions.size > 1 && isNative(name)) {
      duplicates.push({
        name,
        versions: [...versions].map(([version, keys]) => ({ version, keys })),
      });
    }
  }
  return duplicates;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const lockPath = path.join(root, 'bun.lock');
  if (!fs.existsSync(lockPath)) return;
  if (!fs.existsSync(path.join(root, 'node_modules'))) {
    console.log('check:native-duplicates skipped: run bun install first.');
    return;
  }
  const duplicates = findNativeDuplicates(fs.readFileSync(lockPath, 'utf8'), (name) =>
    isNativeModule(root, name),
  );
  if (!duplicates.length) {
    console.log('Native modules: one version each.');
    return;
  }
  console.error('Native modules locked at more than one version (a native build can hold only one):');
  for (const { name, versions } of duplicates) {
    console.error(`  ${name}`);
    for (const { version, keys } of versions) {
      console.error(`    ${version}  (${keys.join(', ')})`);
    }
  }
  console.error(
    '\nFix: pin each one in package.json "overrides" to the app\'s version, then `bun install`;' +
      '\nor upgrade Expo packages with `npx expo install --fix` so their versions line up.',
  );
  process.exitCode = 1;
}

module.exports = { findNativeDuplicates, lockedVersions };

if (require.main === module) main();
