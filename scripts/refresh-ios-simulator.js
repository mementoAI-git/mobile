const { execFileSync } = require('node:child_process');

async function main() {
  const origin = 'http://127.0.0.1:8081';
  let manifest;
  try {
    const response = await fetch(origin, {
      headers: { 'expo-platform': 'ios', accept: 'application/expo+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Metro returned ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    throw new Error(`Metro is unavailable. Run "bun run ios:run" first. ${error.message}`);
  }
  if (manifest.extra?.expoClient?.slug !== 'memento') {
    throw new Error('Port 8081 belongs to another project. Start Memento with "bun run ios:run".');
  }

  const appId = 'io.mymemento.app';
  // Check installation before stopping anything; never erase simulator app data.
  execFileSync('xcrun', ['simctl', 'get_app_container', 'booted', appId, 'app'], { stdio: 'pipe' });
  try {
    execFileSync('xcrun', ['simctl', 'terminate', 'booted', appId], { stdio: 'pipe' });
  } catch {
    // A stopped app can still be opened below.
  }
  const url = `exp+memento://expo-development-client/?url=${encodeURIComponent(origin)}`;
  execFileSync('xcrun', ['simctl', 'openurl', 'booted', url], { stdio: 'inherit' });
  console.log('Reopened Memento on the booted simulator using localhost. Metro cache and app data preserved.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
