const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const packageJson = readJson('package.json');
const appJson = readJson('app.json');
const expo = appJson.expo;
const gitignore = read('.gitignore');
const envExample = read('.env.example');

assert(packageJson.dependencies['expo-share-intent']?.startsWith('^7.'), 'Expo SDK 56 must use expo-share-intent 7.x.');
assert(packageJson.scripts.typecheck, 'package.json must expose a typecheck script.');
assert(packageJson.scripts.doctor, 'package.json must expose an Expo Doctor script.');
assert(packageJson.scripts['check:prod'], 'package.json must expose a production check script.');

function findPlugin(name) {
  return expo.plugins.find((plugin) => {
    if (plugin === name) return true;
    return Array.isArray(plugin) && plugin[0] === name;
  });
}

function pluginOptions(name) {
  const plugin = findPlugin(name);
  return Array.isArray(plugin) ? plugin[1] : undefined;
}

const supportedPlatforms = expo.platforms ?? ['ios', 'android', 'web'];
assert(supportedPlatforms.includes('ios'), 'Expo config must support iOS.');
assert(supportedPlatforms.includes('android'), 'Expo config must support Android.');
assert(supportedPlatforms.includes('web'), 'Expo config must support web.');

assert(expo.newArchEnabled === undefined, 'app.json must not include schema-invalid newArchEnabled.');
assert(expo.splash === undefined, 'app.json must not include schema-invalid legacy splash config.');
assert(expo.ios?.bundleIdentifier === 'com.mementoai.app', 'iOS bundleIdentifier must be configured.');
assert(expo.android?.package === 'com.mementoai.app', 'Android package must match the app identifier.');
assert(expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, 'iOS encryption export flag must be explicit.');
assert(expo.android?.adaptiveIcon?.backgroundColor === '#fefbf8', 'Android adaptive icon background must match COLORS.background.');
assert(expo.web?.favicon === './assets/favicon.png', 'Web favicon must be configured.');

const splashPlugin = findPlugin('expo-splash-screen');
assert(Array.isArray(splashPlugin), 'expo-splash-screen plugin must use explicit options.');
assert(splashPlugin[1]?.image === './assets/splash-icon.png', 'Splash plugin image must point to the committed splash asset.');
assert(splashPlugin[1]?.resizeMode === 'contain', 'Splash plugin must use contain resize mode.');
assert(splashPlugin[1]?.backgroundColor === '#fefbf8', 'Splash plugin background must match COLORS.background.');
assert(splashPlugin[1]?.imageWidth === 100, 'Splash plugin imageWidth must be locked for native parity.');

assert(findPlugin('expo-router'), 'expo-router plugin must be present.');
assert(findPlugin('expo-font'), 'expo-font plugin must be present.');
assert(findPlugin('expo-secure-store'), 'expo-secure-store plugin must be present.');
assert(findPlugin('expo-web-browser'), 'expo-web-browser plugin must be present.');
assert(findPlugin('expo-dev-client'), 'expo-dev-client plugin must be present while this app uses native dev builds.');
assert(pluginOptions('expo-camera')?.cameraPermission, 'Camera permission copy must be configured.');
assert(pluginOptions('expo-image-picker')?.photosPermission, 'Photo library permission copy must be configured.');
assert(pluginOptions('expo-image-picker')?.microphonePermission, 'Image picker microphone permission copy must be configured.');
assert(pluginOptions('expo-audio')?.microphonePermission, 'Audio microphone permission copy must be configured.');
assert(pluginOptions('expo-speech-recognition')?.speechRecognitionPermission, 'Speech recognition permission copy must be configured.');
assert(pluginOptions('expo-media-library')?.photosPermission, 'Media library permission copy must be configured.');
assert(pluginOptions('expo-share-intent')?.androidIntentFilters?.includes('image/*'), 'Share intent image support must be configured.');
assert(pluginOptions('expo-share-intent')?.androidIntentFilters?.includes('video/*'), 'Share intent video support must be configured.');

const androidFilters = expo.android?.intentFilters ?? [];
assert(androidFilters.some((filter) => filter.action === 'VIEW' && filter.autoVerify === true), 'Android app link intent filter must be configured.');
assert(androidFilters.some((filter) => filter.action === 'SEND'), 'Android single-share intent filter must be configured.');
assert(androidFilters.some((filter) => filter.action === 'SEND_MULTIPLE'), 'Android multi-share intent filter must be configured.');
assert(expo.ios?.associatedDomains?.includes('applinks:app.memento.ai'), 'iOS associated domain must be configured.');

