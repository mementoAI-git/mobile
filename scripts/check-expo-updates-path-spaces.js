#!/usr/bin/env node
// Exercise the installed CocoaPods resource command with a spaced project path.
// Run with Node to exercise real shell processes outside the mobile mock harness.
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const podspec = readFileSync(resolve(__dirname, '../node_modules/expo-updates/ios/EXUpdates.podspec'), 'utf8');
const phase = podspec.match(/:script => project_root_env_var \+ force_bundling_flag \+ '([^']+)'/)?.[1];
assert.ok(phase, 'Could not locate the Expo Updates resource generation command');
const root = mkdtempSync(join(tmpdir(), 'memento-updates-'));
try {
  // Keep developer-specific login profiles outside this quoting regression check.
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const bash = join(bin, 'bash');
  writeFileSync(bash, '#!/bin/sh\n[ "$1" = "-l" ] && shift\nexec /bin/bash --noprofile --norc "$@"\n');
  chmodSync(bash, 0o755);
  const packageDir = join(root, 'MEMENTO PROJECTS/mobile/node_modules/expo-updates');
  const scripts = join(packageDir, 'scripts');
  const podRoot = join(packageDir, 'ios');
  mkdirSync(scripts, { recursive: true });
  mkdirSync(podRoot);
  const script = join(scripts, 'create-updates-resources-ios.sh');
  writeFileSync(script, '#!/bin/bash\nprintf "updates-script-launched"\n');
  chmodSync(script, 0o755);
  const result = spawnSync('/bin/sh', ['-c', phase], {
    encoding: 'utf8',
    env: { PATH: `${bin}:/usr/bin:/bin`, PODS_TARGET_SRCROOT: podRoot },
  });
  assert.ifError(result.error);
  assert.deepEqual({ status: result.status, output: result.stdout.trim(), error: result.stderr.trim() }, {
    status: 0,
    output: 'updates-script-launched',
    error: '',
  });
  console.log('Expo Updates launches successfully from a project path containing spaces.');
  const wrapper = join(scripts, 'sentry-xcode.sh');
  writeFileSync(wrapper, '#!/bin/sh\nprintf "%s" "$1"\n');
  const nativeScript = join(scripts, 'react-native-xcode.sh');
  const sentryPhase = require('../plugins/with-ios-script-paths').quoteScriptPaths(
    '/bin/sh `printf \'%s\' "$WRAPPER_SCRIPT"` `printf \'%s\' "$NATIVE_SCRIPT"`',
  );
  const sentry = spawnSync('/bin/sh', ['-c', sentryPhase], {
    encoding: 'utf8',
    env: { WRAPPER_SCRIPT: wrapper, NATIVE_SCRIPT: nativeScript },
  });
  assert.ifError(sentry.error);
  assert.equal(sentry.status, 0, sentry.stderr);
  assert.equal(sentry.stdout, nativeScript);
  console.log('Sentry bundling preserves spaced script paths and arguments.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
