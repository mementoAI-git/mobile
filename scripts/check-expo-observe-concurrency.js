#!/usr/bin/env node
// Compile the installed integration-event code with Swift 6 ownership checking.
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const source = readFileSync(resolve(__dirname, '../node_modules/expo-observe/ios/ObserveModule.swift'), 'utf8');
const begin = source.indexOf('      // Broadcast the integrations config');
const end = source.indexOf('\n    }\n\n    Function("getIntegrations")', begin);
assert.ok(begin >= 0 && end > begin, 'Could not locate the Expo Observe integration event code');
const root = mkdtempSync(join(tmpdir(), 'memento-observe-'));
try {
  const swift = join(root, 'ObserveRegression.swift');
  const binary = join(root, 'ObserveRegression');
  writeFileSync(swift, `import Foundation
protocol PayloadArgument {}
extension Dictionary: PayloadArgument {}
struct Config { var integrations: [String: Any]? }
final class Observer {
  private var lastIntegrations: [String: Any] = [:]
  func configure(_ config: Config) throws {
${source.slice(begin, end)}
  }
  func emit<P: PayloadArgument>(event: String, payload: sending P) {
    precondition(event == "configure")
    let values = (payload as! [String: Any])["integrations"] as! [String: Any]
    precondition(values["expo-router"] as? Bool == true)
    let options = values["react-navigation"] as! [String: Any]
    precondition(options["filteredParams"] as? [String] == ["secret"])
  }
}
let observer = Observer()
try observer.configure(Config(integrations: [
  "expo-router": true,
  "react-navigation": ["filteredParams": ["secret"]]
]))
print("Integration snapshot compiles under Swift 6 and preserves its configuration.")
`);
  const compile = spawnSync('xcrun', ['swiftc', '-swift-version', '6', swift, '-o', binary], { encoding: 'utf8' });
  assert.ifError(compile.error);
  assert.equal(compile.status, 0, compile.stderr);
  const run = spawnSync(binary, { encoding: 'utf8' });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  console.log(run.stdout.trim());
} finally {
  rmSync(root, { recursive: true, force: true });
}