assert(/(^|\n)\.env(\n|$)/.test(gitignore), '.gitignore must ignore .env.');
assert(/(^|\n)!\.env\.example(\n|$)/.test(gitignore), '.gitignore must allow .env.example.');
assert(/EXPO_PUBLIC_API_BASE_URL=/.test(envExample), '.env.example must document EXPO_PUBLIC_API_BASE_URL.');
assert(/EXPO_PUBLIC_SENTRY_DSN=/.test(envExample), '.env.example must document EXPO_PUBLIC_SENTRY_DSN.');

const trackedFiles = execFileSync('git', ['ls-files', '.env'], { cwd: root, encoding: 'utf8' }).trim();
assert(!trackedFiles, '.env must not be tracked by git. Keep real values local and commit .env.example only.');

const ignoredNativeDirs = execFileSync('git', ['check-ignore', 'ios', 'android'], { cwd: root, encoding: 'utf8' }).trim();
assert(ignoredNativeDirs.split('\n').includes('ios'), 'Generated ios directory must be ignored.');
assert(ignoredNativeDirs.split('\n').includes('android'), 'Generated android directory must be ignored.');

const trackedNativeFiles = execFileSync('git', ['ls-files', 'ios', 'android'], { cwd: root, encoding: 'utf8' }).trim();
assert(!trackedNativeFiles, 'Generated ios/android files must not be tracked.');

const runtimeFiles = walk(path.join(root, 'app')).concat(walk(path.join(root, 'src')));
const consoleOffenders = runtimeFiles
  .filter((file) => !file.endsWith(path.join('src', 'lib', 'logger.ts')))
  .flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /console\./.test(source) ? [path.relative(root, file)] : [];
  });

assert(
  consoleOffenders.length === 0,
  `Runtime console calls must go through src/lib/logger.ts. Offenders: ${consoleOffenders.join(', ')}`,
);

const broadStoreSubscribers = runtimeFiles.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return /\buse[A-Z]\w*Store\(\s*\)/.test(source) ? [path.relative(root, file)] : [];
});

assert(
  broadStoreSubscribers.length === 0,
  `Zustand stores must use field-level selectors. Offenders: ${broadStoreSubscribers.join(', ')}`,
);

const uiStoreSource = read('src/store/ui.store.ts');
assert(!/pendingDeepLink:\s*any/.test(uiStoreSource), 'pendingDeepLink must not be typed as any.');
assert(/pendingDeepLink:\s*Href \| null/.test(uiStoreSource), 'pendingDeepLink must use Expo Router Href typing.');

const notificationsSource = read('src/hooks/use-notifications.ts');
assert(/normalizeAppHref/.test(notificationsSource), 'Notification URLs must be normalized before navigation.');
assert(!/const navigate = \(dest: any\)/.test(notificationsSource), 'Notification navigation destinations must not be any.');
assert(!/navigate\(data\.url\)/.test(notificationsSource), 'Notification raw URLs must not be navigated directly.');

const authRedirectFiles = [
  'src/hooks/use-login-logic.ts',
  'src/hooks/use-two-factor-logic.ts',
  'app/(auth)/oauth-callback.tsx',
];
const unsafeAuthRedirects = authRedirectFiles.filter((file) => /router\.replace\(target as any\)/.test(read(file)));
assert(
  unsafeAuthRedirects.length === 0,
  `Auth redirects must use typed post-auth hrefs. Offenders: ${unsafeAuthRedirects.join(', ')}`,
);

const registerSource = read('app/(auth)/register.tsx');
assert(/TERMS_URL/.test(registerSource) && /PRIVACY_URL/.test(registerSource), 'Signup legal links must be wired to URLs.');
assert(/Linking\.openURL\(TERMS_URL\)/.test(registerSource), 'Terms link must open a URL.');
assert(/Linking\.openURL\(PRIVACY_URL\)/.test(registerSource), 'Privacy link must open a URL.');

const privacySource = read('app/settings/privacy.tsx');
assert(!/End-to-end encrypted/.test(privacySource), 'Do not ship unverified end-to-end encryption claims.');
assert(!/cannot read your memories/i.test(privacySource), 'Do not ship unverified backend privacy claims.');

const layoutSource = read('app/_layout.tsx');
assert(/sendDefaultPii:\s*false/.test(layoutSource), 'Sentry must not send default PII in production config.');
assert(/AppErrorBoundary/.test(layoutSource), 'Root layout must wrap the app shell in AppErrorBoundary.');

const errorBoundarySource = read('src/components/system/AppErrorBoundary.tsx');
assert(/componentDidCatch/.test(errorBoundarySource), 'AppErrorBoundary must catch render errors.');
assert(/Sentry\.captureException/.test(errorBoundarySource), 'AppErrorBoundary must report render errors to Sentry when configured.');
assert(/COLORS\.background/.test(errorBoundarySource), 'AppErrorBoundary fallback must use the app background token.');

console.log('Production readiness checks passed.');
