import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const {
  EXTENSION_REACT_NATIVE_PATH,
  addExtensionReactNativePath,
} = require('../../../plugins/with-extension-react-native-path');

const PODFILE = `target 'Memento' do
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`;

describe('app extension build settings', () => {
  // EAS builders set USE_CCACHE=1, so React Native compiles every target with
  // $(REACT_NATIVE_PATH)/scripts/xcode/ccache-clang.sh. It defines that path
  // project-wide from ${PODS_ROOT}, which app extensions (not CocoaPods
  // targets) don't have, so it resolved to /../../node_modules/... and the
  // ShareExtension archive failed. CallActivity has the same problem.
  test('sets REACT_NATIVE_PATH on targets CocoaPods does not configure, in post_install', () => {
    const podfile = addExtensionReactNativePath(PODFILE);

    const hook = podfile.indexOf('post_install do |installer|');
    const ours = podfile.indexOf('with-extension-react-native-path');
    expect(ours).toBeGreaterThan(hook);
    expect(ours).toBeLessThan(podfile.indexOf('react_native_post_install('));
    expect(podfile).toContain('next if pod_target_uuids.include?(target.uuid)');
    expect(podfile).toContain(`config.build_settings['REACT_NATIVE_PATH'] = '${EXTENSION_REACT_NATIVE_PATH}'`);
    expect(EXTENSION_REACT_NATIVE_PATH).toBe('$(SRCROOT)/../node_modules/react-native');
  });

  test('adds the step once however often prebuild runs', () => {
    const once = addExtensionReactNativePath(PODFILE);
    expect(addExtensionReactNativePath(once)).toBe(once);
  });

  test('fails prebuild loudly if the Podfile has no post_install hook', () => {
    expect(() => addExtensionReactNativePath("target 'Memento' do\nend\n")).toThrow('post_install');
  });

  test('is registered in app.json', () => {
    const plugins: unknown[] = JSON.parse(readFileSync('app.json', 'utf8')).expo.plugins;
    const names = plugins.map((entry) => (Array.isArray(entry) ? entry[0] : entry));
    expect(names).toContain('./plugins/with-extension-react-native-path');
  });
});
