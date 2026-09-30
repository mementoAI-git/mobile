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

function collectFiles(dir, pattern, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, pattern, files);
    } else if (pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const packageJson = readJson('package.json');
const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const ciWorkflow = read('.github/workflows/mobile-quality.yml');
const preCommitHook = read('.husky/pre-commit');
const expo = appJson.expo;
const gitignore = read('.gitignore');
const envExample = read('.env.example');

const domainScanFiles = [
  ...collectFiles(path.join(root, 'app'), /\.(ts|tsx)$/),
  ...collectFiles(path.join(root, 'src'), /\.(ts|tsx)$/),
  path.join(root, 'app.json'),
  path.join(root, 'eas.json'),
  path.join(root, '.env.example'),
];

const oldDomainOffenders = domainScanFiles.flatMap((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return /\bmemento\.ai\b|\bmemento\.com\b|https:\/\/mymemento\.io\/(?:terms|privacy)/.test(source)
    ? [path.relative(root, file)]
    : [];
});

assert(
  oldDomainOffenders.length === 0,
  `Old or incorrect Memento domains found. Offenders: ${oldDomainOffenders.join(', ')}`,
);

assert(packageJson.devDependencies?.husky, 'package.json must include Husky as a dev dependency.');
assert(packageJson.scripts.lint, 'package.json must expose a lint script.');
assert(packageJson.scripts.test, 'package.json must expose a unit test script.');
assert(packageJson.scripts.typecheck, 'package.json must expose a typecheck script.');
assert(packageJson.scripts.doctor, 'package.json must expose an Expo Doctor script.');
assert(packageJson.scripts['check:prod'], 'package.json must expose a production check script.');
assert(packageJson.scripts['check:responsive'], 'package.json must expose a responsive check script.');
assert(fs.existsSync(path.join(root, 'src/constants/responsive.ts')), 'Responsive metrics module src/constants/responsive.ts must exist.');
assert(fs.existsSync(path.join(root, 'src/features/layout/responsive-compliance.test.ts')), 'Responsive compliance test must exist.');
assert(packageJson.scripts.verify, 'package.json must expose a commit verification script.');
assert(/bun run test/.test(packageJson.scripts.verify), 'Commit verification must run unit tests.');
assert(/bun run check:responsive/.test(packageJson.scripts.verify), 'Commit verification must run responsive compliance check.');
assert(packageJson.scripts.prepare === 'husky', 'package.json must install Husky hooks via prepare.');
assert(/bun run verify/.test(preCommitHook), 'Husky pre-commit hook must run bun run verify.');
assert(/bun-version:\s*1\.3\.6/.test(ciWorkflow), 'CI must pin the Bun version for reproducible installs.');
assert(/bun install --frozen-lockfile/.test(ciWorkflow), 'CI must install dependencies with a frozen lockfile.');
assert(/bun run typecheck/.test(ciWorkflow), 'CI must run TypeScript checks.');
assert(/bun run test/.test(ciWorkflow), 'CI must run unit tests.');
assert(/bun run check:prod/.test(ciWorkflow), 'CI must run production readiness checks.');
assert(/bun run doctor/.test(ciWorkflow), 'CI must run Expo Doctor.');

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
assert(expo.ios?.bundleIdentifier === 'io.mymemento.app', 'iOS bundleIdentifier must be configured.');
assert(expo.android?.package === 'io.mymemento.app', 'Android package must match the app identifier.');
assert(expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, 'iOS encryption export flag must be explicit.');
assert(expo.web?.favicon === './assets/favicon.png', 'Web favicon must be configured.');

const splashPlugin = findPlugin('expo-splash-screen');
assert(Array.isArray(splashPlugin), 'expo-splash-screen plugin must use explicit options.');
assert(
  splashPlugin[1]?.image === undefined ||
  splashPlugin[1]?.image === './assets/icon.png' ||
  splashPlugin[1]?.image === './assets/splash.png',
  'Splash plugin image must be undefined or point to the committed splash asset.'
);
if (splashPlugin[1]?.image) {
  assert(
    splashPlugin[1]?.resizeMode === 'contain' || splashPlugin[1]?.resizeMode === 'cover',
    'Splash plugin must use contain or cover resize mode.'
  );
}
assert(
  splashPlugin[1]?.backgroundColor?.toLowerCase() === '#ffffff' || splashPlugin[1]?.backgroundColor?.toLowerCase() === '#fde8d3',
  'Splash plugin background must match theme.'
);

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

const androidFilters = expo.android?.intentFilters ?? [];
assert(androidFilters.some((filter) => filter.action === 'VIEW' && filter.autoVerify === true), 'Android app link intent filter must be configured.');
assert(androidFilters.some((filter) => filter.action === 'SEND'), 'Android single-share intent filter must be configured.');
assert(androidFilters.some((filter) => filter.action === 'SEND_MULTIPLE'), 'Android multi-share intent filter must be configured.');
assert(expo.ios?.associatedDomains?.includes('applinks:app.mymemento.io'), 'iOS associated domain must use app.mymemento.io.');
assert(
  androidFilters.some((filter) =>
    filter.action === 'VIEW' &&
    filter.autoVerify === true &&
    (filter.data ?? []).some((item) => item.host === 'app.mymemento.io')
  ),
  'Android app link intent filter must use app.mymemento.io.',
);

assert(/(^|\n)\.env(\n|$)/.test(gitignore), '.gitignore must ignore .env.');
assert(/(^|\n)!\.env\.example(\n|$)/.test(gitignore), '.gitignore must allow .env.example.');
assert(/EXPO_PUBLIC_API_BASE_URL=/.test(envExample), '.env.example must document EXPO_PUBLIC_API_BASE_URL.');
assert(/EXPO_PUBLIC_SENTRY_DSN=/.test(envExample), '.env.example must document EXPO_PUBLIC_SENTRY_DSN.');
assert(/EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0\.2/.test(envExample), '.env.example must document the default Sentry trace sample rate.');
assert(
  easJson.build?.development?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://dev.mymemento.io/api',
  'EAS development builds must use dev.mymemento.io API.',
);
assert(
  easJson.build?.development?.env?.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE === '1',
  'EAS development builds must use full Sentry trace sampling.',
);
assert(
  easJson.build?.preview?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://dev.mymemento.io/api',
  'EAS preview builds must use dev.mymemento.io API.',
);
assert(
  easJson.build?.preview?.env?.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE === '0.2',
  'EAS preview builds must use bounded Sentry trace sampling.',
);
assert(
  easJson.build?.testflight?.distribution === 'store',
  'EAS TestFlight builds must use App Store distribution.',
);
assert(
  easJson.build?.testflight?.channel === 'staging',
  'EAS TestFlight builds must use the staging update channel.',
);
assert(
  easJson.build?.testflight?.environment === 'preview',
  'EAS TestFlight builds must load the preview EAS environment.',
);
assert(
  easJson.build?.testflight?.autoIncrement === true,
  'EAS TestFlight builds must auto-increment their build number.',
);
assert(
  easJson.build?.testflight?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://dev.mymemento.io/api',
  'EAS TestFlight builds must use dev.mymemento.io API.',
);
assert(
  easJson.build?.testflight?.env?.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE === '0.2',
  'EAS TestFlight builds must use bounded Sentry trace sampling.',
);
assert(
  easJson.submit?.testflight,
  'EAS must expose a dedicated TestFlight submission profile.',
);
assert(
  easJson.build?.production?.distribution === 'store',
  'EAS production builds must use App Store distribution.',
);
assert(
  easJson.build?.production?.channel === 'production',
  'EAS production builds must use the production update channel.',
);
assert(
  easJson.build?.production?.environment === 'production',
  'EAS production builds must load the production EAS environment.',
);
assert(
  easJson.build?.production?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://app.mymemento.io/api',
  'EAS production builds must use app.mymemento.io API.',
);
assert(
  easJson.build?.production?.env?.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE === '0.2',
  'EAS production builds must use bounded Sentry trace sampling.',
);

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

const navigationSource = read('src/lib/navigation.ts');
assert(!/url\.protocol === 'http:'/.test(navigationSource), 'Notification app links must not accept plain HTTP URLs.');
assert(/app\.mymemento\.io/.test(navigationSource), 'Trusted app link hosts must include app.mymemento.io.');
assert(/dev\.mymemento\.io/.test(navigationSource), 'Trusted app link hosts must include dev.mymemento.io.');
assert(!/app\.memento\.ai/.test(navigationSource), 'Trusted app link hosts must not use the old app.memento.ai domain.');

const createMemorySheetSource = read('src/components/sheets/CreateMemorySheet.tsx');
assert(!/from 'react-native';[\s\S]*\bModal\b/.test(createMemorySheetSource), 'CreateMemorySheet must not use React Native Modal for sheet-like privacy controls.');
assert(/BottomSheetModal/.test(createMemorySheetSource), 'CreateMemorySheet privacy controls must use BottomSheetModal.');

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
assert(!/https:\/\/mymemento\.io\/terms/.test(registerSource), 'Terms URL must not use the apex domain.');
assert(!/https:\/\/mymemento\.io\/privacy/.test(registerSource), 'Privacy URL must not use the apex domain.');

const envSource = read('src/lib/env.ts');
assert(/WEB_BASE_URL/.test(envSource), 'Legal URLs must be derived from a web base URL.');
assert(/https:\/\/dev\.mymemento\.io/.test(envSource), 'Dev legal URLs must use dev.mymemento.io.');
assert(/https:\/\/app\.mymemento\.io/.test(envSource), 'Production legal URLs must use app.mymemento.io.');
assert(/TERMS_URL = `\$\{WEB_BASE_URL\}\/terms`/.test(envSource), 'Terms URL must be based on WEB_BASE_URL.');
assert(/PRIVACY_URL = `\$\{WEB_BASE_URL\}\/privacy`/.test(envSource), 'Privacy URL must be based on WEB_BASE_URL.');
assert(/SIGNUP_URL = `\$\{WEB_BASE_URL\}\/signup`/.test(envSource), 'Signup URL must be based on WEB_BASE_URL.');
assert(/publishedPostUrl/.test(envSource), 'Published post URLs must be centralized in env utilities.');

const publishedUrlOffenders = runtimeFiles.flatMap((file) => {
  if (file.endsWith(path.join('src', 'lib', 'env.ts'))) return [];
  const source = fs.readFileSync(file, 'utf8');
  return /https:\/\/(?:app\.mymemento\.io|memento\.com)\/post/.test(source) ? [path.relative(root, file)] : [];
});

assert(
  publishedUrlOffenders.length === 0,
  `Published post URLs must use publishedPostUrl(). Offenders: ${publishedUrlOffenders.join(', ')}`,
);

const registerSourceForUrls = read('app/(auth)/register.tsx');
const loginSourceForUrls = read('src/hooks/use-login-logic.ts');
assert(!/API_BASE_URL\.replace\('\/api'/.test(registerSourceForUrls), 'Signup web URL must use SIGNUP_URL, not API_BASE_URL string replacement.');
assert(!/memento:\/\/oauth-callback/.test(registerSourceForUrls), 'Register OAuth redirects must use oauthCallbackUrl().');
assert(!/memento:\/\/oauth-callback/.test(loginSourceForUrls), 'Login OAuth redirects must use oauthCallbackUrl().');
assert(!/openAuthSessionAsync\([^,]+,\s*'memento:\/\/'/.test(registerSourceForUrls), 'Register auth sessions must use AUTH_SESSION_RETURN_URL.');
assert(!/openAuthSessionAsync\([^,]+,\s*'memento:\/\/'/.test(loginSourceForUrls), 'Login auth sessions must use AUTH_SESSION_RETURN_URL.');
assert(/oauthCallbackUrl\('google'\)/.test(registerSourceForUrls) && /oauthCallbackUrl\('apple'\)/.test(registerSourceForUrls), 'Register OAuth redirects must use centralized provider callback URLs.');
assert(/oauthCallbackUrl\('google'\)/.test(loginSourceForUrls) && /oauthCallbackUrl\('apple'\)/.test(loginSourceForUrls), 'Login OAuth redirects must use centralized provider callback URLs.');
assert(/AUTH_SESSION_RETURN_URL/.test(navigationSource), 'Auth session return URL must be centralized.');

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
