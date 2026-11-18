/** What identifies the code running on this device. */
export interface AppVersionInfo {
  /** Marketing version, e.g. "1.0.0". */
  version: string | null;
  /** Native build number (iOS CFBundleVersion, Android versionCode). */
  build: string | null;
  /** Over-the-air update in use, or null for the code that came with the install. */
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  /** EAS Update channel the build listens to. */
  channel: string | null;
}

const runningUpdate = (info: AppVersionInfo) =>
  !info.isEmbeddedLaunch && info.updateId ? info.updateId : null;

const versionAndBuild = (info: AppVersionInfo) => {
  if (!info.version) return 'unknown';
  return info.build ? `${info.version} (${info.build})` : info.version;
};

/** One line for the bottom of Settings: "Version 1.0.0 (48) · Update 0562f81f". */
export function appVersionLabel(info: AppVersionInfo): string {
  const update = runningUpdate(info);
  const label = `Version ${versionAndBuild(info)}`;
  return update ? `${label} · Update ${update.slice(0, 8)}` : label;
}

/** Full details, copied for support messages. */
export function appVersionDetails(info: AppVersionInfo): string {
  return [
    `Memento ${versionAndBuild(info)}`,
    `Update: ${runningUpdate(info) ?? 'built-in'}`,
    `Channel: ${info.channel ?? 'none'}`,
  ].join('\n');
}
